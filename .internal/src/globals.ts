import type { SignatureIndex } from "@/editor/tileset/autotile";
import type { TileGroup } from "@/types/tilegroup";
import * as P from "pixi.js";

interface Globals {
  mapEditorApp: P.Application | null;
  tilesetEditorApp: P.Application | null;
  npcEditorApp: P.Application | null;
  tileEdgeSigs: SignatureIndex;
  // This lets us quickly find the TileGroup that a tile ID belongs to, so we
  // can look up its tileset, etc
  tileIdToTileGroup: Map<string, TileGroup>;
}

export const globals: Globals = {
  mapEditorApp: null,
  tilesetEditorApp: null,
  npcEditorApp: null,
  tileEdgeSigs: new Map(),
  tileIdToTileGroup: new Map(),
};
