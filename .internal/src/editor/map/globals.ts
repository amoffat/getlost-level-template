import * as P from "pixi.js";

interface Globals {
  app: P.Application;
  canvas: HTMLCanvasElement;
  gridContainer: P.Container;
  mapContainer: P.Container;
  backgroundContainer: P.Container;
  placableContainer: P.Container;
  placableSprite?: P.Sprite;
  grid: P.Container;
  gridSnap: number;
}

export const globals: Globals = {} as Globals;
