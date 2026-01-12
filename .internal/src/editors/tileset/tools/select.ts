import { actions, selectors } from "@/slices/tilesetEditor";
import { store } from "@/store/store";
import { Rect, snap } from "@/types/rect";
import { SpatialIndex } from "@/types/spatial";
import { isTileGroupTemplate } from "@/types/tilegroup";
import { Mode } from "@/types/tileset";
import { TemplateObject } from "@/types/tilesetobject";
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

const selectionModes: Set<Mode> = new Set([
  "select",
  "z-index",
  "draw-colliders",
] as Mode[]);

const multiSelectModes: Set<Mode> = new Set(["select"] as Mode[]);

class Selector extends ClickDragListener {
  private marqueeEnabled = false;

  constructor(private spatialIndex: SpatialIndex<TemplateObject>) {
    super();
  }

  private get addToSelection(): boolean {
    const state = store.getState();
    const mode = selectors.selectMode(state);
    return multiSelectModes.has(mode) && (pressedKeys["Control"] ?? false);
  }

  override pointerDown(e: PointerEventData) {
    const state = store.getState();
    const mode = selectors.selectMode(state);
    if (!selectionModes.has(mode)) return;

    // If we're over something, it means we want to select it directly, not
    // start a marquee.
    if (e.hoverIds.length > 0) {
      const sel = state.tilesetEditor.selectedTiles;
      const selIds = new Set(sel.ids);

      // If we're clicking down on an object that's already selected, and we're
      // not deselecting it, abort our select logic so that the Mover can handle
      // what to do.
      const isOverSelected = e.hoverIds.some((id) => selIds.has(id));
      if (isOverSelected && !this.addToSelection) return;

      if (!isOverSelected && multiSelectModes.has(mode)) {
        this.marqueeEnabled = true;
      } else {
        this.marqueeEnabled = false;
        this.doSelection(e);
      }
    } else if (multiSelectModes.has(mode)) {
      this.marqueeEnabled = true;
    }
  }

  override pointerUp(e: PointerEventData) {
    const state = store.getState();
    const mode = selectors.selectMode(state);
    if (!selectionModes.has(mode)) return;

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
   * Handles both a marquee selection or a single-click selection (in the case
   * of the marquee rectangle being a single point).
   *
   * @param e Event data
   */
  private doSelection(e: PointerEventData) {
    clearRectSelect();
    const state = store.getState();
    const mode = selectors.selectMode(state);

    const searchBounds = rectToBBox(e.hitbox);

    const hits = this.spatialIndex.getObjects({
      pos: searchBounds,
    });

    // Nothing selected? Clear either the proposed selection (if any) (first
    // click), or the actual selection (second click).
    if (hits.length === 0) {
      store.dispatch(actions.clearSelection());
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
      if (hits.length === 1) {
        const obj = hits[0];

        const curSelected = state.tilesetEditor.selectedTiles;
        const alreadySelected = curSelected.ids.includes(obj.id);

        if (alreadySelected && this.addToSelection) {
          // If the object is already selected, and we're adding to selection,
          // just deselect it.
          store.dispatch(actions.removeOneSelected(obj.id));
        } else {
          const action = this.addToSelection
            ? actions.addOneSelected
            : actions.setOneSelected;
          store.dispatch(action(obj));

          if (mode === "draw-colliders" && isTileGroupTemplate(obj)) {
            store.dispatch(
              actions.setToolOptions({
                tool: "collider",
                options: { simplify: obj.collisions.simplify },
              })
            );
          }
        }
      } else {
        const action = this.addToSelection
          ? actions.addManySelected
          : actions.setManySelected;
        store.dispatch(action(hits));
      }
    }
  }

  override pointerDrag(e: PointerEventData) {
    if (!this.marqueeEnabled) return;

    const state = store.getState();
    const mode = selectors.selectMode(state);
    if (!selectionModes.has(mode)) return;

    if (this.marqueeEnabled) {
      const hb = snap(e.hitbox, { x: 1, y: 1 });
      drawRectSelect(hb, state.tilesetEditor.activeZoomPan.zoom);
      if (state.tilesetEditor.selectedTool !== "select") {
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
  spatialIndex: SpatialIndex<TemplateObject>;
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
    .fill(tileSelectFill)
    .stroke({ ...selectStroke, width: (selectStroke.width ?? 1) / zoom });
}

function clearRectSelect() {
  g.rectSelect.clear();
}

/**
 * Outlines the given objects.
 * @param objs Objects to outline
 */
export function outlineObjects(objs: TemplateObject[], zoom: number) {
  clearObjectOutlines();

  const stroke = { ...selectStroke, width: (selectStroke.width ?? 1) / zoom };

  for (const obj of objs) {
    if (!isTileGroupTemplate(obj)) continue;

    const container = new P.Container();
    g.selectionOutlines.addChild(container);
    container.position.set(obj.pos.x, obj.pos.y);

    if (isTileGroupTemplate(obj)) {
      drawOutline({
        container,
        width: obj.pos.width,
        height: obj.pos.height,
        stroke,
        // It's actually distracting if tiles have a fill when selected
        // fill: tileSelectFill,
      });
    }
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
    selectors.selectedObjects,
    (state) => state.tilesetEditor.activeZoomPan.zoom,
  ],
  (objs, zoom) => {
    if (!g.selectionOutlines) return;
    outlineObjects(objs, zoom);
  }
);
