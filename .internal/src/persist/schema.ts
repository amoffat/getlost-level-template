import { Tileset } from "@/types/tileset";

export interface BaseTilesetDoc {
  version: number;
}

export interface TilesetDocV1 extends BaseTilesetDoc {
  version: 1;
  tileset: Tileset;
  imageData: Uint8Array;
}

export interface TilesetDocV2 extends Omit<TilesetDocV1, "version"> {
  version: 2;
}

export interface TilesetDocV3 extends Omit<TilesetDocV2, "version"> {
  version: 3;
}

export interface TilesetDocV4 extends Omit<TilesetDocV3, "version"> {
  version: 4;
}

export interface TilesetDocV5 extends Omit<TilesetDocV4, "version"> {
  version: 5;
}

export type LatestTilesetDoc = TilesetDocV5;
export const latestVersion = 5;
