import { drawRectSelect } from "@/editors/common/select";
import { Tool } from "@/editors/common/tooldispatch";
import { actions, selectors } from "@/slices/tilesetEditor";
import { store } from "@/store/store";
import { snap } from "@/types/rect";
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
import { selectStroke } from "../../common/strokes";
import { globals as g } from "../globals";
import { pressedKeys } from "../keys";

const multiSelectModes: Set<Mode> = new Set(["select"]);

class Selector extends ClickDragListener<Mode> implements Tool {
  private _marqueeEnabled = false;
  private _hoveringObjects = false;

  constructor(private spatialIndex: SpatialIndex<TemplateObject>) {
    super((state) => selectors.selectMode(state));
  }

  protected override get providedModes(): Set<Mode> {
    return new Set(["select", "z-index", "draw-colliders"]);
  }

  private get _addToSelection(): boolean {
    const state = store.getState();
    const mode = selectors.selectMode(state);
    return multiSelectModes.has(mode) && (pressedKeys["Control"] ?? false);
  }

  public override pointerDown(e: PointerEventData): boolean {
    if (!this.modeMatches()) return false;
    const state = store.getState();
    const mode = selectors.selectMode(state);

    // If we're over something, it means we want to select it directly, not
    // start a marquee.
    if (e.hoverIds.length > 0) {
      const sel = state.tilesetEditor.selectedTiles;
      const selIds = new Set(sel.ids);

      // If we're clicking down on an object that's already selected, and we're
      // not deselecting it, abort our select logic so that the Mover can handle
      // what to do.
      const isOverSelected = e.hoverIds.some((id) => selIds.has(id));
      if (isOverSelected && !this._addToSelection) return false;

      if (!isOverSelected && multiSelectModes.has(mode)) {
        this._marqueeEnabled = true;
      } else {
        this._marqueeEnabled = false;
        this.doSelection(e);
      }
    } else if (multiSelectModes.has(mode)) {
      this._marqueeEnabled = true;
    }
    return true;
  }

  public override pointerUp(e: PointerEventData): boolean {
    if (!this.modeMatches()) return false;

    // In pointerDown, we may have deferred to our mover if we clicked "over" an
    // element. However, if we've now determined that we never moved, we should
    // handle the click selection here. We should be able to trigger this branch
    // by simply clicking on an object.
    if (e.hoverIds.length > 0 && !e.moved && !this._addToSelection) {
      this._marqueeEnabled = false;
      this.doSelection(e);
      return true;
    }

    if (!this._marqueeEnabled) return false;

    this.doSelection(e);
    this._marqueeEnabled = false;
    return true;
  }

  public override pointerDrag(e: PointerEventData): boolean {
    if (!this._marqueeEnabled) return false;
    if (!this.modeMatches()) return false;

    const state = store.getState();

    if (this._marqueeEnabled) {
      const hb = snap(e.hitbox, { x: 1, y: 1 });

      drawRectSelect({
        gfx: g.rectSelect,
        rect: hb,
        zoom: state.tilesetEditor.activeZoomPan.zoom,
      });
      if (state.tilesetEditor.selectedTool !== "select") {
        store.dispatch(actions.setActiveTool("select"));
      }
    }
    return true;
  }

  public override pointerMove(e: PointerEventData): boolean {
    if (!this.modeMatches()) return false;
    this._hoveringObjects = e.hoverIds.length > 0;
    return true;
  }

  public override getCursor(_e: P.FederatedPointerEvent): string | null {
    if (this._marqueeEnabled) {
      return "crosshair";
    }
    if (this._hoveringObjects) {
      return "pointer";
    }
    return null;
  }

  /**
   * Handles both a marquee selection or a single-click selection (in the case
   * of the marquee rectangle being a single point).
   *
   * @param e Event data
   */
  private doSelection(e: PointerEventData) {
    g.rectSelect.clear();
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
    else if (this._marqueeEnabled) {
      const action = this._addToSelection
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

        if (alreadySelected && this._addToSelection) {
          // If the object is already selected, and we're adding to selection,
          // just deselect it.
          store.dispatch(actions.removeOneSelected(obj.id));
        } else {
          const action = this._addToSelection
            ? actions.addOneSelected
            : actions.setOneSelected;
          store.dispatch(action(obj));

          if (mode === "draw-colliders" && isTileGroupTemplate(obj)) {
            store.dispatch(
              actions.setToolOptions({
                tool: "collider",
                options: { simplify: obj.collisions.simplify },
              }),
            );
          }
        }
      } else {
        const action = this._addToSelection
          ? actions.addManySelected
          : actions.setManySelected;
        store.dispatch(action(hits));
      }
    }
  }
}

export function setupSelector({
  cd,
  spatialIndex,
}: {
  cd: ClickDragger<Mode>;
  spatialIndex: SpatialIndex<TemplateObject>;
}) {
  cd.addListener(new Selector(spatialIndex));
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
  },
);
