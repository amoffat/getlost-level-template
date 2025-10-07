import { LayerName } from "@/types/layer";
import * as P from "pixi.js";
import { Mover } from "./tools/move";

interface Globals {
  app: P.Application;
  canvas: HTMLCanvasElement;
  mover: Mover;
  // For the grid overlay
  gridContainer: P.Container;
  mapContainer: P.Container;
  // For sensors, sound zones, zoom zones, sink zones, lights, etc.
  metaContainer: P.Container;
  // For ground-level stuff: tiles, decorations, etc.
  layerContainers: Record<LayerName, P.Container>;
  // For the checkerboard background
  backgroundContainer: P.Container;
  // For the object about to be placed with the mouse
  placableContainer: P.Container;
  placableOutline: P.Container;
  placableSprite?: P.Sprite;
  // For the outlines of selected objects
  selectionOutlines: P.Container;
  rectSelectOutline: P.Container;
  // For drawing the map bounds
  boundsContainer: P.Graphics;
  boundsMask: P.Graphics;
  grid: P.Container;
  gridSnap: number;
  // Tileset texture cache, keyed by tileset ID
  tilesetCache: Map<string, P.Texture>;
  initialized: boolean;
}

export const globals: Globals = {
  initialized: false,
  tilesetCache: new Map<string, P.Texture>(),
  layerContainers: {} as Record<LayerName, P.Container>,
} as unknown as Globals;
