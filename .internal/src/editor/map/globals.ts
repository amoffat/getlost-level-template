import * as P from "pixi.js";

interface Globals {
  app: P.Application;
  canvas: HTMLCanvasElement;
  gridContainer: P.Container;
  mapContainer: P.Container;
  backgroundContainer: P.Container;
  placableContainer: P.Container;
  placableOutline: P.Container;
  placableSprite?: P.Sprite;
  selectionOutlines: P.Container;
  grid: P.Container;
  gridSnap: number;
  tilesetCache: Map<string, P.Texture>;
  initialized: boolean;
}

export const globals: Globals = {
  initialized: false,
  tilesetCache: new Map<string, P.Texture>(),
} as unknown as Globals;
