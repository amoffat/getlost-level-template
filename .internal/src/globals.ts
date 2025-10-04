import * as P from "pixi.js";
import type { SignatureIndex } from "./editor/tileset/autotile";

interface Globals {
  mapEditorApp: P.Application | null;
  tilesetEditorApp: P.Application | null;
  npcEditorApp: P.Application | null;
  tilesetEdgeSigs: Map<string, SignatureIndex>;
}

export const globals: Globals = {
  mapEditorApp: null,
  tilesetEditorApp: null,
  npcEditorApp: null,
  tilesetEdgeSigs: new Map(),
} as unknown as Globals;
