import { actions, selectors as mapEdSelectors } from "@/slices/mapEditor";
import { store } from "@/store/store";
import { Mode } from "@/types/editor";
import { MapLayerName } from "@/types/layer";
import { isTileGroupInstance, TileGroupInstance } from "@/types/reconciler";
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

    const isGroundLayer = state.mapEditor.layers.active === MapLayerName.Ground;

    // If we're over something, it means we want to select it directly, not
    // start a marquee. This will always be true if we're on the ground layer,
    // so we'll do some extra checks related to the ground layer in this block.
    if (e.hoverIds.length > 0) {
      const sel = state.mapEditor.selectedObjs;
      const selIds = new Set(sel.ids);

      // If we're clicking down on an object that's already selected, and we're
      // not deselecting it, abort our select logic so that the Mover can handle
      // what to do.
      const isOverSelected = e.hoverIds.some((id) => selIds.has(id));
      if (isOverSelected && !this.addToSelection) return;

      // The ground layer is special because it is dense with objects, so we
      // should always allow marquee selection, unless we're directly over a
      // selected object.
      if (isGroundLayer && !isOverSelected) {
        this.marqueeEnabled = true;
      } else {
        this.marqueeEnabled = false;
        this.doSelection(e);
      }
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
    // handle the click selection here. We should be able to trigger this branch
    // by simply clicking on an object.
    if (e.hoverIds.length > 0 && !e.moved && !this.addToSelection) {
      this.marqueeEnabled = false;
      this.doSelection(e);
      return;
    }

    if (!this.marqueeEnabled) return;

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
      .getObjects({
        pos: searchBounds,
      })
      .filter((obj) => isTileGroupInstance(obj));

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
        if (!this.addToSelection) {
          store.dispatch(actions.clearSelection());
        }
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

export function setupSelector({
  cd,
  spatialIndex,
}: {
  cd: ClickDragger;
  spatialIndex: SpatialIndex;
}) {
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
