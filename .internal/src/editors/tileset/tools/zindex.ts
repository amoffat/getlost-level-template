import { bottomZoneFill, topZoneFill } from "@/editors/common/strokes";
import { Tool } from "@/editors/common/tooldispatch";
import { actions, selectors } from "@/slices/tilesetEditor";
import { store } from "@/store/store";
import { isTileGroupTemplate, TileGroupTemplate } from "@/types/tilegroup";
import { clamp } from "@/utils/math";
import { subState } from "@/utils/redux";
import { Vector2 } from "@/vec";
import * as P from "pixi.js";
import { globals as g } from "../globals";

// Track the currently rendered objects and their visual elements for drag updates
interface ZIndexHandle {
  idx: number;
  circleGfx: P.Graphics;
}

const moveHandleFill = { color: 0xffff00, alpha: 0.5 };

/**
 * A tool that implements the Tool interface for handling z-index drag operations.
 * This tool manages both individual handle dragging and line segment dragging.
 */
export class ZIndexTool implements Tool {
  private currentHandles: ZIndexHandle[] = [];
  private currentLineGraphics: P.Graphics | null = null;
  private currentLineSegmentGraphics: P.Graphics[] = [];
  private currentUpperPolygons: P.Graphics | null = null;
  private currentLowerPolygons: P.Graphics | null = null;
  private currentObj: TileGroupTemplate | null = null;

  // Drag state for handle dragging
  private isDragging = false;
  private dragHandle: ZIndexHandle | null = null;
  private currentZIndices: Vector2[] = [];

  // Line segment drag state
  private isDraggingLineSegment = false;
  private dragLineSegmentIndices: [number, number] | null = null;
  private dragLineSegmentStartY: number = 0;

  // Double-click tracking
  private lastClickTime: number = 0;
  private lastClickHandle: ZIndexHandle | null = null;
  private lastClickSegment: [number, number] | null = null;
  private readonly DOUBLE_CLICK_THRESHOLD = 300; // ms

  /**
   * Clears all z-index visual elements and resets drag state.
   */
  private clearZIndices(): void {
    g.zIndexOverlay.removeChildren();
    this.currentHandles = [];
    this.currentLineGraphics = null;
    this.currentLineSegmentGraphics = [];
    this.currentUpperPolygons = null;
    this.currentLowerPolygons = null;
    this.currentObj = null;
    // Reset drag state when clearing
    this.isDragging = false;
    this.dragHandle = null;
    this.isDraggingLineSegment = false;
    this.dragLineSegmentIndices = null;
  }

  /**
   * Redraws just the line graphics based on current zIndices.
   * zIndices are normalized (0-1), so we convert to pixel coordinates.
   */
  private redrawLines(zIndices: Vector2[]): void {
    if (!this.currentLineGraphics || !this.currentObj) return;

    const lineGfx = this.currentLineGraphics;
    const obj = this.currentObj;

    lineGfx.clear();
    zIndices.forEach((point, idx) => {
      const x = point.x * obj.pos.width;
      const y = point.y * obj.pos.height;
      if (idx === 0) {
        lineGfx.moveTo(x, y);
      } else {
        lineGfx.lineTo(x, y);
      }
    });
    lineGfx.stroke({
      color: 0xff0000,
      width: 1,
    });
  }

  /**
   * Redraws the interactive line segment hit areas based on current zIndices.
   */
  private redrawLineSegments(zIndices: Vector2[]): void {
    if (this.currentLineSegmentGraphics.length === 0 || !this.currentObj)
      return;

    const lineSegments = this.currentLineSegmentGraphics;
    const obj = this.currentObj;

    // Update each line segment's position
    for (let i = 0; i < lineSegments.length; i++) {
      const x1 = zIndices[i].x * obj.pos.width;
      const y1 = zIndices[i].y * obj.pos.height;
      const x2 = zIndices[i + 1].x * obj.pos.width;
      const y2 = zIndices[i + 1].y * obj.pos.height;

      const lineSegmentGfx = lineSegments[i];
      lineSegmentGfx.clear();
      lineSegmentGfx.moveTo(x1, y1);
      lineSegmentGfx.lineTo(x2, y2);
      lineSegmentGfx.stroke({
        color: 0xff0000,
        width: 10,
        alpha: 0,
      });
    }
  }

