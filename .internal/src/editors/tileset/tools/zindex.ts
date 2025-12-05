import { bottomZoneFill, topZoneFill } from "@/editors/common/strokes";
import { actions, selectors } from "@/slices/tilesetEditor";
import { store } from "@/store/store";
import { isTileGroupTemplate, TileGroupTemplate } from "@/types/tilegroup";
import { clamp } from "@/utils/math";
import { subState } from "@/utils/redux";
import * as P from "pixi.js";
import { globals as g } from "../globals";

// Track the currently rendered objects and their visual elements for drag updates
interface ZIndexHandle {
  obj: TileGroupTemplate;
  idx: number;
  circleGfx: P.Graphics;
}

const currentHandles: ZIndexHandle[] = [];
const currentLineGraphics: Map<string, P.Graphics> = new Map();
const currentLineSegmentGraphics: Map<string, P.Graphics[]> = new Map();
const currentUpperPolygons: Map<string, P.Graphics> = new Map();
const currentLowerPolygons: Map<string, P.Graphics> = new Map();

// Drag state managed at module level for direct Pixi event handling
let isDragging = false;
let dragHandle: ZIndexHandle | null = null;
let currentZIndices: number[] = [];

// Line segment drag state
let isDraggingLineSegment = false;
let dragLineSegmentIndices: [number, number] | null = null;
let dragLineSegmentObj: TileGroupTemplate | null = null;
let dragLineSegmentStartY: number = 0;

function clearZIndices() {
  g.zIndexOverlay.removeChildren();
  currentHandles.length = 0;
  currentLineGraphics.clear();
  currentLineSegmentGraphics.clear();
  currentUpperPolygons.clear();
  currentLowerPolygons.clear();
  // Reset drag state when clearing
  isDragging = false;
  dragHandle = null;
  isDraggingLineSegment = false;
  dragLineSegmentIndices = null;
  dragLineSegmentObj = null;
}

/**
 * Redraws just the line graphics for a specific object based on current zIndices.
 * zIndices are normalized (0-1), so we convert to pixel coordinates.
 */
function redrawLinesForObj(obj: TileGroupTemplate, zIndices: number[]) {
  const lineGfx = currentLineGraphics.get(obj.id);
  if (!lineGfx) return;

  lineGfx.clear();
  zIndices.forEach((zIndex, idx) => {
    const x = idx * obj.gridSize.x;
    const y = zIndex * obj.pos.height;
    if (idx === 0) {
      lineGfx.moveTo(x, y);
    } else {
      lineGfx.lineTo(x, y).stroke({
        color: 0xff0000,
        width: 1,
      });
    }
  });
}

/**
 * Redraws the interactive line segment hit areas based on current zIndices.
 */
