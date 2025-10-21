import { SpatialIndex } from "@/types/spatial";
import { TilesetObject } from "@/types/tilegroup";
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
  spatialIndex: SpatialIndex<TilesetObject>;
}

export const globals: Globals = {} as Globals;
