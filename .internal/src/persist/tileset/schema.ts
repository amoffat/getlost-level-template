import { SavedTileset } from "@/types/tileset";

export interface BaseTilesetDoc {
  version: number;
}

export interface TilesetDocV1 extends BaseTilesetDoc {
  version: 1;
  tileset: SavedTileset;
  imageData: Uint8Array;
}

export interface TilesetDocV10 extends Omit<TilesetDocV1, "version"> {
  version: 10;
}

export interface TilesetDocV11 extends Omit<TilesetDocV10, "version"> {
  version: 11;
}

export interface TilesetDocV12 extends Omit<TilesetDocV11, "version"> {
  version: 12;
}

export interface TilesetDocV13 extends Omit<TilesetDocV12, "version"> {
  version: 13;
}

export type LatestTilesetDoc = TilesetDocV13;
export const latestVersion = 13;
