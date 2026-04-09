import { MapLayerName } from "@/types/layer";
import type { MapObj } from "@/types/map";
import type { SpatialIndex } from "@/types/spatial";
import { Vector2 } from "@/vec";
import * as P from "pixi.js";
import { Mover } from "./tools/move";

interface Globals {
  app: P.Application;
  canvas: HTMLCanvasElement;
  mover: Mover;
  // For the grid overlay
  gridContainer: P.Container;
  mapContainer: P.Container;
  // For ground-level stuff: tiles, decorations, etc.
  layerContainers: Record<MapLayerName, P.Container>;
  // For the checkerboard background
  backgroundContainer: P.Container;
  // For the object about to be placed with the mouse
  placableContainer: P.Container;
  placableOutline: P.Container;
  placableSprite?: P.Sprite;
  // For the outlines of selected objects
  selectionOutlines: P.Container;
  rectSelectOutline: P.Container;
  rectSelect: P.Graphics;
  // For drawing the map bounds
  boundsContainer: P.Graphics;
  boundsMask: P.Graphics;
  grid: P.Container;
  initialized: boolean;

  spatialIndex: SpatialIndex<MapObj>;
  mousePos: Vector2;
  // IDs of background images whose parallax effect is currently disabled in the editor.
  // Toggled via the eye icon in BackgroundTool; not persisted to level state.
  parallaxDisabledIds: Set<string>;
}

export const globals: Globals = {
  initialized: false,
  layerContainers: {} as Record<MapLayerName, P.Container>,
  mousePos: { x: 0, y: 0 },
  parallaxDisabledIds: new Set(),
} as unknown as Globals;
