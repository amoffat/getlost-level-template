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

export type LatestTilesetDoc = TilesetDocV4;
export const latestVersion = 4;
