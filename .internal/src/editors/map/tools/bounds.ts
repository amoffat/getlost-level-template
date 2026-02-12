import { maxBoundsArea, minBoundsSize } from "@/constants";
import { Tool } from "@/editors/common/tooldispatch";
import {
  actions as mapEdActions,
  selectors as mapEdSelectors,
} from "@/slices/mapEditor";
import { store } from "@/store/store";
import { Mode } from "@/types/editor";
import { Rect } from "@/types/rect";
import { showNotification } from "@/utils/notifications";
import { Vector2 } from "@/vec";
import {
  ClickDragger,
  ClickDragListener,
  PointerEventData,
} from "../../common/drag";

type EdgeType = "top" | "bottom" | "left" | "right" | null;
type CornerType = "tl" | "tr" | "bl" | "br" | null;

const EDGE_THRESHOLD = 100; // pixels from edge to consider hovering

export class BoundsDragger extends ClickDragListener<Mode> implements Tool {
  private _dragEnabled = false;
  private _hoveredEdge: EdgeType = null;
  private _hoveredCorner: CornerType = null;
  private _startBounds: Rect | null = null;

  constructor() {
    super((state) => mapEdSelectors.selectMode(state));
  }

  public override pointerMove(e: PointerEventData): boolean {
    const state = store.getState();
    const mode = mapEdSelectors.selectMode(state);

    // Only handle bounds editing in set-bounds mode when not dragging
    if (mode !== "set-bounds" || this._dragEnabled) return false;

    const bounds = state.mapEditor.bounds;
    const pos = e.localPos;

    // Detect which edge/corner is being hovered
    const result = this.detectEdge(pos, bounds);
    this._hoveredEdge = result.edge;
    this._hoveredCorner = result.corner;

    return true;
  }

  protected override get providedModes(): Set<Mode> {
    return new Set(["set-bounds"]);
  }

  public override pointerDown(e: PointerEventData): boolean {
    if (!this.modeMatches()) return false;

    const state = store.getState();
    const bounds = state.mapEditor.bounds;
    const pos = e.localPos;

    const result = this.detectEdge(pos, bounds);
    if (result.edge || result.corner) {
      this._dragEnabled = true;
      this._hoveredEdge = result.edge;
      this._hoveredCorner = result.corner;
      this._startBounds = { ...bounds };
      return true;
    }
    return false;
  }

  public override pointerUp(_e: PointerEventData): boolean {
    if (!this._dragEnabled) return false;

    this._dragEnabled = false;
    this._startBounds = null;
    this._hoveredEdge = null;
    this._hoveredCorner = null;
    return true;
  }

  public override pointerDrag(e: PointerEventData): boolean {
    if (!this._dragEnabled || !this._startBounds) return false;

    const state = store.getState();
    const snap = state.mapEditor.grid.snap;
    const gridSize = state.mapEditor.grid.size;

    const offset = e.localMoveVector;
    let newBounds = { ...this._startBounds };

    // Apply offset based on which edge/corner is being dragged
    if (this._hoveredCorner) {
      newBounds = this.dragCorner(
        newBounds,
        this._hoveredCorner,
        offset,
        snap,
        gridSize,
      );
    } else if (this._hoveredEdge) {
      newBounds = this.dragEdge(
        newBounds,
        this._hoveredEdge,
        offset,
        snap,
        gridSize,
      );
    }

    // Ensure minimum size
    if (newBounds.width < minBoundsSize) {
      if (this._hoveredEdge === "left" || this._hoveredCorner?.includes("l")) {
        newBounds.x = newBounds.x + newBounds.width - minBoundsSize;
      }
      newBounds.width = minBoundsSize;
    }
    if (newBounds.height < minBoundsSize) {
      if (this._hoveredEdge === "top" || this._hoveredCorner?.includes("t")) {
        newBounds.y = newBounds.y + newBounds.height - minBoundsSize;
      }
      newBounds.height = minBoundsSize;
    }

    // Ensure maximum area is not exceeded
    const area = newBounds.width * newBounds.height;
    if (area > maxBoundsArea) {
      // Revert to start bounds if it would exceed max area
      showNotification({
        key: "bounds-too-large",
        title: "Bounds too large",
        message: `The maximum allowed area is ${maxBoundsArea} pixels.`,
        color: "red",
      });
      return true;
    }

    store.dispatch(mapEdActions.setBounds(newBounds));
    return true;
  }

