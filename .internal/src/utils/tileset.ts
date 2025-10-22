import { globals as gApp } from "@/globals";
import { store } from "@/store/store";
import { TileGroup } from "@/types/tilegroup";
import { Tileset } from "@/types/tileset";
import * as P from "pixi.js";
import { getImageDataFromBitmap } from "./image";

export async function genTilesetId(source: File): Promise<string> {
  const data = await source.arrayBuffer();
  const hash = await window.crypto.subtle.digest("SHA-1", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function loadTilesetImage(ts: Tileset): Promise<P.Texture> {
  const maybeTex = gApp.tilesetTextureCache.get(ts.id);
  if (maybeTex) return maybeTex;

  const tex = await P.Assets.load<P.Texture>({
    src: ts.objectUrl,
    parser: "loadTextures",
  });
  tex.source.scaleMode = "nearest";
  gApp.tilesetTextureCache.set(ts.id, tex);

  const bitmap = await createImageBitmap(
    await fetch(ts.objectUrl).then((r) => r.blob())
  );
  const imageData = getImageDataFromBitmap(bitmap);
  gApp.tilesetImageDataCache.set(ts.id, imageData);

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
