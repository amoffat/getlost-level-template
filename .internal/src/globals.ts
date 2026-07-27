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
  // Background image texture cache, keyed by imageId (SHA-1 hash)
  backgroundImageCache: Map<string, P.CanvasSource>;
  // Background image blob-URL cache, keyed by imageId (SHA-1 hash), for thumbnails
  backgroundImageObjectUrlCache: Map<string, string>;
  // Speaker image blob-URL cache, keyed by imageId (SHA-1 hash), for thumbnails
  speakerImageObjectUrlCache: Map<string, string>;
  mapEditorReconciler: MapObjReconciler;
  collisionEditorReconciler: MapObjReconciler;
  tilesetEditorReconciler: TileReconciler;
  // NOTE: the template index used to live here, but was moved to
  // `@/utils/templateIndex` (`templateIndex`) so the mapEditor slice can
  // maintain it without importing this module — that import closed a load-order
  // cycle through mapReconciler → store/selectors.
  autosaveMap: boolean;
}

const tilesetTextureCache = new Map<string, P.CanvasSource>();
export const globals: Globals = {
  mapEditorApp: null,
  tilesetEditorApp: null,
  npcEditorApp: null,
  tileEdgeSigs: new Map(),
  tilesetTextureCache,
  tilesetImageDataCache: new Map(),
  backgroundImageCache: new Map(),
  backgroundImageObjectUrlCache: new Map(),
  speakerImageObjectUrlCache: new Map(),
  mapEditorReconciler: new MapObjReconciler(tilesetTextureCache),
  collisionEditorReconciler: new MapObjReconciler(tilesetTextureCache),
  tilesetEditorReconciler: new TileReconciler(),
  autosaveMap: true,
};
