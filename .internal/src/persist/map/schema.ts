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

export type LatestMapDoc = MapDocV8;
export const latestVersion = 8;
