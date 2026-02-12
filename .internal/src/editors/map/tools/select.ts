import { drawRectSelect } from "@/editors/common/select";
import { Tool } from "@/editors/common/tooldispatch";
import { actions, selectors as mapEdSelectors } from "@/slices/mapEditor";
import { selectors as tsSelectors } from "@/slices/tilesetEditor";
import { RootState, store } from "@/store/store";
import { setActiveLayerThunk } from "@/thunks/map";
import { Mode } from "@/types/editor";
import { MapLayerName } from "@/types/layer";
import { isTileGroupInstance, MapObj } from "@/types/map";
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

class Selector extends ClickDragListener<Mode> implements Tool {
  private _marqueeEnabled = false;
  private _hoveringObjects = false;
  private _recentlyClosedMenu = false;

  constructor(private spatialIndex: SpatialIndex<MapObj>) {
    super((state) => mapEdSelectors.selectMode(state));
  }

  protected override get providedModes(): Set<Mode> {
    return new Set(["select"]);
  }

  private get _addToSelection(): boolean {
    return pressedKeys["Control"] ?? false;
  }

  public override pointerDown(e: PointerEventData): boolean {
    if (!this.modeMatches()) return false;

    const state = store.getState();
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
      if (isOverSelected && !this._addToSelection) {
        this._marqueeEnabled = false;
        return false;
      }

      // If we're clicking down while a proposed selection menu is open, close
      // the menu and don't do anything else (preserve the current selection).
      if (this._selectionMenuWasOpen(state)) return false;

      // The ground layer is special because it is dense with objects, so we
      // should always allow marquee selection, unless we're directly over a
      // selected object.
      if (isGroundLayer && !isOverSelected) {
        this._marqueeEnabled = true;
        return true;
      } else {
        this._marqueeEnabled = false;
        this._doSelection(e);
        // Let the mover handle the rest, but we still select the object here.
        return false;
      }
    } else {
      this._marqueeEnabled = true;
    }

    return true;
  }

  public override pointerUp(e: PointerEventData): boolean {
    if (!this.modeMatches()) {
      this._marqueeEnabled = false;
      return false;
    }

    // If we just closed the proposed selection menu (in pointerDown), don't do
    // any additional selection logic, since we want to preserve what was
    // selected.
    if (this._recentlyClosedMenu) {
      this._recentlyClosedMenu = false;
      return false;
    }

    // In pointerDown, we may have deferred to our mover if we clicked "over" an
    // element. However, if we've now determined that we never moved, we should
    // handle the click selection here. We should be able to trigger this branch
    // by simply clicking on an object.
    if (e.hoverIds.length > 0 && !e.moved && !this._addToSelection) {
      this._marqueeEnabled = false;
      this._doSelection(e);
      return true;
    }

    if (!this._marqueeEnabled) return false;

    this._doSelection(e);
    this._marqueeEnabled = false;
    return true;
  }

  /**
   * If we have a proposed selection menu open, close it. This is a convenience
   * method because this is needed in multiple places.
   * @returns
   */
  private _selectionMenuWasOpen(state: RootState): boolean {
    const hasProposed = state.mapEditor.proposedSelection;
    if (hasProposed) {
      store.dispatch(actions.setProposedSelection(null));
      this._recentlyClosedMenu = true;
      return true;
    }
    this._recentlyClosedMenu = false;
    return false;
  }

  /**
   * Handles both a marquee selection or a single-click selection (in the case
   * of the marquee rectangle being a single point).
   *
   * @param e Event data
   */
  private _doSelection(e: PointerEventData) {
    g.rectSelect.clear();

    const state = store.getState();
    const ms = state.mapEditor;

    const searchBounds = rectToBBox(e.hitbox);

    const allHits = this.spatialIndex.getObjects({
      pos: searchBounds,
      filterByLayer: false,
    });
    const layerHits = allHits.filter((obj) => {
      const layer = obj.layer ?? 0;
      const layerMatches = layer === ms.layers.active;
      return !ms.layers.lockInactive || layerMatches;
    });

    // Nothing selected? Clear either the proposed selection (if any) (first
    // click), or the actual selection (second click).
    if (layerHits.length === 0) {
      // It's more ergonomic to allow selecting an object, even if we're not on
      // that layer, if it's the only object under the cursor.
      if (allHits.length === 1) {
        const obj = allHits[0];
        store
          .dispatch(setActiveLayerThunk({ layer: obj.layer, notify: true }))
          .unwrap();
        store.dispatch(actions.setOneSelected(obj.id));
      }
      // We just want to clear the "proposed selection" menu or the current
      // selection.
      else {
        const hasProposed = ms.proposedSelection;
        if (hasProposed) {
          store.dispatch(actions.setProposedSelection(null));
        } else if (!this._addToSelection) {
          store.dispatch(actions.clearSelection());
        }
      }
    }
    // Group select means we shouldn't use proposed selection at all. Just add
    // everything in the rect to the selection.
    else if (this._marqueeEnabled) {
      const action = this._addToSelection
        ? actions.addManySelected
        : actions.setManySelected;
      store.dispatch(action(layerHits.map((o) => o.id)));
    }
    // We'll use proposed selection if there's more than one object under the
    // cursor. If there's just one, select it directly.
    else {
      store.dispatch(actions.setProposedSelection(null));
      if (layerHits.length === 1) {
        const obj = layerHits[0];

        const curSelected = ms.selectedIds;
        const alreadySelected = curSelected.includes(obj.id);

        if (alreadySelected && this._addToSelection) {
          // If the object is already selected, and we're adding to selection,
          // just deselect it.
          store.dispatch(actions.removeOneSelected(obj.id));
        } else {
          const action = this._addToSelection
            ? actions.addOneSelected
            : actions.setOneSelected;
          store.dispatch(action(obj.id));
          if (isTileGroupInstance(obj)) {
            const tmpl = tsSelectors.templateFromId(state, obj.tsObjId);
            if (tmpl) {
              store.dispatch(actions.setPlace(tmpl));
            }
          }
        }
      }
      // There's multiple objects under the cursor, so we'll show the proposed
      // selection menu.
      else {
        if (!this._addToSelection) {
          store.dispatch(actions.clearSelection());
        }
        store.dispatch(
          actions.setProposedSelection({
            objects: layerHits,
            pos: e.pagePos,
          }),
        );
      }
    }
  }

  public override pointerDrag(e: PointerEventData): boolean {
    if (!this._marqueeEnabled) return false;

    if (!this.modeMatches()) return false;
    const state = store.getState();

    // Just for the side-effect of closing the proposed selection menu if it's
    // open
    this._selectionMenuWasOpen(state);

    if (this._marqueeEnabled) {
      drawRectSelect({
        gfx: g.rectSelect,
        rect: e.hitbox,
        zoom: state.mapEditor.zoomPan.zoom,
      });
      if (state.mapEditor.activeTool !== "select") {
        store.dispatch(actions.setActiveTool("select"));
      }
      return true;
    }
    return false;
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
}

export function setupSelector({
  cd,
  spatialIndex,
}: {
  cd: ClickDragger<Mode>;
  spatialIndex: SpatialIndex<MapObj>;
}) {
  cd.addListener(new Selector(spatialIndex));
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
  [mapEdSelectors.selectedObjs, (state) => state.mapEditor.zoomPan.zoom],
  (selectedObjs, zoom) => {
    outlineObjects(selectedObjs, zoom);
  },
);
