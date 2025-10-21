import { globals as gApp } from "@/globals";
import { store } from "@/store/store";
import { Rect } from "@/types/rect";
import { TileGroup } from "@/types/tilegroup";
import * as P from "pixi.js";
import { v5 } from "uuid";

const GL_NS = "21296fbd-0328-4b58-9424-bc73b5f0e2f7";

export function genGroupId({
  coords,
  tsId,
}: {
  coords: Rect;
  tsId: string;
}): string {
  return v5(
    `${tsId}:${coords.ul.x},${coords.ul.y},${coords.br.x},${coords.br.y}`,
    GL_NS
  );
}

export async function genTilesetId(source: File): Promise<string> {
  const data = await source.arrayBuffer();
  const hash = await window.crypto.subtle.digest("SHA-1", data);
  return v5(new Uint8Array(hash), GL_NS);
}

export async function loadTilesetTex(
  tsId: string,
  objectUrl: string
): Promise<P.Texture> {
  const maybeTex = gApp.tilesetCache.get(tsId);
  if (maybeTex) return maybeTex;

  const tex = await P.Assets.load<P.Texture>({
    src: objectUrl,
    parser: "loadTextures",
  });
  tex.source.scaleMode = "nearest";
  gApp.tilesetCache.set(tsId, tex);
  return tex;
}

export function loadTileGroup({
  id,
  tilesetId,
}: {
  id: string;
  tilesetId: string;
}): TileGroup {
  const state = store.getState();
  const ts = state.tilesetEditor.tilesets[tilesetId];
  if (!ts) throw new Error("Tileset not found for tile group");
  const tg = ts.tiles.entities[id];
  if (!tg) throw new Error("Tile group not found in tileset palette");
  return tg;
}
