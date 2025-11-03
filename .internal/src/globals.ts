import type { SignatureIndex } from "@/editor/map/utils/autotile";
import * as P from "pixi.js";
import { MapObjReconciler } from "./editor/common/mapReconciler";
import { TileReconciler } from "./editor/common/tileReconciler";

interface Globals {
  mapEditorApp: P.Application | null;
  tilesetEditorApp: P.Application | null;
  npcEditorApp: P.Application | null;
  tileEdgeSigs: SignatureIndex;
  // Tileset texture cache, keyed by tileset ID
  tilesetTextureCache: Map<string, P.Texture>;
  tilesetImageDataCache: Map<string, ImageData>;
  mapEditorReconciler: MapObjReconciler;
  collisionEditorReconciler: MapObjReconciler;
  tilesetEditorReconciler: TileReconciler;
}

const tilesetTextureCache = new Map<string, P.Texture>();
export const globals: Globals = {
  mapEditorApp: null,
  tilesetEditorApp: null,
  npcEditorApp: null,
  tileEdgeSigs: new Map(),
  tilesetTextureCache,
  tilesetImageDataCache: new Map(),
  mapEditorReconciler: new MapObjReconciler(tilesetTextureCache),
  collisionEditorReconciler: new MapObjReconciler(tilesetTextureCache),
  tilesetEditorReconciler: new TileReconciler(),
};
