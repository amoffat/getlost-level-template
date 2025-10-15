import { MapLayerName } from "@/types/layer";
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
  // For drawing the map bounds
  boundsContainer: P.Graphics;
  boundsMask: P.Graphics;
  grid: P.Container;
  initialized: boolean;
}

export const globals: Globals = {
  initialized: false,
  layerContainers: {} as Record<MapLayerName, P.Container>,
} as unknown as Globals;
