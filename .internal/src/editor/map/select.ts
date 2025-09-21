import { selectors as mapSelectors } from "@/slices/map";
import { actions, selectors as mapEdSelectors } from "@/slices/mapEditor";
import { store } from "@/store/store";
import { isTileGroupInstance, Mode, TileGroupInstance } from "@/types/editor";
import { Rect } from "@/types/rect";
import { SpatialIndex } from "@/types/spatial";
import { subscribeToSelector } from "@/utils/redux";
import { Vector } from "@/vec";
import * as P from "pixi.js";
import { trackKeyPresses } from "../common/keypress";
import { drawMaskedOutline } from "../common/outline";
import { selectStroke } from "../common/strokes";
import { globals as g } from "./globals";

function isSelectionMode(mode: Mode | null): boolean {
  return mode === "select" || mode === "rect-select";
}

export function setupSelector(spatialIndex: SpatialIndex) {
  const stage = g.app.stage;
  const pressedKeys = trackKeyPresses();

  let dragStart: Vector | null = null;
  let dragEnd: Vector | null = null;

  // When our pointer moves, and we're in a select mode, we're doing a
  // rect-select.
  stage.addEventListener("pointermove", (e) => {
    if (!dragStart) return;

    const state = store.getState();
    const mode = mapEdSelectors.selectMode(state);
    if (!isSelectionMode(mode)) return;

    if (mode !== "rect-select") {
      store.dispatch(actions.setMode("rect-select"));
    }

    const globalPos = { x: e.global.x, y: e.global.y };
    const pos = g.mapContainer.toLocal(globalPos);
    dragEnd = { x: pos.x, y: pos.y };
    drawRectSelect({ ul: dragStart, br: dragEnd });
  });

  // On pointer down, we're starting a rect-select, but it's not yet confirmed
  // until we start dragging.
  stage.addEventListener("pointerdown", (e) => {
    const state = store.getState();
    const mode = mapEdSelectors.selectMode(state);
    if (!isSelectionMode(mode)) return;
    if (e.button !== 0) return;

    const globalPos = { x: e.global.x, y: e.global.y };
    const pos = g.mapContainer.toLocal(globalPos);
    dragStart = { x: pos.x, y: pos.y };
  });

  stage.addEventListener("pointerup", (e) => {
    const state = store.getState();
    const mode = mapEdSelectors.selectMode(state);

    if (!isSelectionMode(mode)) return;
    if (e.button !== 0) return;

    const rectSelect = mode === "rect-select";
    clearRectSelect();
    store.dispatch(actions.setMode("select"));

    const addToSelection = pressedKeys["Control"] ?? false;

    const globalPos = { x: e.global.x, y: e.global.y };
    const pos = g.mapContainer.toLocal(globalPos);
    if (!dragStart) dragStart = { x: pos.x, y: pos.y };
    dragEnd = { x: pos.x, y: pos.y };

    const pagePos = { x: e.pageX, y: e.pageY };

    // This logic ensures that our rect select hitbox can go "negative" correctly
    const left = Math.min(dragStart.x, dragEnd.x);
    const top = Math.min(dragStart.y, dragEnd.y);
    const right = Math.max(dragStart.x, dragEnd.x);
    const bottom = Math.max(dragStart.y, dragEnd.y);
    const minPos = { x: left, y: top };
    const maxPos = { x: right, y: bottom };
    const hitBox = {
      minX: minPos.x,
      minY: minPos.y,
      maxX: maxPos.x,
      maxY: maxPos.y,
    };

    dragStart = null;
    dragEnd = null;

    const hits = spatialIndex
      .search(hitBox)
      .map((it) => it.id)
      .map((hit) => mapSelectors.selectById(state, hit))
      .filter((obj) => isTileGroupInstance(obj))
      .sort((a, b) => b.z - a.z);

    // Nothing selected? Clear either the proposed selection (if any) (first
    // click), or the actual selection (second click).
    if (hits.length === 0) {
      const hasProposed = state.mapEditor.proposedSelection;
      if (hasProposed) {
        store.dispatch(actions.setProposedSelection(null));
      } else {
        store.dispatch(actions.clearSelection());
      }
    }
    // Group select means we shouldn't use proposed selection at all. Just add
    // everything in the rect to the selection.
    else if (rectSelect) {
      const action = addToSelection
        ? actions.addManySelected
        : actions.setManySelected;
      store.dispatch(action(hits));
    }
    // We'll use proposed selection if there's more than one object under the
    // cursor. If there's just one, select it directly.
    else {
      store.dispatch(actions.setProposedSelection(null));
      if (hits.length === 1) {
        const obj = hits[0];

        const action = addToSelection
          ? actions.addOneSelected
          : actions.setOneSelected;
        store.dispatch(action(obj));
      } else {
        store.dispatch(
          actions.setProposedSelection({
            objects: hits,
            pos: pagePos,
          })
        );
      }
    }
  });
}

/**
 * Draws a rectangle selection outline. Called frequently during drag.
 * @param rect Rectangle in map container space
 */
function drawRectSelect(rect: Rect) {
  clearRectSelect();
  const gfx = new P.Graphics();

  // This logic ensures that our rect select hitbox can go "negative" correctly
  const left = Math.min(rect.ul.x, rect.br.x);
  const top = Math.min(rect.ul.y, rect.br.y);
  const width = Math.abs(rect.br.x - rect.ul.x);
  const height = Math.abs(rect.br.y - rect.ul.y);

  gfx.rect(left, top, width, height).stroke(selectStroke);
  g.rectSelectOutline.addChild(gfx);
}

function clearRectSelect() {
  g.rectSelectOutline.removeChildren();
}

/**
 * Outlines the given objects.
 * @param obs Objects to outline
 */
export function outlineObjects(obs: TileGroupInstance[]) {
  clearObjectOutlines();

  for (const obj of obs) {
    const container = new P.Container();
    g.selectionOutlines.addChild(container);
    container.position.set(obj.x, obj.y);

    drawMaskedOutline({
      container,
      frame: obj.frame,
      stroke: selectStroke,
    });
  }
}

/**
 * Clears all object outlines.
 */
export function clearObjectOutlines() {
  g.selectionOutlines.removeChildren();
}

/**
 * When the selected objects change, we need to update the outlines.
 */
subscribeToSelector(
  (state) => state.mapEditor.selectedObjs,
  (selectedObjs) => {
    if (selectedObjs) {
      const objs = selectedObjs.ids.map((id) => selectedObjs.entities[id]);
      outlineObjects(objs);
    } else {
      clearObjectOutlines();
    }
  }
);