function redrawLineSegmentsForObj(obj: TileGroupTemplate, zIndices: number[]) {
  const lineSegments = currentLineSegmentGraphics.get(obj.id);
  if (!lineSegments) return;

  // Update each line segment's position
  for (let i = 0; i < lineSegments.length; i++) {
    const x1 = i * obj.gridSize.x;
    const y1 = zIndices[i] * obj.pos.height;
    const x2 = (i + 1) * obj.gridSize.x;
    const y2 = zIndices[i + 1] * obj.pos.height;

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
function redrawPolygonsForObj(obj: TileGroupTemplate, zIndices: number[]) {
  const upperGfx = currentUpperPolygons.get(obj.id);
  const lowerGfx = currentLowerPolygons.get(obj.id);
  if (!upperGfx || !lowerGfx) return;

  // Build polygon points for upper area (from top of object to z-index line)
  const upperPoints: number[] = [];
  // Top-left corner
  upperPoints.push(0, 0);
  // Top-right corner
  upperPoints.push(obj.pos.width, 0);
  // Follow z-index line from right to left
  for (let i = zIndices.length - 1; i >= 0; i--) {
    const x = i * obj.gridSize.x;
    const y = zIndices[i] * obj.pos.height;
    upperPoints.push(x, y);
  }

  // Build polygon points for lower area (from z-index line to bottom of object)
  const lowerPoints: number[] = [];
  // Follow z-index line from left to right
  for (let i = 0; i < zIndices.length; i++) {
    const x = i * obj.gridSize.x;
    const y = zIndices[i] * obj.pos.height;
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
 * Handles pointer move during drag - updates handle position and lines.
 */
function handlePointerMove(e: P.FederatedPointerEvent) {
  if (!isDragging || !dragHandle) return;

  const state = store.getState();
  const mode = selectors.selectMode(state);
  if (mode !== "z-index") {
    resetDrag();
    return;
  }

  // Get local position relative to tilesetContainer
  const localPos = g.tilesetContainer.toLocal(e.global);
  const handle = dragHandle;

  // Calculate normalized z-index (0-1) based on position within object height
  const relativeY = Math.round(localPos.y - handle.obj.pos.y);
  const normalizedZ = relativeY / handle.obj.pos.height;

  // Clamp between 0 and 1
  const clampedZ = Math.max(0, Math.min(1, normalizedZ));

  // Update the zIndices array
  currentZIndices[handle.idx] = clampedZ;

  // Update the circle position visually (convert back to pixel coordinates)
  const x = handle.idx * handle.obj.gridSize.x;
  const pixelY = clampedZ * handle.obj.pos.height;
  handle.circleGfx.position.set(
    handle.obj.pos.x + x,
    handle.obj.pos.y + pixelY
  );

  // Redraw the connecting lines with updated positions
  redrawLinesForObj(handle.obj, currentZIndices);

  // Redraw the line segment hit areas with updated positions
  redrawLineSegmentsForObj(handle.obj, currentZIndices);

  // Redraw the polygons with updated positions
  redrawPolygonsForObj(handle.obj, currentZIndices);
}

/**
 * Handles pointer move during line segment drag - moves both connected handles.
 */
function handleLineSegmentPointerMove(e: P.FederatedPointerEvent) {
  if (!isDraggingLineSegment || !dragLineSegmentIndices || !dragLineSegmentObj)
    return;

  e.stopPropagation();

  const state = store.getState();
  const mode = selectors.selectMode(state);
  if (mode !== "z-index") {
    resetLineSegmentDrag();
    return;
  }

  // Get local position relative to tilesetContainer
  const localPos = g.tilesetContainer.toLocal(e.global);
  const obj = dragLineSegmentObj;

  // Calculate the delta Y from the start position (rounded to whole numbers)
  const currentY = Math.round(localPos.y - obj.pos.y);
  const deltaY = currentY - dragLineSegmentStartY;
  const deltaNormalized = deltaY / obj.pos.height;

  const [idx1, idx2] = dragLineSegmentIndices;

  // Calculate what the new z-indices would be
  const activeTsId = state.tilesetEditor.activeTilesetId;
  if (!activeTsId) return;
  const freshObj = state.tilesetEditor.tilesets[activeTsId]?.tiles.entities[
    obj.id
  ] as TileGroupTemplate;
  if (!freshObj) return;

  const newZ1 = freshObj.zIndices[idx1] + deltaNormalized;
  const newZ2 = freshObj.zIndices[idx2] + deltaNormalized;

  // Check if either would exceed boundaries
  if (newZ1 < 0 || newZ1 > 1 || newZ2 < 0 || newZ2 > 1) {
    // Stop moving - clamp to boundary
    const clampedZ1 = Math.max(0, Math.min(1, newZ1));
    const clampedZ2 = Math.max(0, Math.min(1, newZ2));

    currentZIndices[idx1] = clampedZ1;
    currentZIndices[idx2] = clampedZ2;
  } else {
    // Apply the delta to both handles
    currentZIndices[idx1] = newZ1;
    currentZIndices[idx2] = newZ2;
  }

  // Update both circle positions
  const handle1 = currentHandles.find(
    (h) => h.obj.id === obj.id && h.idx === idx1
  );
  const handle2 = currentHandles.find(
    (h) => h.obj.id === obj.id && h.idx === idx2
  );

  if (handle1) {
    const x1 = idx1 * obj.gridSize.x;
    const pixelY1 = currentZIndices[idx1] * obj.pos.height;
    handle1.circleGfx.position.set(obj.pos.x + x1, obj.pos.y + pixelY1);
  }

  if (handle2) {
    const x2 = idx2 * obj.gridSize.x;
    const pixelY2 = currentZIndices[idx2] * obj.pos.height;
    handle2.circleGfx.position.set(obj.pos.x + x2, obj.pos.y + pixelY2);
  }

  // Redraw the connecting lines with updated positions
  redrawLinesForObj(obj, currentZIndices);

  // Redraw the line segment hit areas with updated positions
  redrawLineSegmentsForObj(obj, currentZIndices);

  // Redraw the polygons with updated positions
  redrawPolygonsForObj(obj, currentZIndices);
}

/**
 * Handles pointer up - commits the change to the store.
 */
function handlePointerUp(e: P.FederatedPointerEvent) {
  e.stopPropagation();

  if (!isDragging || !dragHandle) {
    resetDrag();
    return;
  }

  // Dispatch the final zIndices update to the store
  const obj = dragHandle.obj;
  store.dispatch(
    actions.updateTilesetObject({
      tsId: obj.tilesetId,
      obj,
      changes: {
        zIndices: [...currentZIndices],
      },
    })
  );

  resetDrag();
}

/**
 * Handles pointer up for line segment drag - commits the change to the store.
 */
function handleLineSegmentPointerUp(e: P.FederatedPointerEvent) {
  e.stopPropagation();

  if (!isDraggingLineSegment || !dragLineSegmentObj) {
    resetLineSegmentDrag();
    return;
  }

  // Restore both circle appearances BEFORE resetting state
  if (dragLineSegmentIndices && dragLineSegmentObj) {
    const [idx1, idx2] = dragLineSegmentIndices;
    const obj = dragLineSegmentObj;
    const handle1 = currentHandles.find(
      (h) => h.obj.id === obj.id && h.idx === idx1
    );
    const handle2 = currentHandles.find(
      (h) => h.obj.id === obj.id && h.idx === idx2
    );

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
  const obj = dragLineSegmentObj;
  store.dispatch(
    actions.updateTilesetObject({
      tsId: obj.tilesetId,
      obj,
      changes: {
        zIndices: [...currentZIndices],
      },
    })
  );

  resetLineSegmentDrag();
}

function resetDrag() {
  isDragging = false;
  dragHandle = null;
  currentZIndices = [];
}

function resetLineSegmentDrag() {
  isDraggingLineSegment = false;
  dragLineSegmentIndices = null;
  dragLineSegmentObj = null;
  dragLineSegmentStartY = 0;
  currentZIndices = [];
}

function drawZIndices(objs: TileGroupTemplate[]) {
  clearZIndices();

  for (const obj of objs) {
    const zIndices = obj.zIndices.map((z) => clamp(z, 0, 1));

    // Draw connecting lines
    const lineGfx = new P.Graphics();
    lineGfx.zIndex = 20;
    zIndices.forEach((zIndex, idx) => {
      const x = idx * obj.gridSize.x;
      // Convert normalized z-index (0-1) to pixel coordinates
      const y = zIndex * obj.pos.height;
      if (idx === 0) {
        lineGfx.moveTo(x, y);
      } else {
        lineGfx.lineTo(x, y).stroke({
          color: 0xff0000,
          width: 1,
        });
      }
    });
    lineGfx.position.set(obj.pos.x, obj.pos.y);
    g.zIndexOverlay.addChild(lineGfx);
    currentLineGraphics.set(obj.id, lineGfx);

    // Create polygon graphics objects
    const upperGfx = new P.Graphics();
    upperGfx.zIndex = 10;
    upperGfx.position.set(obj.pos.x, obj.pos.y);
    g.zIndexOverlay.addChild(upperGfx);
    currentUpperPolygons.set(obj.id, upperGfx);

    const lowerGfx = new P.Graphics();
    lowerGfx.zIndex = 10;
    lowerGfx.position.set(obj.pos.x, obj.pos.y);
    g.zIndexOverlay.addChild(lowerGfx);
    currentLowerPolygons.set(obj.id, lowerGfx);

    // Draw the polygons using the shared function
    redrawPolygonsForObj(obj, zIndices);

    // Draw interactive line segments between handles BEFORE circles (so circles
    // are on top)
    const lineSegments: P.Graphics[] = [];
    for (let i = 0; i < zIndices.length - 1; i++) {
      const x1 = i * obj.gridSize.x;
      const y1 = zIndices[i] * obj.pos.height;
      const x2 = (i + 1) * obj.gridSize.x;
      const y2 = zIndices[i + 1] * obj.pos.height;

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
      lineSegmentGfx.eventMode = "static";
      lineSegmentGfx.cursor = "ns-resize";

      const segmentIdx1 = i;
      const segmentIdx2 = i + 1;

      lineSegmentGfx.on("pointerdown", (e: P.FederatedPointerEvent) => {
        if (e.button !== 0) return; // Only left button

        const state = store.getState();
        const mode = selectors.selectMode(state);
        if (mode !== "z-index") return;

        e.stopPropagation();

        // Prevent interaction if already dragging something
        if (isDragging || isDraggingLineSegment) return;

        // Get fresh object data from the tileset
        const activeTsId = state.tilesetEditor.activeTilesetId;
        if (!activeTsId) return;
        const freshObj = state.tilesetEditor.tilesets[activeTsId]?.tiles
          .entities[obj.id] as TileGroupTemplate;
        if (!freshObj) return;

        isDraggingLineSegment = true;
        dragLineSegmentIndices = [segmentIdx1, segmentIdx2];
        dragLineSegmentObj = obj;
        currentZIndices = [...freshObj.zIndices];

        // Store the starting Y position (rounded to whole numbers)
        const localPos = g.tilesetContainer.toLocal(e.global);
        dragLineSegmentStartY = Math.round(localPos.y - obj.pos.y);

        // Highlight both handles
        const handle1 = currentHandles.find(
          (h) => h.obj.id === obj.id && h.idx === segmentIdx1
        );
        const handle2 = currentHandles.find(
          (h) => h.obj.id === obj.id && h.idx === segmentIdx2
        );

        if (handle1) {
          handle1.circleGfx.clear();
          handle1.circleGfx.circle(0, 0, 4).fill(0xffff00);
        }
        if (handle2) {
          handle2.circleGfx.clear();
          handle2.circleGfx.circle(0, 0, 4).fill(0xffff00);
        }

        // Add global listeners for move and up
        g.tilesetContainer.on("pointermove", handleLineSegmentPointerMove);
        g.tilesetContainer.on(
          "pointerup",
          handleLineSegmentPointerUpAndCleanup
        );
        g.tilesetContainer.on(
          "pointerupoutside",
          handleLineSegmentPointerUpAndCleanup
        );
      });

      g.zIndexOverlay.addChild(lineSegmentGfx);
      lineSegments.push(lineSegmentGfx);
    }

    // Store the line segment graphics for this object
    currentLineSegmentGraphics.set(obj.id, lineSegments);

    // Draw each circle as a separate interactive Graphics element (AFTER line
    // segments for proper z-order)
    zIndices.forEach((zIndex, idx) => {
      const x = idx * obj.gridSize.x;
      // Convert normalized z-index (0-1) to pixel coordinates
      const y = zIndex * obj.pos.height;

      const circleGfx = new P.Graphics();
      circleGfx.circle(0, 0, 2).fill(0xff0000);
      circleGfx.position.set(obj.pos.x + x, obj.pos.y + y);
      circleGfx.eventMode = "static";
      circleGfx.cursor = "ns-resize";
      circleGfx.zIndex = 30;
      circleGfx.hitArea = new P.Circle(0, 0, 5);

      const handle: ZIndexHandle = {
        obj,
        idx,
        circleGfx,
      };
      currentHandles.push(handle);

      circleGfx.on("pointerover", () => {
        if (!isDragging && !isDraggingLineSegment) {
          circleGfx.clear();
          circleGfx.circle(0, 0, 3).fill(0xff6666);
        }
      });

      circleGfx.on("pointerout", () => {
        if (!isDragging && !isDraggingLineSegment) {
          circleGfx.clear();
          circleGfx.circle(0, 0, 2).fill(0xff0000);
        }
      });

      circleGfx.on("pointerdown", (e: P.FederatedPointerEvent) => {
        if (e.button !== 0) return; // Only left button

        const state = store.getState();
        const mode = selectors.selectMode(state);
        if (mode !== "z-index") return;

        e.stopPropagation();

        // Prevent interaction if already dragging something
        if (isDragging || isDraggingLineSegment) return;

        // Get fresh object data from the tileset (not selectedTiles) to ensure we have the latest zIndices
        const activeTsId = state.tilesetEditor.activeTilesetId;
        if (!activeTsId) return;
        const freshObj = state.tilesetEditor.tilesets[activeTsId]?.tiles
          .entities[obj.id] as TileGroupTemplate;
        if (!freshObj) return;

        isDragging = true;
        dragHandle = handle;
        currentZIndices = [...freshObj.zIndices];

        // Highlight the active handle
        circleGfx.clear();
        circleGfx.circle(0, 0, 4).fill(0xffff00);

        // Add global listeners for move and up
        g.tilesetContainer.on("pointermove", handlePointerMove);
        g.tilesetContainer.on("pointerup", handlePointerUpAndCleanup);
        g.tilesetContainer.on("pointerupoutside", handlePointerUpAndCleanup);
      });

      g.zIndexOverlay.addChild(circleGfx);
    });
  }
}

function handlePointerUpAndCleanup(e: P.FederatedPointerEvent) {
  handlePointerUp(e);

  // Restore circle appearance
  if (dragHandle) {
    dragHandle.circleGfx.clear();
    dragHandle.circleGfx.circle(0, 0, 2).fill(0xff0000);
  }

  // Remove global listeners
  g.tilesetContainer.off("pointermove", handlePointerMove);
  g.tilesetContainer.off("pointerup", handlePointerUpAndCleanup);
  g.tilesetContainer.off("pointerupoutside", handlePointerUpAndCleanup);
}

function handleLineSegmentPointerUpAndCleanup(e: P.FederatedPointerEvent) {
  handleLineSegmentPointerUp(e);

  // Remove global listeners
  g.tilesetContainer.off("pointermove", handleLineSegmentPointerMove);
  g.tilesetContainer.off("pointerup", handleLineSegmentPointerUpAndCleanup);
  g.tilesetContainer.off(
    "pointerupoutside",
    handleLineSegmentPointerUpAndCleanup
  );
}

export function setupZIndexer() {}

subState(
  [(state) => state.tilesetEditor.selectedTool, selectors.selectedObjects],
  (selectedTool, selectedObjs) => {
    if (selectedTool !== "z-index") {
      clearZIndices();
      return;
    }

    const objs = selectedObjs.filter(isTileGroupTemplate);
    drawZIndices(objs);
  }
);
