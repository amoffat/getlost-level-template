// The persisted map consists of the entity adapter state for the `objects` slice
// (see `.internal/src/slices/map.ts`). Versioning allows future structural
// changes (e.g. spatial index, layering metadata, etc.) to be migrated.

import { RootState } from "@/store/store";
import { SavedMap } from "@/types/map";

export interface BaseMapDoc {
  version: number;
}

export type MapState = Partial<RootState["mapEditor"]> &
  Pick<RootState["mapEditor"], "objects">;

export interface MapDocV1 extends BaseMapDoc {
  version: 1;
  map: SavedMap;
}

export interface MapDocV4 extends Omit<MapDocV1, "version"> {
  version: 4;
}

export interface MapDocV5 extends Omit<MapDocV4, "version"> {
  version: 5;
}

export interface MapDocV6 extends Omit<MapDocV5, "version"> {
  version: 6;
}

export interface MapDocV7 extends Omit<MapDocV6, "version"> {
  version: 7;
}

export interface MapDocV8 extends Omit<MapDocV7, "version"> {
  version: 8;
}

export interface MapDocV9 extends Omit<MapDocV8, "version"> {
  version: 9;
}

export interface MapDocV10 extends Omit<MapDocV9, "version"> {
  version: 10;
}

// Version 11: Asset ids (tilesetId / tsObjId / imageId / speakerImageId / sound)
// migrated from SHA-1 hex to content-derived UUIDv5 via the shared id-remap table.
export interface MapDocV11 extends Omit<MapDocV10, "version"> {
  version: 11;
}

// Version 12: Locale keys decoupled from content. Every `nameKey` /
// `descriptionKey` reference is remapped from the old content-derived key to a
// stable UUID via uuid5Hash, matching the locale-file migration.
export interface MapDocV12 extends Omit<MapDocV11, "version"> {
  version: 12;
}

export type LatestMapDoc = MapDocV12;
export const latestVersion = 12;
