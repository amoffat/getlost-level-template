import { selectors as mapSelectors } from "@/slices/map";
import { actions, selectors as mapEdSelectors } from "@/slices/mapEditor";
import { store } from "@/store/store";
import { isTileGroupInstance, Mode, TileGroupInstance } from "@/types/editor";
import { Rect } from "@/types/rect";
import { SpatialIndex } from "@/types/spatial";
import { subscribeToSelector } from "@/utils/redux";
import * as P from "pixi.js";
import { drawMaskedOutline } from "../common/outline";
import { selectStroke } from "../common/strokes";
import { ClickDragger, ClickDragListener, PointerEventData } from "./drag";
import { globals as g } from "./globals";
import { pressedKeys } from "./keys";

function isSelectionMode(mode: Mode): boolean {
  return mode === "select" || mode === "rect-select";
}

class Selector implements ClickDragListener {
  private marqueeEnabled = false;

  constructor(private spatialIndex: SpatialIndex) {}

  pointerDown(e: PointerEventData) {
    if (e.over) {
      this.marqueeEnabled = false;
    } else {
      this.marqueeEnabled = true;
    }
  }

  pointerUp(e: PointerEventData) {
    this.marqueeEnabled = false;
    const state = store.getState();
    const mode = mapEdSelectors.selectMode(state);
    if (!isSelectionMode(mode)) return;

    // We don't want any selection logic to run if we initially clicked on an
    // object.
    if (e.clickedTarget && e.moved) return;

    const rectSelect = mode === "rect-select";
    clearRectSelect();
    store.dispatch(actions.setMode("select"));

    const addToSelection = pressedKeys["Control"] ?? false;

    const searchBounds = {
      minX: e.hitbox.ul.x,
      minY: e.hitbox.ul.y,
      maxX: e.hitbox.br.x,
      maxY: e.hitbox.br.y,
    };

    const hits = this.spatialIndex
      .search(searchBounds)
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
      } else if (!addToSelection) {
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

        const curSelected = state.mapEditor.selectedObjs;
        const alreadySelected = curSelected.ids.includes(obj.id);

        if (alreadySelected && addToSelection) {
          // If the object is already selected, and we're adding to selection,
          // just deselect it.
          store.dispatch(actions.removeOneSelected(obj));
        } else {
          const action = addToSelection
            ? actions.addOneSelected
            : actions.setOneSelected;
          store.dispatch(action(obj));
        }
      } else {
        store.dispatch(
          actions.setProposedSelection({
            objects: hits,
            pos: e.pagePos,
          })
        );
      }
    }
  }

  pointerDrag(e: PointerEventData) {
    if (!this.marqueeEnabled) return;

    const state = store.getState();
    const mode = mapEdSelectors.selectMode(state);
    if (!isSelectionMode(mode)) return;

    if (mode !== "rect-select") {
      store.dispatch(actions.setMode("rect-select"));
    }

    if (mode === "rect-select") {
      drawRectSelect(e.hitbox);
    }
  }
}

export function setupSelector(cd: ClickDragger, spatialIndex: SpatialIndex) {
  cd.addListener(new Selector(spatialIndex));
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
