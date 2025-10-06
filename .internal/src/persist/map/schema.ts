import { MapObj, TileGroupInstance } from "@/types/editor";

// The persisted map consists of the entity adapter state for the `objects` slice
// (see `.internal/src/slices/map.ts`). Versioning allows future structural
// changes (e.g. spatial index, layering metadata, etc.) to be migrated.

export interface BaseMapDoc {
  version: number;
}

export interface MapEntitiesState {
  ids: string[];
  // A mix of MapObj and TileGroupInstance (TileGroupInstance extends MapObj)
  entities: Record<string, MapObj | TileGroupInstance>;
}

export interface MapDocV1 extends BaseMapDoc {
  version: 1;
  objects: MapEntitiesState;
}

export type LatestMapDoc = MapDocV1;
export const latestVersion = 1;
