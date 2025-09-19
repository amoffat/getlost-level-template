import * as P from "pixi.js";

interface Globals {
  app: P.Application;
  canvas: HTMLCanvasElement;
  gridContainer: P.Container;
  mapContainer: P.Container;
  backgroundContainer: P.Container;
  placableContainer: P.Container;
  selectedOutline: P.Container;
  placableSprite?: P.Sprite;
  grid: P.Container;
  gridSnap: number;
  tilesetCache: Map<string, P.Texture>;
  initialized: boolean;
}

export const globals: Globals = {
  initialized: false,
  tilesetCache: new Map<string, P.Texture>(),
} as unknown as Globals;