  /**
   * Redraws the upper and lower area polygons based on current zIndices.
   */
  private redrawPolygons(zIndices: Vector2[]): void {
    if (
      !this.currentUpperPolygons ||
      !this.currentLowerPolygons ||
      !this.currentObj
    )
      return;

    const upperGfx = this.currentUpperPolygons;
    const lowerGfx = this.currentLowerPolygons;
    const obj = this.currentObj;

    // Build polygon points for upper area (from top of object to z-index line)
    const upperPoints: number[] = [];
    // Top-left corner
    upperPoints.push(0, 0);
    // Top-right corner
    upperPoints.push(obj.pos.width, 0);
    // Follow z-index line from right to left
    for (let i = zIndices.length - 1; i >= 0; i--) {
      const x = zIndices[i].x * obj.pos.width;
      const y = zIndices[i].y * obj.pos.height;
      upperPoints.push(x, y);
    }

    // Build polygon points for lower area (from z-index line to bottom of object)
    const lowerPoints: number[] = [];
    // Follow z-index line from left to right
    for (let i = 0; i < zIndices.length; i++) {
      const x = zIndices[i].x * obj.pos.width;
      const y = zIndices[i].y * obj.pos.height;
      lowerPoints.push(x, y);
    }
    // Bottom-right corner
    lowerPoints.push(obj.pos.width, obj.pos.height);
    // Bottom-left corner
    lowerPoints.push(0, obj.pos.height);

    // Redraw upper polygon
    upperGfx.clear();
    upperGfx.poly(upperPoints).fill(topZoneFill);

    // Redraw lower polygon
    lowerGfx.clear();
    lowerGfx.poly(lowerPoints).fill(bottomZoneFill);
  }

  /**
   * Implements Tool.onPointerMove - handles pointer move during any drag operation.
   * Returns true if the event was handled (to stop propagation).
   */
  public onPointerMove(e: P.FederatedPointerEvent): boolean {
    // Handle individual handle drag
    if (this.isDragging && this.dragHandle) {
      this.handleHandleDrag(e);
      return true;
    }

    // Handle line segment drag
    if (this.isDraggingLineSegment && this.dragLineSegmentIndices) {
      this.handleLineSegmentDrag(e);
      return true;
    }

    return false;
  }

  /**
   * Implements Tool.getCursor - returns the cursor to display based on hover state.
   * Returns "ns-resize" when hovering over a handle or line segment.
   */
  public getCursor(e: P.FederatedPointerEvent): string | null {
    // Check if we're in z-index mode
    const state = store.getState();
    const mode = selectors.selectMode(state);
    if (mode !== "z-index") return null;

    // Always show resize cursor while dragging
    if (this.isDragging) {
      // Check if this is the first or last handle (vertical only)
      if (this.dragHandle) {
        const isFirst = this.dragHandle.idx === 0;
        const isLast = this.dragHandle.idx === this.currentZIndices.length - 1;
        return isFirst || isLast ? "ns-resize" : "move";
      }
      return "move";
    }

    if (this.isDraggingLineSegment) {
      return "ns-resize";
    }

    // Get local position relative to tilesetContainer
    const localPos = g.tilesetContainer.toLocal(e.global);

    // Check if we're hovering over a handle
    const hitHandle = this.hitTestHandles(localPos);
    if (hitHandle) {
      const isFirst = hitHandle.idx === 0;
      const isLast = hitHandle.idx === this.currentZIndices.length - 1;
      return isFirst || isLast ? "ns-resize" : "move";
    }

    // Check if we're hovering over a line segment
    const hitSegment = this.hitTestLineSegments(localPos);
    if (hitSegment) {
      return "ns-resize";
    }

    return null;
  }

  /**
   * Implements Tool.onPointerUp - handles pointer up to commit drag changes.
   * Returns true if the event was handled (to stop propagation).
   */
  public onPointerUp(_e: P.FederatedPointerEvent): boolean {
    // Handle individual handle drag completion
    if (this.isDragging && this.dragHandle) {
      this.commitHandleDrag();
      return true;
    }

    // Handle line segment drag completion
    if (this.isDraggingLineSegment) {
      this.commitLineSegmentDrag();
      return true;
    }

    return false;
  }