  private dragEdge(
    bounds: Rect,
    edge: EdgeType,
    offset: Vector2,
    snap: boolean,
    gridSize: Vector2,
  ): Rect {
    const newBounds = { ...bounds };

    switch (edge) {
      case "left":
        newBounds.x = bounds.x + offset.x;
        newBounds.width = bounds.width - offset.x;
        if (snap) {
          const snappedX = Math.floor(newBounds.x / gridSize.x) * gridSize.x;
          newBounds.width += newBounds.x - snappedX;
          newBounds.x = snappedX;
        }
        break;
      case "right":
        newBounds.width = bounds.width + offset.x;
        if (snap) {
          newBounds.width =
            Math.ceil(newBounds.width / gridSize.x) * gridSize.x;
        }
        break;
      case "top":
        newBounds.y = bounds.y + offset.y;
        newBounds.height = bounds.height - offset.y;
        if (snap) {
          const snappedY = Math.floor(newBounds.y / gridSize.y) * gridSize.y;
          newBounds.height += newBounds.y - snappedY;
          newBounds.y = snappedY;
        }
        break;
      case "bottom":
        newBounds.height = bounds.height + offset.y;
        if (snap) {
          newBounds.height =
            Math.ceil(newBounds.height / gridSize.y) * gridSize.y;
        }
        break;
    }

    return newBounds;
  }

  private dragCorner(
    bounds: Rect,
    corner: CornerType,
    offset: Vector2,
    snap: boolean,
    gridSize: Vector2,
  ): Rect {
    const newBounds = { ...bounds };

    switch (corner) {
      case "tl":
        newBounds.x = bounds.x + offset.x;
        newBounds.y = bounds.y + offset.y;
        newBounds.width = bounds.width - offset.x;
        newBounds.height = bounds.height - offset.y;
        break;
      case "tr":
        newBounds.y = bounds.y + offset.y;
        newBounds.width = bounds.width + offset.x;
        newBounds.height = bounds.height - offset.y;
        break;
      case "bl":
        newBounds.x = bounds.x + offset.x;
        newBounds.width = bounds.width - offset.x;
        newBounds.height = bounds.height + offset.y;
        break;
      case "br":
        newBounds.width = bounds.width + offset.x;
        newBounds.height = bounds.height + offset.y;
        break;
    }

    if (snap) {
      // Snap position for corners that affect x/y
      if (corner?.includes("l")) {
        const snappedX = Math.floor(newBounds.x / gridSize.x) * gridSize.x;
        newBounds.width += newBounds.x - snappedX;
        newBounds.x = snappedX;
      }
      if (corner?.includes("t")) {
        const snappedY = Math.floor(newBounds.y / gridSize.y) * gridSize.y;
        newBounds.height += newBounds.y - snappedY;
        newBounds.y = snappedY;
      }
      // Snap size for corners that affect width/height on the right/bottom
      if (corner?.includes("r")) {
        newBounds.width = Math.ceil(newBounds.width / gridSize.x) * gridSize.x;
      }
      if (corner?.includes("b")) {
        newBounds.height =
          Math.ceil(newBounds.height / gridSize.y) * gridSize.y;
      }
    }

    return newBounds;
  }

  private detectEdge(
    pos: Vector2,
    bounds: Rect,
  ): { edge: EdgeType; corner: CornerType } {
    const threshold = EDGE_THRESHOLD;

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

    // Check corners first (higher priority)
    if (nearLeft && nearTop && inHorizontalRange && inVerticalRange) {
      return { edge: null, corner: "tl" };
    }
    if (nearRight && nearTop && inHorizontalRange && inVerticalRange) {
      return { edge: null, corner: "tr" };
    }
    if (nearLeft && nearBottom && inHorizontalRange && inVerticalRange) {
      return { edge: null, corner: "bl" };
    }
    if (nearRight && nearBottom && inHorizontalRange && inVerticalRange) {
      return { edge: null, corner: "br" };
    }

    // Check edges
    if (nearLeft && inVerticalRange) {
      return { edge: "left", corner: null };
    }
    if (nearRight && inVerticalRange) {
      return { edge: "right", corner: null };
    }
    if (nearTop && inHorizontalRange) {
      return { edge: "top", corner: null };
    }
    if (nearBottom && inHorizontalRange) {
      return { edge: "bottom", corner: null };
    }

    return { edge: null, corner: null };
  }

  public getCursor(): string | null {
    let cursor = null;

    if (this._hoveredCorner) {
      switch (this._hoveredCorner) {
        case "tl":
        case "br":
          cursor = "nwse-resize";
          break;
        case "tr":
        case "bl":
          cursor = "nesw-resize";
          break;
      }
    } else if (this._hoveredEdge) {
      switch (this._hoveredEdge) {
        case "left":
        case "right":
          cursor = "ew-resize";
          break;
        case "top":
        case "bottom":
          cursor = "ns-resize";
          break;
      }
    }

    return cursor;
  }
}

export function setupBoundsDragger(cd: ClickDragger<Mode>): BoundsDragger {
  const boundsDragger = new BoundsDragger();
  cd.addListener(boundsDragger);
  return boundsDragger;
}
