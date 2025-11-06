import { Tileset } from "@/types/tileset";

export interface BaseTilesetDoc {
  version: number;
}

export interface TilesetDocV1 extends BaseTilesetDoc {
  version: 1;
  tileset: Tileset;
  imageData: Uint8Array;
}

export interface TilesetDocV10 extends Omit<TilesetDocV1, "version"> {
  version: 10;
}

export interface TilesetDocV11 extends Omit<TilesetDocV10, "version"> {
  version: 11;
}

export type LatestTilesetDoc = TilesetDocV11;
export const latestVersion = 11;
