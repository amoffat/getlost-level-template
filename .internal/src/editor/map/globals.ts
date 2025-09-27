import * as P from "pixi.js";
import { Mover } from "./move";

interface Globals {
  app: P.Application;
  canvas: HTMLCanvasElement;
  mover: Mover;
  gridContainer: P.Container;
  mapContainer: P.Container;
  backgroundContainer: P.Container;
  placableContainer: P.Container;
  placableOutline: P.Container;
  placableSprite?: P.Sprite;
  selectionOutlines: P.Container;
  rectSelectOutline: P.Container;
  grid: P.Container;
  gridSnap: number;
  tilesetCache: Map<string, P.Texture>;
  initialized: boolean;
}

export const globals: Globals = {
  initialized: false,
  tilesetCache: new Map<string, P.Texture>(),
} as unknown as Globals;