  /**
   * Implements Tool.onPointerDown - handles initial pointer down on handles or line segments.
   * Returns true if the event was handled (to stop propagation).
   */
  public onPointerDown(e: P.FederatedPointerEvent): boolean {
    if (e.button !== 0) return false; // Only left button

    const state = store.getState();
    const mode = selectors.selectMode(state);
    if (mode !== "z-index") return false;

    // Prevent interaction if already dragging something
    if (this.isDragging || this.isDraggingLineSegment) return false;

    // Get local position relative to tilesetContainer
    const localPos = g.tilesetContainer.toLocal(e.global);
    const currentTime = Date.now();
    const timeSinceLastClick = currentTime - this.lastClickTime;

    // Check if we hit a handle (handles have higher priority)
    const hitHandle = this.hitTestHandles(localPos);
    if (hitHandle) {
      // Check for double-click on handle
      if (
        timeSinceLastClick < this.DOUBLE_CLICK_THRESHOLD &&
        this.lastClickHandle?.idx === hitHandle.idx
      ) {
        // Double-click detected - remove handle (if not first or last)
        this.removeHandle(hitHandle.idx);
        this.lastClickTime = 0; // Reset to prevent triple-click
        this.lastClickHandle = null;
        return true;
      }

      this.lastClickTime = currentTime;
      this.lastClickHandle = hitHandle;
      this.lastClickSegment = null;
      this.startHandleDrag(hitHandle, e);
      return true;
    }

    // Check if we hit a line segment
    const hitSegment = this.hitTestLineSegments(localPos);
    if (hitSegment) {
      // Check for double-click on line segment
      if (
        timeSinceLastClick < this.DOUBLE_CLICK_THRESHOLD &&
        this.lastClickSegment &&
        this.lastClickSegment[0] === hitSegment.indices[0] &&
        this.lastClickSegment[1] === hitSegment.indices[1]
      ) {
        // Double-click detected - add handle at this position
        this.addHandleAtPosition(localPos);
        this.lastClickTime = 0; // Reset to prevent triple-click
        this.lastClickSegment = null;
        return true;
      }

      this.lastClickTime = currentTime;
      this.lastClickSegment = hitSegment.indices;
      this.lastClickHandle = null;
      this.startLineSegmentDrag(hitSegment.obj, hitSegment.indices, e);
      return true;
    }

    return false;
  }

  /**
   * Hit tests all current handles to find one at the given local position.
   */
  private hitTestHandles(localPos: P.PointData): ZIndexHandle | null {
    const hitRadius = 5; // Same as the hit area radius on handles
    const obj = this.currentObj;
    if (!obj) {
      return null;
    }

    for (const h of this.currentHandles) {
      const point = this.currentZIndices[h.idx];
      const handleX = obj.pos.x + point.x * obj.pos.width;
      const handleY = obj.pos.y + point.y * obj.pos.height;

      const dx = localPos.x - handleX;
      const dy = localPos.y - handleY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= hitRadius) {
        return h;
      }
    }

