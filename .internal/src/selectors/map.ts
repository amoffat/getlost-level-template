import type { RootState } from "@/store/store";
import { isTileGroupInstance, TileGroupInstance } from "@/types/map";
import { createSelector } from "@reduxjs/toolkit";

const createAppSelector = createSelector.withTypes<RootState>();

export const brokenTileGroups = createAppSelector(
  [
    (state) => state.mapEditor.objects.entities,
    (state) => state.tilesetEditor.tilesets,
    (state) => state.tilesetEditor.objIdToTs,
  ],
  (mapObjs, tilesets, objIdToTs) => {
    const broken: TileGroupInstance[] = [];

    for (const obj of Object.values(mapObjs)) {
      if (isTileGroupInstance(obj)) {
        const ts = tilesets[objIdToTs[obj.tsObjId]];
        if (!ts) {
          broken.push(obj);
          continue;
        }
        const tg = ts.tiles.entities[obj.tsObjId];
        if (!tg) {
          broken.push(obj);
          continue;
        }
      }
    }

    return broken;
  },
);
