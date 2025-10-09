import { selectors as mapSelectors } from "@/slices/map";
import { actions, selectors as mapEdSelectors } from "@/slices/mapEditor";
import { store } from "@/store/store";
import { isTileGroupInstance, Mode, TileGroupInstance } from "@/types/editor";
import { Rect } from "@/types/rect";
import { SpatialIndex } from "@/types/spatial";
import { subState } from "@/utils/redux";
import * as P from "pixi.js";
import {
  ClickDragger,
  ClickDragListener,
  PointerEventData,
} from "../../common/drag";
import { drawMaskedOutline } from "../../common/outline";
import { selectStroke } from "../../common/strokes";
import { globals as g } from "../globals";
import { pressedKeys } from "../keys";

function isSelectionMode(mode: Mode): boolean {
  return mode === "select" || mode === "rect-select";
}

class Selector implements ClickDragListener {
  private marqueeEnabled = false;

  constructor(private spatialIndex: SpatialIndex) {}

  private get addToSelection(): boolean {
    return pressedKeys["Control"] ?? false;
  }

  pointerDown(e: PointerEventData) {
    const state = store.getState();
    const mode = mapEdSelectors.selectMode(state);
    if (!isSelectionMode(mode)) return;

    // If we're over something, it means we want to select it directly, not
    // start a marquee.
    if (e.over) {
      const sel = state.mapEditor.selectedObjs;

      // If we're clicking down on an object that's already selected, and we're
      // not deselecting it, abort so that the Mover can handle it.
      const isOverSelected = sel.ids.includes(e.over.label);
      if (isOverSelected && !this.addToSelection) return;

      this.marqueeEnabled = false;
      this.doSelection(e);
    } else {
      this.marqueeEnabled = true;
    }
  }

  pointerUp(e: PointerEventData) {
    const state = store.getState();
    const mode = mapEdSelectors.selectMode(state);
    if (!isSelectionMode(mode)) return;

    // In pointerDown, we may have deferred to our mover if we clicked "over" an
    // element. However, if we've now determined that we never moved, we should
    // handle the click selection here.
    if (e.over && !e.moved && !this.addToSelection) {
      this.doSelection(e);
      this.marqueeEnabled = false;
      return;
    }

    if (!this.marqueeEnabled) return;

    // We don't want any selection logic to run if we initially clicked on an
    // object.
    if (e.clickedTarget && e.moved) return;

    this.doSelection(e);
    this.marqueeEnabled = false;
    store.dispatch(actions.setMode("select"));
  }

  /**
   * Handles both a marquee selection or a single-click selection (in the case
   * of the marquee rectangle being a single point).
   *
   * @param e Event data
   */
  private doSelection(e: PointerEventData) {
    clearRectSelect();
    const state = store.getState();
    const ms = state.mapEditor;

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
      .filter(
        (obj) => !ms.layers.lockInactive || obj.layer === ms.layers.active
      )
      .filter((obj) => isTileGroupInstance(obj))
      .sort((a, b) => b.z - a.z);

    // Nothing selected? Clear either the proposed selection (if any) (first
    // click), or the actual selection (second click).
    if (hits.length === 0) {
      const hasProposed = ms.proposedSelection;
      if (hasProposed) {
        store.dispatch(actions.setProposedSelection(null));
      } else if (!this.addToSelection) {
        store.dispatch(actions.clearSelection());
      }
    }
    // Group select means we shouldn't use proposed selection at all. Just add
    // everything in the rect to the selection.
    else if (this.marqueeEnabled) {
      const action = this.addToSelection
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

        const curSelected = ms.selectedObjs;
        const alreadySelected = curSelected.ids.includes(obj.id);

        if (alreadySelected && this.addToSelection) {
          // If the object is already selected, and we're adding to selection,
          // just deselect it.
          store.dispatch(actions.removeOneSelected(obj));
        } else {
          const action = this.addToSelection
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
      drawRectSelect(e.hitbox, state.mapEditor.zoomPan.zoom);
    }
  }
}

export function setupSelector(cd: ClickDragger, spatialIndex: SpatialIndex) {
  cd.addListener(new Selector(spatialIndex));
}

/**
 * Draws a rectangle selection outline. Called frequently during drag.
 * @param rect Rectangle in map container space
 * @param zoom Current zoom level
 */
function drawRectSelect(rect: Rect, zoom: number) {
  clearRectSelect();
  const gfx = new P.Graphics();

  // This logic ensures that our rect select hitbox can go "negative" correctly
  const left = Math.min(rect.ul.x, rect.br.x);
  const top = Math.min(rect.ul.y, rect.br.y);
  const width = Math.abs(rect.br.x - rect.ul.x);
  const height = Math.abs(rect.br.y - rect.ul.y);

  const strokeWidth = (selectStroke.width ?? 1) * 0.5;
  gfx
    .rect(left, top, width, height)
    .stroke({ ...selectStroke, width: strokeWidth / zoom });
  g.rectSelectOutline.addChild(gfx);
}

function clearRectSelect() {
  g.rectSelectOutline.removeChildren();
}

/**
 * Outlines the given objects.
 * @param obs Objects to outline
 */
export function outlineObjects(obs: TileGroupInstance[], zoom: number) {
  clearObjectOutlines();

  const stroke = { ...selectStroke, width: (selectStroke.width ?? 1) / zoom };

  for (const obj of obs) {
    const container = new P.Container();
    g.selectionOutlines.addChild(container);
    container.position.set(obj.x, obj.y);

    drawMaskedOutline({
      container,
      frame: obj.frame,
      stroke,
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
subState(
  [
    (state) => state.mapEditor.selectedObjs,
    (state) => state.mapEditor.zoomPan.zoom,
  ],
  (selectedObjs, zoom) => {
    if (selectedObjs) {
      const objs = selectedObjs.ids.map((id) => selectedObjs.entities[id]);
      outlineObjects(objs, zoom);
    } else {
      clearObjectOutlines();
    }
  }
);
