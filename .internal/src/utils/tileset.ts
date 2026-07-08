import { globals as gApp } from "@/globals";
import { store } from "@/store/store";
import { isTileGroupTemplate, TileGroupTemplate } from "@/types/tilegroup";
import { Tileset } from "@/types/tileset";
import * as P from "pixi.js";
import { uuid5Hash } from "./hash";
import { getImageDataFromBitmap } from "./image";

/** Generate a tileset id (UUIDv5) based on the image file contents */
export async function genTilesetId(objectUrl: string): Promise<string> {
  const blob = await fetch(objectUrl).then((r) => r.blob());
  const data = await blob.arrayBuffer();
  return uuid5Hash(data);
}

/**
 * Content hash (UUIDv5) of a tile/image region's decoded pixels. A tile group's
 * `id` and `imageId` are both derived from this same value — see `genTileId`.
 */
export function genImageId(imageData: ImageData): string {
  const { data } = imageData;
  return uuid5Hash(data.buffer);
}

export async function loadTilesetImage(ts: Tileset): Promise<P.Texture> {
  const maybeTex = gApp.tilesetTextureCache.get(ts.id);
  if (maybeTex) return new P.Texture(maybeTex);

  const tex = await P.Assets.load<P.Texture>({
    src: ts.objectUrl,
    parser: "loadTextures",
  });

  // Instead of using the image file as the Texture source, we'll use a canvas.
  // This lets us write to it later, for example, to paint it red if a tileset
  // is deleted, so that all objects using it are clearly marked as broken.
  const shared = new P.CanvasSource({});
  shared.resize(tex.width, tex.height);
  shared.context2D.drawImage(tex.source.resource as CanvasImageSource, 0, 0);
  shared.update();
  tex.source = shared;

  tex.source.scaleMode = "nearest";
  gApp.tilesetTextureCache.set(ts.id, shared);

  const bitmap = await createImageBitmap(
    await fetch(ts.objectUrl).then((r) => r.blob()),
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
}): TileGroupTemplate {
  const state = store.getState();
  const ts = state.tilesetEditor.tilesets[tilesetId];
  if (!ts) throw new Error("Tileset not found for tile group");
  const tg = ts.tiles.entities[id];
  if (!tg) throw new Error("Tile group not found in tileset palette");
  if (!isTileGroupTemplate(tg))
    throw new Error("Palette object is not a tile group");
  return tg;
}
