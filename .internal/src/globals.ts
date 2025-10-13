import type { SignatureIndex } from "@/editor/tileset/autotile";
import type { TileGroup } from "@/types/tilegroup";
import * as P from "pixi.js";
import { ReduxReconciler } from "./editor/common/reconciler";

interface Globals {
  mapEditorApp: P.Application | null;
  tilesetEditorApp: P.Application | null;
  npcEditorApp: P.Application | null;
  tileEdgeSigs: SignatureIndex;
  // This lets us quickly find the TileGroup that a tile ID belongs to, so we
  // can look up its tileset, etc
  tileIdToTileGroup: Map<string, TileGroup>;
  // Tileset texture cache, keyed by tileset ID
  tilesetCache: Map<string, P.Texture>;
  mapEditorReconciler: ReduxReconciler;
  collisionEditorReconciler: ReduxReconciler;
}

const tilesetCache = new Map<string, P.Texture>();
export const globals: Globals = {
  mapEditorApp: null,
  tilesetEditorApp: null,
  npcEditorApp: null,
  tileEdgeSigs: new Map(),
  tileIdToTileGroup: new Map(),
  tilesetCache,
  mapEditorReconciler: new ReduxReconciler(tilesetCache),
  collisionEditorReconciler: new ReduxReconciler(tilesetCache),
};
