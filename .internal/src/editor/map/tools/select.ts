import {
  actions,
  selectors as mapEdSelectors,
  selectors,
} from "@/slices/mapEditor";
import { RootState, store } from "@/store/store";
import { MapLayerName } from "@/types/layer";
import { MapObj } from "@/types/map";
import { Rect } from "@/types/rect";
import { SpatialIndex } from "@/types/spatial";
import { subState } from "@/utils/redux";
import { rectToBBox } from "@/utils/spatial";
import * as P from "pixi.js";
import {
  ClickDragger,
  ClickDragListener,
  PointerEventData,
} from "../../common/drag";
import { drawOutline } from "../../common/outline";
import { selectStroke, tileSelectFill } from "../../common/strokes";
import { globals as g } from "../globals";
import { pressedKeys } from "../keys";

class Selector implements ClickDragListener {
  private marqueeEnabled = false;
  private recentlyClosedMenu = false;

  constructor(private spatialIndex: SpatialIndex<MapObj>) {}

  private get addToSelection(): boolean {
    return pressedKeys["Control"] ?? false;
  }

  pointerDown(e: PointerEventData) {
    const state = store.getState();
    const mode = mapEdSelectors.selectMode(state);
    if (mode !== "select") return;

    const isGroundLayer = state.mapEditor.layers.active === MapLayerName.Ground;

    // If we're over something, it means we want to select it directly, not
    // start a marquee. This will always be true if we're on the ground layer,
    // so we'll do some extra checks related to the ground layer in this block.
    if (e.hoverIds.length > 0) {
      store.dispatch(actions.setActiveTool("select"));
      const sel = state.mapEditor.selectedIds;
      const selIds = new Set(sel);

      // If we're clicking down on an object that's already selected, and we're
      // not deselecting it, abort our select logic so that the Mover can handle
      // what to do.
      const isOverSelected = e.hoverIds.some((id) => selIds.has(id));
      if (isOverSelected && !this.addToSelection) {
        this.marqueeEnabled = false;
        return;
      }

      // If we're clicking down while a proposed selection menu is open, close
      // the menu and don't do anything else (preserve the current selection).
      if (this.selectionMenuWasOpen(state)) return;

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
    if (mode !== "select") {
      this.marqueeEnabled = false;
      return;
    }

    // If we just closed the proposed selection menu (in pointerDown), don't do
    // any additional selection logic, since we want to preserve what was
    // selected.
    if (this.recentlyClosedMenu) {
      this.recentlyClosedMenu = false;
      return;
    }

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
  }

  /**
   * If we have a proposed selection menu open, close it. This is a convenience
   * method because this is needed in multiple places.
   * @returns
   */
  private selectionMenuWasOpen(state: RootState): boolean {
    const hasProposed = state.mapEditor.proposedSelection;
    if (hasProposed) {
      store.dispatch(actions.setProposedSelection(null));
      this.recentlyClosedMenu = true;
      return true;
    }
    this.recentlyClosedMenu = false;
    return false;
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

    const searchBounds = rectToBBox(e.hitbox);

    const hits = this.spatialIndex.getObjects({
      pos: searchBounds,
    });

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
      store.dispatch(action(hits.map((o) => o.id)));
    }
    // We'll use proposed selection if there's more than one object under the
    // cursor. If there's just one, select it directly.
    else {
      store.dispatch(actions.setProposedSelection(null));
      if (hits.length === 1) {
        const obj = hits[0];

        const curSelected = ms.selectedIds;
        const alreadySelected = curSelected.includes(obj.id);

        if (alreadySelected && this.addToSelection) {
          // If the object is already selected, and we're adding to selection,
          // just deselect it.
          store.dispatch(actions.removeOneSelected(obj.id));
        } else {
          const action = this.addToSelection
            ? actions.addOneSelected
            : actions.setOneSelected;
          store.dispatch(action(obj.id));
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
    if (mode !== "select") return;

    // Just for the side-effect of closing the proposed selection menu if it's
    // open
    this.selectionMenuWasOpen(state);

    if (this.marqueeEnabled) {
      drawRectSelect(e.hitbox, state.mapEditor.zoomPan.zoom);
      if (state.mapEditor.selectedTool !== "select") {
        store.dispatch(actions.setActiveTool("select"));
      }
    }
  }
}

export function setupSelector({
  cd,
  spatialIndex,
}: {
  cd: ClickDragger;
  spatialIndex: SpatialIndex<MapObj>;
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

  // This logic ensures that our rect select hitbox can go "negative" correctly
  const left = Math.min(rect.x, rect.x + rect.width);
  const top = Math.min(rect.y, rect.y + rect.height);
  const width = Math.abs(rect.width);
  const height = Math.abs(rect.height);

  g.rectSelect
    .rect(left, top, width, height)
    .stroke({ ...selectStroke, width: (selectStroke.width ?? 1) / zoom })
    .fill(tileSelectFill);
}

function clearRectSelect() {
  g.rectSelect.clear();
}

/**
 * Outlines the given objects.
 * @param objs Objects to outline
 */
export function outlineObjects(objs: MapObj[], zoom: number) {
  clearObjectOutlines();

  const stroke = { ...selectStroke, width: (selectStroke.width ?? 1) / zoom };

  for (const obj of objs) {
    const container = new P.Container();
    g.selectionOutlines.addChild(container);
    container.position.set(obj.x, obj.y);

    drawOutline({
      container,
      width: obj.width,
      height: obj.height,
      stroke,
      fill: tileSelectFill,
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
  [selectors.selectedObjs, (state) => state.mapEditor.zoomPan.zoom],
  (selectedObjs, zoom) => {
    outlineObjects(selectedObjs, zoom);
  }
);
