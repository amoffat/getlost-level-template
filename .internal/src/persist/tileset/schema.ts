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

// Version 17: Removed collisions.coverage, added collisions.simplify
export interface TilesetDocV17 extends Omit<TilesetDocV16, "version"> {
  version: 17;
}

// Version 18: Changed zIndices from number[] to Vector2[]
export interface TilesetDocV18 extends Omit<TilesetDocV17, "version"> {
  version: 18;
}

// Version 19: Renamed AnimationTemplate.names to AnimationTemplate.slotNames
export interface TilesetDocV19 extends Omit<TilesetDocV18, "version"> {
  version: 19;
}

// Version 20: Backfill TemplateObject.tilesetId for the player tileset
export interface TilesetDocV20 extends Omit<TilesetDocV19, "version"> {
  version: 20;
}

// Version 21: Convert AnimationTemplate frame `tg` from TileGroupTemplate object to string ID
export interface TilesetDocV21 extends Omit<TilesetDocV20, "version"> {
  version: 21;
}

// Version 22: Convert NpcAnimation.animation from AnimationTemplate object to string ID
export interface TilesetDocV22 extends Omit<TilesetDocV21, "version"> {
  version: 22;
}

// Version 23: Revert string IDs back to full objects for AnimationTemplate.frames[].tg and NpcAnimation.animation
export interface TilesetDocV23 extends Omit<TilesetDocV22, "version"> {
  version: 23;
}

// Version 24: Remove `restricted` from CBOR tileset metadata; restricted status
// is now communicated via file naming (.restricted.cbor.gz) and a response header.
export interface TilesetDocV24 extends Omit<TilesetDocV23, "version"> {
  version: 24;
  tileset: Omit<TilesetDocV23["tileset"], "restricted">;
}

// Version 25: Set `talkable = true` on all NpcTemplates.
export interface TilesetDocV25 extends Omit<TilesetDocV24, "version"> {
  version: 25;
}

// Version 26: Asset ids moved from SHA-1 hex to content-derived UUIDv5. The
// on-disk conversion (file renames + pixel-recomputed tile ids) is performed by
// the one-time `scripts/migrate-asset-ids.ts`; the client 25_to_26 migration only
// bumps the version, since it cannot rename the tileset's file to match a new id.
export interface TilesetDocV26 extends Omit<TilesetDocV25, "version"> {
  version: 26;
}

// Version 27: Add required `flipX` (per-frame horizontal mirror) to every
// animation frame — both AnimationTemplate.frames and the frames of each
// NpcTemplate animation. Existing frames are backfilled with `flipX = false`.
export interface TilesetDocV27 extends Omit<TilesetDocV26, "version"> {
  version: 27;
}

export type LatestTilesetDoc = TilesetDocV27;
export const latestVersion = 27;
