import { drawRectSelect } from "@/editors/common/select";
import { Tool } from "@/editors/common/tooldispatch";
import { actions, selectors as mapEdSelectors } from "@/slices/mapEditor";
import { selectors as tsSelectors } from "@/slices/tilesetEditor";
import { RootState, store } from "@/store/store";
import { setActiveLayerThunk } from "@/thunks/map";
import { Mode } from "@/types/editor";
import { MapLayerName } from "@/types/layer";
import {
  BackgroundImageObj,
  isBackgroundImageObj,
  isTileGroupInstance,
  MapObj,
} from "@/types/map";
import { Rect } from "@/types/rect";
import { SpatialIndex } from "@/types/spatial";
import { subState } from "@/utils/redux";
import { rectToBBox } from "@/utils/spatial";
import { Vector2 } from "@/vec";
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

// ─── Resize types & constants ────────────────────────────────────────────────

type EdgeType = "top" | "bottom" | "left" | "right" | null;
type CornerType = "tl" | "tr" | "bl" | "br" | null;

/** How close the cursor must be to a handle, in screen pixels. */
const RESIZE_THRESHOLD_SCREEN_PX = 10;
/** Rendered handle square size in screen pixels. */
const RESIZE_HANDLE_SCREEN_PX = 8;
/** Minimum dimension (px) enforced during resize to prevent degenerate objects. */
const MIN_RESIZE_SIZE = 4;

class Selector extends ClickDragListener<Mode> implements Tool {
  private _marqueeEnabled = false;
  private _hoveringObjects = false;
  private _recentlyClosedMenu = false;

  constructor(private spatialIndex: SpatialIndex<MapObj>) {
    super((state) => mapEdSelectors.selectMode(state));
  }

