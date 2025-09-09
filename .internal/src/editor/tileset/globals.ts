import * as P from "pixi.js";

interface Globals {
  app: P.Application;
  canvas: HTMLCanvasElement;
  tilesetContainer: P.Container;
  gridContainer: P.Container;
  backgroundContainer: P.Container;
  grid: P.Graphics;
  currentTileset: P.Sprite;
}

export const globals: Globals = {} as Globals;
