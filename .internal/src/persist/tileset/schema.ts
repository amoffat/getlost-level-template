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

export interface TilesetDocV14 extends Omit<TilesetDocV13, "version"> {
  version: 14;
}

// Version 15: Changed collisionMask to string | null (UUID)
export interface TilesetDocV15 extends Omit<TilesetDocV14, "version"> {
  version: 15;
  maskData: Record<string, Uint8Array>;
}

// Version 16: Moved collisionMask and collisionShapes to collisions object
export interface TilesetDocV16 extends Omit<TilesetDocV15, "version"> {
  version: 16;
}

export type LatestTilesetDoc = TilesetDocV16;
export const latestVersion = 16;