  protected override get providedModes(): Set<Mode> {
    return new Set(["select", "add-background-image"]);
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
      // Don't override "add-background-image" mode — that mode intentionally
      // shares select behaviour without resetting the active tool.
      if (state.mapEditor.activeTool !== "add-background-image") {
        store.dispatch(actions.setActiveTool("select"));
      }
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
        if (isTileGroupInstance(obj)) {
          const tmpl = tsSelectors.templateFromId(state, obj.tsObjId);
          if (tmpl) {
            store.dispatch(actions.setPlace(tmpl));
          }
        }
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
      const activeTool = state.mapEditor.activeTool;
      if (activeTool !== "select" && activeTool !== "add-background-image") {
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

// ─── Resizer ─────────────────────────────────────────────────────────────────

/**
 * Handles edge/corner resize of BackgroundImageObj instances while in select
 * mode. Registered before Selector and Mover so it can intercept pointer
 * events when the cursor is near a resize handle.
 */
class Resizer extends ClickDragListener<Mode> implements Tool {
  /** When true, corner drags preserve the original aspect ratio and edge handles are hidden. */
  public preserveAspectRatio = true;

  private _dragEnabled = false;
  private _hoveredEdge: EdgeType = null;
  private _hoveredCorner: CornerType = null;
  private _startBounds: Rect | null = null;
  private _targetId: string | null = null;

  constructor() {
    super((state) => mapEdSelectors.selectMode(state));
  }

  protected override get providedModes(): Set<Mode> {
    return new Set(["select", "add-background-image"]);
  }

  /** Returns the selected BackgroundImageObj if exactly one is selected. */
  private _getTarget(): BackgroundImageObj | null {
    const state = store.getState();
    const selected = mapEdSelectors.selectedObjs(state);
    if (selected.length !== 1) return null;
    const obj = selected[0];
    return isBackgroundImageObj(obj) ? obj : null;
  }

  private _threshold(zoom: number): number {
    return RESIZE_THRESHOLD_SCREEN_PX / zoom;
  }

  private _detectEdge(
    pos: Vector2,
    bounds: Rect,
    threshold: number,
  ): { edge: EdgeType; corner: CornerType } {
    const nearLeft = Math.abs(pos.x - bounds.x) < threshold;
    const nearRight = Math.abs(pos.x - (bounds.x + bounds.width)) < threshold;
    const nearTop = Math.abs(pos.y - bounds.y) < threshold;
    const nearBottom = Math.abs(pos.y - (bounds.y + bounds.height)) < threshold;

    const inHorizontalRange =
      pos.x >= bounds.x - threshold &&
      pos.x <= bounds.x + bounds.width + threshold;
    const inVerticalRange =
      pos.y >= bounds.y - threshold &&
      pos.y <= bounds.y + bounds.height + threshold;

    if (nearLeft && nearTop && inHorizontalRange && inVerticalRange)
      return { edge: null, corner: "tl" };
    if (nearRight && nearTop && inHorizontalRange && inVerticalRange)
      return { edge: null, corner: "tr" };
    if (nearLeft && nearBottom && inHorizontalRange && inVerticalRange)
      return { edge: null, corner: "bl" };
    if (nearRight && nearBottom && inHorizontalRange && inVerticalRange)
      return { edge: null, corner: "br" };

    if (nearLeft && inVerticalRange) return { edge: "left", corner: null };
    if (nearRight && inVerticalRange) return { edge: "right", corner: null };
    if (nearTop && inHorizontalRange) return { edge: "top", corner: null };
    if (nearBottom && inHorizontalRange)
      return { edge: "bottom", corner: null };

    return { edge: null, corner: null };
  }

  private _dragEdge(
    bounds: Rect,
    edge: EdgeType,
    offset: Vector2,
    snap: boolean,
    gridSize: Vector2,
  ): Rect {
    const b = { ...bounds };
    switch (edge) {
      case "left":
        b.x = bounds.x + offset.x;
        b.width = bounds.width - offset.x;
        if (snap) {
          const sx = Math.floor(b.x / gridSize.x) * gridSize.x;
          b.width += b.x - sx;
          b.x = sx;
        }
        break;
      case "right":
        b.width = bounds.width + offset.x;
        if (snap) b.width = Math.ceil(b.width / gridSize.x) * gridSize.x;
        break;
      case "top":
        b.y = bounds.y + offset.y;
        b.height = bounds.height - offset.y;
        if (snap) {
          const sy = Math.floor(b.y / gridSize.y) * gridSize.y;
          b.height += b.y - sy;
          b.y = sy;
        }
        break;
      case "bottom":
        b.height = bounds.height + offset.y;
        if (snap) b.height = Math.ceil(b.height / gridSize.y) * gridSize.y;
        break;
    }
    return b;
  }

  private _dragCorner(
    bounds: Rect,
    corner: CornerType,
    offset: Vector2,
    snap: boolean,
    gridSize: Vector2,
  ): Rect {
    const b = { ...bounds };
    switch (corner) {
      case "tl":
        b.x = bounds.x + offset.x;
        b.y = bounds.y + offset.y;
        b.width = bounds.width - offset.x;
        b.height = bounds.height - offset.y;
        break;
      case "tr":
        b.y = bounds.y + offset.y;
        b.width = bounds.width + offset.x;
        b.height = bounds.height - offset.y;
        break;
      case "bl":
        b.x = bounds.x + offset.x;
        b.width = bounds.width - offset.x;
        b.height = bounds.height + offset.y;
        break;
      case "br":
        b.width = bounds.width + offset.x;
        b.height = bounds.height + offset.y;
        break;
    }
    if (snap) {
      if (corner?.includes("l")) {
        const sx = Math.floor(b.x / gridSize.x) * gridSize.x;
        b.width += b.x - sx;
        b.x = sx;
      }
      if (corner?.includes("t")) {
        const sy = Math.floor(b.y / gridSize.y) * gridSize.y;
        b.height += b.y - sy;
        b.y = sy;
      }
      if (corner?.includes("r"))
        b.width = Math.ceil(b.width / gridSize.x) * gridSize.x;
      if (corner?.includes("b"))
        b.height = Math.ceil(b.height / gridSize.y) * gridSize.y;
    }
    return b;
  }

  /**
   * Drags a corner while preserving the original aspect ratio. The drag
   * vector is projected onto the object's diagonal so that both axes respond
   * naturally regardless of which direction the user moves the mouse.
   */
  private _dragCornerAspect(
    bounds: Rect,
    corner: CornerType,
    offset: Vector2,
    snap: boolean,
    gridSize: Vector2,
  ): Rect {
    if (!corner) return bounds;

    const b = { ...bounds };
    const aspectRatio = bounds.width / bounds.height;

    // Outward unit direction for each corner.
    const dirX = corner.includes("r") ? 1 : -1;
    const dirY = corner.includes("b") ? 1 : -1;

    // Project the drag vector onto the aspect-ratio-normalised diagonal so
    // that diagonal drags feel proportional rather than axis-biased.
    const diagonal = Math.sqrt(bounds.width ** 2 + bounds.height ** 2);
    const normX = bounds.width / diagonal;
    const normY = bounds.height / diagonal;
    const projection = offset.x * dirX * normX + offset.y * dirY * normY;

    const scale = (diagonal + projection) / diagonal;
    let newWidth = Math.max(bounds.width * scale, MIN_RESIZE_SIZE);

    if (snap) {
      const snapped = Math.round(newWidth / gridSize.x) * gridSize.x;
      newWidth = Math.max(snapped, gridSize.x);
    }

    b.width = newWidth;
    b.height = newWidth / aspectRatio;

    // Keep the opposite corner fixed by adjusting the origin.
    if (corner.includes("l")) b.x = bounds.x + bounds.width - b.width;
    if (corner.includes("t")) b.y = bounds.y + bounds.height - b.height;

    return b;
  }

  public override pointerMove(e: PointerEventData): boolean {
    if (!this.modeMatches()) return false;
    if (this._dragEnabled) return false;

    const target = this._getTarget();
    if (!target) {
      this._hoveredEdge = null;
      this._hoveredCorner = null;
      return false;
    }

    const zoom = store.getState().mapEditor.zoomPan.zoom;
    const result = this._detectEdge(
      e.localPos,
      { x: target.x, y: target.y, width: target.width, height: target.height },
      this._threshold(zoom),
    );

    if (this.preserveAspectRatio) {
      // Edge handles are disabled; only activate on corners.
      this._hoveredEdge = null;
      this._hoveredCorner = result.corner;
      return !!result.corner;
    }

    this._hoveredEdge = result.edge;
    this._hoveredCorner = result.corner;

    // Only consume the event (return true) when we're actually over a handle,
    // so that normal hover/cursor behaviour from Selector still works otherwise.
    return !!(result.edge || result.corner);
  }

  public override pointerDown(e: PointerEventData): boolean {
    if (!this.modeMatches()) return false;

    const target = this._getTarget();
    if (!target) return false;

    const zoom = store.getState().mapEditor.zoomPan.zoom;
    const bounds: Rect = {
      x: target.x,
      y: target.y,
      width: target.width,
      height: target.height,
    };
    const result = this._detectEdge(e.localPos, bounds, this._threshold(zoom));

    const edge = this.preserveAspectRatio ? null : result.edge;
    const corner = result.corner;

    if (edge || corner) {
      this._dragEnabled = true;
      this._hoveredEdge = edge;
      this._hoveredCorner = corner;
      this._startBounds = bounds;
      this._targetId = target.id;
      return true;
    }
    return false;
  }

  public override pointerUp(_e: PointerEventData): boolean {
    if (!this._dragEnabled) return false;
    this._dragEnabled = false;
    this._startBounds = null;
    this._targetId = null;
    this._hoveredEdge = null;
    this._hoveredCorner = null;
    return true;
  }

  public override pointerDrag(e: PointerEventData): boolean {
    if (!this._dragEnabled || !this._startBounds || !this._targetId)
      return false;

    const state = store.getState();
    const snap = state.mapEditor.grid.snap;
    const gridSize = state.mapEditor.grid.size;
    const offset = e.localMoveVector;

    let b = { ...this._startBounds };
    if (this._hoveredCorner) {
      b = this.preserveAspectRatio
        ? this._dragCornerAspect(b, this._hoveredCorner, offset, snap, gridSize)
        : this._dragCorner(b, this._hoveredCorner, offset, snap, gridSize);
    } else if (this._hoveredEdge) {
      b = this._dragEdge(b, this._hoveredEdge, offset, snap, gridSize);
    }

    // Enforce minimum size, adjusting origin for left/top handles.
    if (b.width < MIN_RESIZE_SIZE) {
      if (this._hoveredEdge === "left" || this._hoveredCorner?.includes("l")) {
        b.x = b.x + b.width - MIN_RESIZE_SIZE;
      }
      b.width = MIN_RESIZE_SIZE;
    }
    if (b.height < MIN_RESIZE_SIZE) {
      if (this._hoveredEdge === "top" || this._hoveredCorner?.includes("t")) {
        b.y = b.y + b.height - MIN_RESIZE_SIZE;
      }
      b.height = MIN_RESIZE_SIZE;
    }

    store.dispatch(
      actions.updateOne({
        id: this._targetId,
        changes: { x: b.x, y: b.y, width: b.width, height: b.height },
      }),
    );
    return true;
  }

  public override getCursor(_e: P.FederatedPointerEvent): string | null {
    if (this._hoveredCorner) {
      switch (this._hoveredCorner) {
        case "tl":
        case "br":
          return "nwse-resize";
        case "tr":
        case "bl":
          return "nesw-resize";
      }
    }
    if (this._hoveredEdge) {
      switch (this._hoveredEdge) {
        case "left":
        case "right":
          return "ew-resize";
        case "top":
        case "bottom":
          return "ns-resize";
      }
    }
    return null;
  }
}

/** Module-level reference so drawResizeHandles can read the current flag. */
let _activeResizer: Resizer | null = null;

export function setupResizer(cd: ClickDragger<Mode>): Resizer {
  const resizer = new Resizer();
  _activeResizer = resizer;
  cd.addListener(resizer);
  return resizer;
}

/**
 * Draws resize handle squares inside the given container. When
 * `preserveAspectRatio` is true only the 4 corner handles are drawn; when
 * false all 8 handles (corners + edge midpoints) are drawn.
 * Squares are rendered at a fixed screen-pixel size so they remain
 * comfortably clickable at any zoom level.
 */
function drawResizeHandles(
  container: P.Container,
  width: number,
  height: number,
  zoom: number,
  preserveAspectRatio: boolean,
): void {
  const size = RESIZE_HANDLE_SCREEN_PX / zoom;
  const half = size / 2;
  const strokeWidth = 1 / zoom;

  const cornerPositions = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: 0, y: height },
    { x: width, y: height },
  ];

  const edgeMidPositions = [
    { x: width / 2, y: 0 },
    { x: width / 2, y: height },
    { x: 0, y: height / 2 },
    { x: width, y: height / 2 },
  ];

  const positions = preserveAspectRatio
    ? cornerPositions
    : [...cornerPositions, ...edgeMidPositions];

  const gfx = new P.Graphics();
  for (const { x, y } of positions) {
    gfx
      .rect(x - half, y - half, size, size)
      .fill({ color: 0xffffff })
      .stroke({ color: 0x22cc66, width: strokeWidth });
  }
  container.addChild(gfx);
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
      // Skip the fill for background images — they're large and a semi-transparent
      // overlay over the entire surface makes them appear noticeably dimmer than
      // other selected objects where the same fill is imperceptible.
      fill: isBackgroundImageObj(obj) ? undefined : tileSelectFill,
    });

    if (isBackgroundImageObj(obj)) {
      const preserveAspect = _activeResizer?.preserveAspectRatio ?? true;
      drawResizeHandles(container, obj.width, obj.height, zoom, preserveAspect);
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
  [mapEdSelectors.selectedObjs, (state) => state.mapEditor.zoomPan.zoom],
  (selectedObjs, zoom) => {
    outlineObjects(selectedObjs, zoom);
  },
);

/**
 * Auto-switch activeTool between "select" and "add-background-image" depending
 * on whether a BackgroundImageObj is part of the current selection.
 *
 * - Selecting a background image while in "select" mode → switches to
 *   "add-background-image" so the BackgroundTool panel appears naturally and
 *   the toolbar button highlights correctly.
 * - Deselecting all backgrounds while in "add-background-image" mode → reverts
 *   to "select" so the normal select tool panel is restored.
 *
 * Only transitions between these two modes; other tool modes (paint, fill, …)
 * are left untouched.
 */
subState(
  [
    mapEdSelectors.selectedObjs,
    (state: RootState) => state.mapEditor.activeTool,
  ],
  (selectedObjs, activeTool) => {
    if (selectedObjs.length > 0) {
      const hasBackground = selectedObjs.some(isBackgroundImageObj);
      if (hasBackground && activeTool === "select") {
        store.dispatch(actions.setActiveTool("add-background-image"));
      } else if (!hasBackground && activeTool === "add-background-image") {
        store.dispatch(actions.setActiveTool("select"));
      }
    }
  },
);
