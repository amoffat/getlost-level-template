import * as P from "pixi.js";

interface Globals {
  app: P.Application;
  canvas: HTMLCanvasElement;
  tilesetContainer: P.Container;
  groupSelContainer: P.Container;
  groupSelGraphics: P.Graphics;
  allGroupsOverlay: P.Container;
  gridContainer: P.Container;
  backgroundContainer: P.Container;
  grid: P.Container;
  currentTileset?: P.Sprite;
  scanPos: P.Container;
}

export const globals: Globals = {} as Globals;
