// The persisted map consists of the entity adapter state for the `objects` slice
// (see `.internal/src/slices/map.ts`). Versioning allows future structural
// changes (e.g. spatial index, layering metadata, etc.) to be migrated.

import { MapObj } from "@/types/map";

export interface BaseMapDoc {
  version: number;
}

export interface MapEntitiesState {
  ids: string[];
  // A mix of MapObj and TileGroupInstance (TileGroupInstance extends MapObj)
  entities: Record<string, MapObj>;
}

export interface MapDocV1 extends BaseMapDoc {
  version: 1;
  objects: MapEntitiesState;
}

export interface MapDocV2 extends Omit<MapDocV1, "version"> {
  version: 2;
}

export interface MapDocV3 extends Omit<MapDocV2, "version"> {
  version: 3;
}

export type LatestMapDoc = MapDocV3;
export const latestVersion = 3;