    return null;
  }

  /**
   * Hit tests all current line segments to find one at the given local position.
   */
  private hitTestLineSegments(
    localPos: P.PointData,
  ): { obj: TileGroupTemplate; indices: [number, number] } | null {
    const hitWidth = 10; // Same as the stroke width for hit area

    if (!this.currentObj) {
      return null;
    }

    const obj = this.currentObj;
    const segments = this.currentZIndices.length - 1;

    for (let i = 0; i < segments; i++) {
      const point1 = this.currentZIndices[i];
      const point2 = this.currentZIndices[i + 1];
      const x1 = obj.pos.x + point1.x * obj.pos.width;
      const y1 = obj.pos.y + point1.y * obj.pos.height;
      const x2 = obj.pos.x + point2.x * obj.pos.width;
      const y2 = obj.pos.y + point2.y * obj.pos.height;

      // Calculate distance from point to line segment
      const distance = this.pointToLineSegmentDistance(
        localPos.x,
        localPos.y,
        x1,
        y1,
        x2,
        y2,
      );

      if (distance <= hitWidth / 2) {
        return { obj, indices: [i, i + 1] };
      }
    }

    return null;
  }

  /**
   * Calculates the distance from a point to a line segment.
   */
  private pointToLineSegmentDistance(
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSquared = dx * dx + dy * dy;

    if (lengthSquared === 0) {
      // Line segment is a point
      return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
    }

    // Project point onto line segment, clamped to [0, 1]
    const t = Math.max(
      0,
      Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared),
    );

    // Find closest point on segment
    const closestX = x1 + t * dx;
    const closestY = y1 + t * dy;

    return Math.sqrt((px - closestX) ** 2 + (py - closestY) ** 2);
  }

  /**
   * Starts a handle drag operation.
   */
  private startHandleDrag(
    handle: ZIndexHandle,
    _e: P.FederatedPointerEvent,
  ): void {
    const state = store.getState();
    const activeTsId = state.tilesetEditor.activeTilesetId;
    if (!activeTsId) return;

    this.isDragging = true;
    this.dragHandle = handle;

    // Highlight the active handle
    handle.circleGfx.clear();
    handle.circleGfx.circle(0, 0, 4).fill(moveHandleFill);
  }

  /**
   * Handles pointer move during individual handle drag.
   */
  private handleHandleDrag(e: P.FederatedPointerEvent): void {
    if (!this.dragHandle) return;

    const state = store.getState();
    const mode = selectors.selectMode(state);
    if (mode !== "z-index") {
      this.resetDrag();
      return;
    }

    // Get local position relative to tilesetContainer
    const localPos = g.tilesetContainer.toLocal(e.global);
    const handle = this.dragHandle;
    const obj = this.currentObj!;

    // Calculate normalized position (0-1) for both x and y
    const relativeX = Math.round(localPos.x - obj.pos.x);
    const relativeY = Math.round(localPos.y - obj.pos.y);
    const normalizedX = relativeX / obj.pos.width;
    const normalizedY = relativeY / obj.pos.height;

    // Clamp Y between 0 and 1
    const clampedY = Math.max(0, Math.min(1, normalizedY));

    // Handle X constraints based on position
    let clampedX: number;
    const isFirst = handle.idx === 0;
    const isLast = handle.idx === this.currentZIndices.length - 1;

    if (isFirst) {
      // First handle must stay at x=0
      clampedX = 0;
    } else if (isLast) {
      // Last handle must stay at x=1
      clampedX = 1;
    } else {
      // Middle handles are constrained by neighbors with 1px buffer
      const pixelBuffer = 1 / obj.pos.width; // 1 pixel normalized
      const leftNeighbor = this.currentZIndices[handle.idx - 1];
      const rightNeighbor = this.currentZIndices[handle.idx + 1];
      const minX = leftNeighbor.x + pixelBuffer;
      const maxX = rightNeighbor.x - pixelBuffer;
      clampedX = Math.max(minX, Math.min(maxX, normalizedX));
    }

    // Update the zIndices array
    this.currentZIndices[handle.idx] = { x: clampedX, y: clampedY };

    // Update the circle position visually (convert back to pixel coordinates)
    const pixelX = clampedX * obj.pos.width;
    const pixelY = clampedY * obj.pos.height;
    handle.circleGfx.position.set(obj.pos.x + pixelX, obj.pos.y + pixelY);

    // Redraw the connecting lines with updated positions
    this.redrawLines(this.currentZIndices);

    // Redraw the line segment hit areas with updated positions
    this.redrawLineSegments(this.currentZIndices);

    // Redraw the polygons with updated positions
    this.redrawPolygons(this.currentZIndices);
  }

  /**
   * Commits the handle drag and dispatches the update to the store.
   */
  private commitHandleDrag(): void {
    if (!this.dragHandle) {
      this.resetDrag();
      return;
    }

    // Restore circle appearance
    this.dragHandle.circleGfx.clear();
    this.dragHandle.circleGfx.circle(0, 0, 2).fill(0xff0000);

    // Dispatch the final zIndices update to the store
    const obj = this.currentObj!;
    store.dispatch(
      actions.updateTilesetObject({
        tsId: obj.tilesetId,
        obj,
        changes: {
          zIndices: [...this.currentZIndices],
        },
      }),
    );

    this.resetDrag();
  }

  /**
   * Starts a line segment drag operation.
   */
  private startLineSegmentDrag(
    obj: TileGroupTemplate,
    indices: [number, number],
    e: P.FederatedPointerEvent,
  ): void {
    const state = store.getState();
    const activeTsId = state.tilesetEditor.activeTilesetId;
    if (!activeTsId) return;

    const freshObj = state.tilesetEditor.tilesets[activeTsId]?.tiles.entities[
      obj.id
    ] as TileGroupTemplate;
    if (!freshObj) return;

    this.isDraggingLineSegment = true;
    this.dragLineSegmentIndices = indices;
    this.currentZIndices = [...freshObj.zIndices];

    // Store the starting Y position (rounded to whole numbers)
    const localPos = g.tilesetContainer.toLocal(e.global);
    this.dragLineSegmentStartY = Math.round(localPos.y - obj.pos.y);

    // Highlight both handles
    const [idx1, idx2] = indices;
    const handle1 = this.currentHandles.find((h) => h.idx === idx1);
    const handle2 = this.currentHandles.find((h) => h.idx === idx2);

    if (handle1) {
      handle1.circleGfx.clear();
      handle1.circleGfx.circle(0, 0, 4).fill(moveHandleFill);
    }
    if (handle2) {
      handle2.circleGfx.clear();
      handle2.circleGfx.circle(0, 0, 4).fill(moveHandleFill);
    }
  }

  /**
   * Handles pointer move during line segment drag.
   */
  private handleLineSegmentDrag(e: P.FederatedPointerEvent): void {
    if (!this.dragLineSegmentIndices) return;

    const state = store.getState();
    const mode = selectors.selectMode(state);
    if (mode !== "z-index") {
      this.resetLineSegmentDrag();
      return;
    }

    // Get local position relative to tilesetContainer
    const localPos = g.tilesetContainer.toLocal(e.global);
    const obj = this.currentObj!;

    // Calculate the delta Y from the start position (rounded to whole numbers)
    const currentY = Math.round(localPos.y - obj.pos.y);
    const deltaY = currentY - this.dragLineSegmentStartY;
    const deltaNormalized = deltaY / obj.pos.height;

    const [idx1, idx2] = this.dragLineSegmentIndices;

    // Calculate what the new z-indices would be
    const activeTsId = state.tilesetEditor.activeTilesetId;
    if (!activeTsId) return;
    const freshObj = state.tilesetEditor.tilesets[activeTsId]?.tiles.entities[
      obj.id
    ] as TileGroupTemplate;
    if (!freshObj) return;

    const newY1 = freshObj.zIndices[idx1].y + deltaNormalized;
    const newY2 = freshObj.zIndices[idx2].y + deltaNormalized;

    // Check if either would exceed boundaries
    if (newY1 < 0 || newY1 > 1 || newY2 < 0 || newY2 > 1) {
      // Stop moving - clamp to boundary
      const clampedY1 = Math.max(0, Math.min(1, newY1));
      const clampedY2 = Math.max(0, Math.min(1, newY2));

      this.currentZIndices[idx1] = {
        ...this.currentZIndices[idx1],
        y: clampedY1,
      };
      this.currentZIndices[idx2] = {
        ...this.currentZIndices[idx2],
        y: clampedY2,
      };
    } else {
      // Apply the delta to both handles (only y changes)
      this.currentZIndices[idx1] = { ...this.currentZIndices[idx1], y: newY1 };
      this.currentZIndices[idx2] = { ...this.currentZIndices[idx2], y: newY2 };
    }

    // Update both circle positions
    const handle1 = this.currentHandles.find((h) => h.idx === idx1);
    const handle2 = this.currentHandles.find((h) => h.idx === idx2);

    if (handle1) {
      const point1 = this.currentZIndices[idx1];
      const pixelX1 = point1.x * obj.pos.width;
      const pixelY1 = point1.y * obj.pos.height;
      handle1.circleGfx.position.set(obj.pos.x + pixelX1, obj.pos.y + pixelY1);
    }

    if (handle2) {
      const point2 = this.currentZIndices[idx2];
      const pixelX2 = point2.x * obj.pos.width;
      const pixelY2 = point2.y * obj.pos.height;
      handle2.circleGfx.position.set(obj.pos.x + pixelX2, obj.pos.y + pixelY2);
    }

    // Redraw the connecting lines with updated positions
    this.redrawLines(this.currentZIndices);

    // Redraw the line segment hit areas with updated positions
    this.redrawLineSegments(this.currentZIndices);

    // Redraw the polygons with updated positions
    this.redrawPolygons(this.currentZIndices);
  }

  /**
   * Commits the line segment drag and dispatches the update to the store.
   */
  private commitLineSegmentDrag(): void {
    // Restore both circle appearances BEFORE resetting state
    if (this.dragLineSegmentIndices) {
      const [idx1, idx2] = this.dragLineSegmentIndices;
      const handle1 = this.currentHandles.find((h) => h.idx === idx1);
      const handle2 = this.currentHandles.find((h) => h.idx === idx2);

      if (handle1) {
        handle1.circleGfx.clear();
        handle1.circleGfx.circle(0, 0, 2).fill(0xff0000);
      }
      if (handle2) {
        handle2.circleGfx.clear();
        handle2.circleGfx.circle(0, 0, 2).fill(0xff0000);
      }
    }

    // Dispatch the final zIndices update to the store
    const obj = this.currentObj!;
    store.dispatch(
      actions.updateTilesetObject({
        tsId: obj.tilesetId,
        obj,
        changes: {
          zIndices: [...this.currentZIndices],
        },
      }),
    );

    this.resetLineSegmentDrag();
  }

  private resetDrag(): void {
    this.isDragging = false;
    this.dragHandle = null;
  }

  private resetLineSegmentDrag(): void {
    this.isDraggingLineSegment = false;
    this.dragLineSegmentIndices = null;
    this.dragLineSegmentStartY = 0;
  }

  /**
   * Removes a handle at the specified index (if not first or last).
   */
  private removeHandle(idx: number): void {
    if (!this.currentObj) return;

    const state = store.getState();
    const activeTsId = state.tilesetEditor.activeTilesetId;
    if (!activeTsId) return;

    const obj = state.tilesetEditor.tilesets[activeTsId]?.tiles.entities[
      this.currentObj.id
    ] as TileGroupTemplate;
    if (!obj) return;

    // Cannot remove first or last handle
    if (idx === 0 || idx === obj.zIndices.length - 1) return;

    // Create new array without the specified index
    const newZIndices = [
      ...obj.zIndices.slice(0, idx),
      ...obj.zIndices.slice(idx + 1),
    ];

    // Dispatch the update
    store.dispatch(
      actions.updateTilesetObject({
        tsId: obj.tilesetId,
        obj,
        changes: {
          zIndices: newZIndices,
        },
      }),
    );

    // Fetch the updated object from the store and redraw
    const updatedState = store.getState();
    const updatedObj = updatedState.tilesetEditor.tilesets[activeTsId]?.tiles
      .entities[this.currentObj.id] as TileGroupTemplate;
    if (updatedObj) {
      this.setActiveObject(updatedObj);
    }
  }

  /**
   * Adds a new handle at the specified position.
   */
  private addHandleAtPosition(localPos: P.PointData): void {
    if (!this.currentObj) return;

    const state = store.getState();
    const activeTsId = state.tilesetEditor.activeTilesetId;
    if (!activeTsId) return;

    const obj = state.tilesetEditor.tilesets[activeTsId]?.tiles.entities[
      this.currentObj.id
    ] as TileGroupTemplate;
    if (!obj) return;

    // Calculate normalized position (0-1)
    const relativeX = localPos.x - obj.pos.x;
    const relativeY = localPos.y - obj.pos.y;
    const normalizedX = clamp(relativeX / obj.pos.width, 0, 1);
    const normalizedY = clamp(relativeY / obj.pos.height, 0, 1);

    const newPoint: Vector2 = { x: normalizedX, y: normalizedY };

    // Find the correct position to insert (maintain sorted order by x)
    const newZIndices = [...obj.zIndices];
    let insertIndex = newZIndices.length;
    for (let i = 0; i < newZIndices.length - 1; i++) {
      if (
        normalizedX > newZIndices[i].x &&
        normalizedX < newZIndices[i + 1].x
      ) {
        insertIndex = i + 1;
        break;
      }
    }

    // Insert the new point
    newZIndices.splice(insertIndex, 0, newPoint);

    // Dispatch the update
    store.dispatch(
      actions.updateTilesetObject({
        tsId: obj.tilesetId,
        obj,
        changes: {
          zIndices: newZIndices,
        },
      }),
    );

    // Fetch the updated object from the store and redraw
    const updatedState = store.getState();
    const updatedObj = updatedState.tilesetEditor.tilesets[activeTsId]?.tiles
      .entities[this.currentObj.id] as TileGroupTemplate;
    if (updatedObj) {
      this.setActiveObject(updatedObj);
    }
  }

  public setActiveObject(obj: TileGroupTemplate | null): void {
    if (obj) {
      this.drawZIndices(obj);
      this.currentZIndices = [...obj.zIndices];
    } else {
      this.clearZIndices();
    }
  }

  /**
   * Draws the z-index handles and visual elements for the given object.
   */
  private drawZIndices(obj: TileGroupTemplate): void {
    this.clearZIndices();

    this.currentObj = obj;
    const zIndices = obj.zIndices.map((point) => ({
      x: clamp(point.x, 0, 1),
      y: clamp(point.y, 0, 1),
    }));

    // Draw connecting lines
    const lineGfx = new P.Graphics();
    lineGfx.zIndex = 20;
    zIndices.forEach((point, idx) => {
      const x = point.x * obj.pos.width;
      const y = point.y * obj.pos.height;
      if (idx === 0) {
        lineGfx.moveTo(x, y);
      } else {
        lineGfx.lineTo(x, y);
      }
    });
    lineGfx.stroke({
      color: 0xff0000,
      width: 1,
    });

    lineGfx.position.set(obj.pos.x, obj.pos.y);
    g.zIndexOverlay.addChild(lineGfx);
    this.currentLineGraphics = lineGfx;

    // Create polygon graphics objects
    const upperGfx = new P.Graphics();
    upperGfx.zIndex = 10;
    upperGfx.position.set(obj.pos.x, obj.pos.y);
    g.zIndexOverlay.addChild(upperGfx);
    this.currentUpperPolygons = upperGfx;

    const lowerGfx = new P.Graphics();
    lowerGfx.zIndex = 10;
    lowerGfx.position.set(obj.pos.x, obj.pos.y);
    g.zIndexOverlay.addChild(lowerGfx);
    this.currentLowerPolygons = lowerGfx;

    // Draw the polygons using the shared function
    this.redrawPolygons(zIndices);

    // Draw interactive line segments between handles BEFORE circles (so circles
    // are on top) - these are now just visual placeholders for hit testing,
    // actual hit testing is done in hitTestLineSegments
    for (let i = 0; i < zIndices.length - 1; i++) {
      const x1 = zIndices[i].x * obj.pos.width;
      const y1 = zIndices[i].y * obj.pos.height;
      const x2 = zIndices[i + 1].x * obj.pos.width;
      const y2 = zIndices[i + 1].y * obj.pos.height;

      // Create an invisible interactive line segment with a wider hit area
      const lineSegmentGfx = new P.Graphics();
      lineSegmentGfx.zIndex = 25;
      lineSegmentGfx.moveTo(x1, y1);
      lineSegmentGfx.lineTo(x2, y2);
      // Draw an invisible stroke for the hit area
      lineSegmentGfx.stroke({
        color: 0xff0000,
        width: 10,
        alpha: 0,
      });
      lineSegmentGfx.position.set(obj.pos.x, obj.pos.y);
      // Disable event mode since we handle hit testing ourselves now
      lineSegmentGfx.eventMode = "none";
      lineSegmentGfx.cursor = "ns-resize";

      g.zIndexOverlay.addChild(lineSegmentGfx);
      this.currentLineSegmentGraphics.push(lineSegmentGfx);
    }

    // Draw each circle as a separate Graphics element (AFTER line
    // segments for proper z-order) - hit testing is now done in hitTestHandles
    zIndices.forEach((point, idx) => {
      const x = point.x * obj.pos.width;
      const y = point.y * obj.pos.height;

      const circleGfx = new P.Graphics();
      circleGfx.circle(0, 0, 2).fill(0xff0000);
      circleGfx.position.set(obj.pos.x + x, obj.pos.y + y);
      // Disable event mode since we handle hit testing ourselves now
      circleGfx.eventMode = "none";
      circleGfx.cursor = "ns-resize";
      circleGfx.zIndex = 30;

      const handle: ZIndexHandle = {
        idx,
        circleGfx,
      };
      this.currentHandles.push(handle);

      g.zIndexOverlay.addChild(circleGfx);
    });
  }
}

// Create a singleton instance of the tool
let zIndexToolInstance: ZIndexTool | null = null;

/**
 * Gets or creates the ZIndexTool singleton instance.
 */
export function getZIndexTool(): ZIndexTool {
  if (!zIndexToolInstance) {
    zIndexToolInstance = new ZIndexTool();
  }
  return zIndexToolInstance;
}

export function setupZIndexer(): ZIndexTool {
  const tool = getZIndexTool();

  subState(
    [(state) => state.tilesetEditor.selectedTool, selectors.selectedObjects],
    (selectedTool, selectedObjs) => {
      if (selectedTool !== "z-index") {
        tool.setActiveObject(null);
        return;
      }

      const objs = selectedObjs.filter(isTileGroupTemplate);
      tool.setActiveObject(objs.length === 1 ? objs[0] : null);
    },
  );

  return tool;
}
