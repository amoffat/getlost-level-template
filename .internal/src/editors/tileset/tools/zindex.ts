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
const currentUpperPolygons: Map<string, P.Graphics> = new Map();
const currentLowerPolygons: Map<string, P.Graphics> = new Map();

// Drag state managed at module level for direct Pixi event handling
let isDragging = false;
let dragHandle: ZIndexHandle | null = null;
let currentZIndices: number[] = [];

function clearZIndices() {
  g.zIndexOverlay.removeChildren();
  currentHandles.length = 0;
  currentLineGraphics.clear();
  currentUpperPolygons.clear();
  currentLowerPolygons.clear();
  // Reset drag state when clearing
  isDragging = false;
  dragHandle = null;
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

  // Redraw the polygons with updated positions
  redrawPolygonsForObj(handle.obj, currentZIndices);
}

/**
 * Handles pointer up - commits the change to the store.
 */
function handlePointerUp(_e: P.FederatedPointerEvent) {
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

function resetDrag() {
  isDragging = false;
  dragHandle = null;
  currentZIndices = [];
}

function drawZIndices(objs: TileGroupTemplate[]) {
  clearZIndices();

  for (const obj of objs) {
    const zIndices = obj.zIndices.map((z) => clamp(z, 0, 1));

    // Draw connecting lines
    const lineGfx = new P.Graphics();
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
    upperGfx.position.set(obj.pos.x, obj.pos.y);
    g.zIndexOverlay.addChild(upperGfx);
    currentUpperPolygons.set(obj.id, upperGfx);

    const lowerGfx = new P.Graphics();
    lowerGfx.position.set(obj.pos.x, obj.pos.y);
    g.zIndexOverlay.addChild(lowerGfx);
    currentLowerPolygons.set(obj.id, lowerGfx);

    // Draw the polygons using the shared function
    redrawPolygonsForObj(obj, zIndices);

    // Draw each circle as a separate interactive Graphics element
    zIndices.forEach((zIndex, idx) => {
      const x = idx * obj.gridSize.x;
      // Convert normalized z-index (0-1) to pixel coordinates
      const y = zIndex * obj.pos.height;

      const circleGfx = new P.Graphics();
      circleGfx.circle(0, 0, 2).fill(0xff0000);
      circleGfx.position.set(obj.pos.x + x, obj.pos.y + y);
      circleGfx.eventMode = "static";
      circleGfx.cursor = "ns-resize";
      circleGfx.hitArea = new P.Circle(0, 0, 5);

      const handle: ZIndexHandle = {
        obj,
        idx,
        circleGfx,
      };
      currentHandles.push(handle);

      circleGfx.on("pointerover", () => {
        if (!isDragging) {
          circleGfx.clear();
          circleGfx.circle(0, 0, 3).fill(0xff6666);
        }
      });

      circleGfx.on("pointerout", () => {
        if (!isDragging) {
          circleGfx.clear();
          circleGfx.circle(0, 0, 2).fill(0xff0000);
        }
      });

      circleGfx.on("pointerdown", (e: P.FederatedPointerEvent) => {
        const state = store.getState();
        const mode = selectors.selectMode(state);
        if (mode !== "z-index") return;

        e.stopPropagation();

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

export function setupZIndexer() {}

subState(
  [
    (state) => state.tilesetEditor.selectedTiles.ids,
    (state) => state.tilesetEditor.selectedTool,
    (state) => {
      // Watch for changes to the actual tileset tiles data
      const activeTsId = state.tilesetEditor.activeTilesetId;
      if (!activeTsId) return null;
      return state.tilesetEditor.tilesets[activeTsId]?.tiles.entities;
    },
  ],
  (selectedIds, selectedTool, tilesetEntities) => {
    if (selectedTool !== "z-index") {
      clearZIndices();
      return;
    }
    if (!tilesetEntities) return;

    // Get the actual objects from the tileset, not from selectedTiles
    const objs = selectedIds
      .map((id) => tilesetEntities[id])
      .filter(isTileGroupTemplate);
    drawZIndices(objs);
  }
);
