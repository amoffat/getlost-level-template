import { LayerName } from "@/types/layer";
import * as P from "pixi.js";
import { Mover } from "./move";

interface Globals {
  app: P.Application;
  canvas: HTMLCanvasElement;
  mover: Mover;
  gridContainer: P.Container;
  mapContainer: P.Container;
  layerContainers: Record<LayerName, P.Container>;
  backgroundContainer: P.Container;
  placableContainer: P.Container;
  placableOutline: P.Container;
  placableSprite?: P.Sprite;
  selectionOutlines: P.Container;
  rectSelectOutline: P.Container;
  boundsContainer: P.Graphics;
  boundsMask: P.Graphics;
  grid: P.Container;
  gridSnap: number;
  tilesetCache: Map<string, P.Texture>;
  initialized: boolean;
}

export const globals: Globals = {
  initialized: false,
  tilesetCache: new Map<string, P.Texture>(),
  layerContainers: {} as Record<LayerName, P.Container>,
} as unknown as Globals;
