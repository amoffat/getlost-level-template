import type { SignatureIndex } from "@/editors/map/utils/autotile";
import * as P from "pixi.js";
import { MapObjReconciler } from "./editors/common/mapReconciler";
import { TileReconciler } from "./editors/common/tileReconciler";

interface Globals {
  mapEditorApp: P.Application | null;
  tilesetEditorApp: P.Application | null;
  npcEditorApp: P.Application | null;
  tileEdgeSigs: SignatureIndex;
  // Tileset texture cache, keyed by tileset ID
  tilesetTextureCache: Map<string, P.CanvasSource>;
  // Tileset image data cache, keyed by tileset ID
  tilesetImageDataCache: Map<string, ImageData>;
  mapEditorReconciler: MapObjReconciler;
  collisionEditorReconciler: MapObjReconciler;
  tilesetEditorReconciler: TileReconciler;
  // Template index mapping template IDs to sets of object IDs that use them.
  // This enables O(1) lookups of all objects using a given template,
  // which is critical for performance when updating template properties.
  templateIndex: Map<string, Set<string>>;
}

const tilesetTextureCache = new Map<string, P.CanvasSource>();
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
  templateIndex: new Map(),
};
