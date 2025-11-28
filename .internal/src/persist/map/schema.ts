// The persisted map consists of the entity adapter state for the `objects` slice
// (see `.internal/src/slices/map.ts`). Versioning allows future structural
// changes (e.g. spatial index, layering metadata, etc.) to be migrated.

import { RootState } from "@/store/store";

export interface BaseMapDoc {
  version: number;
}

export type MapState = Partial<RootState["mapEditor"]> &
  Pick<RootState["mapEditor"], "objects">;

export interface MapDocV1 extends BaseMapDoc {
  version: 1;
  state: MapState;
}

export interface MapDocV4 extends Omit<MapDocV1, "version"> {
  version: 4;
}

export interface MapDocV5 extends Omit<MapDocV4, "version"> {
  version: 5;
}

export type LatestMapDoc = MapDocV5;
export const latestVersion = 5;
