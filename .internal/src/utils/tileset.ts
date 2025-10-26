import { globals as gApp } from "@/globals";
import { store } from "@/store/store";
import { Rect } from "@/types/rect";
import { TileGroup } from "@/types/tilegroup";
import { Tileset } from "@/types/tileset";
import * as P from "pixi.js";
import { sha1Hash } from "./hash";
import { getImageDataFromBitmap } from "./image";

export async function genTilesetId(source: File): Promise<string> {
  const data = await source.arrayBuffer();
  return sha1Hash(data);
}

export async function genImageId(imageData: ImageData): Promise<string> {
  const { data } = imageData;
  return sha1Hash(data.buffer);
}

export async function genTileId({
  tsId,
  pos,
}: {
  tsId: string;
  pos: Rect;
}): Promise<string> {
  const tsHash = await sha1Hash(
    `${tsId}:${pos.ul.x},${pos.ul.y}:${pos.br.x},${pos.br.y}`
  );
  return tsHash;
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
