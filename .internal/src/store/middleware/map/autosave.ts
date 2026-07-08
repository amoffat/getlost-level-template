import { autosaveMapDebounce, defaultTileSize } from "@/constants";
import { globals } from "@/globals";
import { log } from "@/log";
import { saveMap as persistMap } from "@/persist/map/api";
import { slice } from "@/slices/mapEditor";
import { isMapObjFromTileset, MapObj, SavedMap } from "@/types/map";
import { AppStartListening } from "@/types/redux";
import { createListenerMiddleware } from "@reduxjs/toolkit";
import { EMPTY, Subject, from } from "rxjs";
import { catchError, concatMap, debounceTime, tap } from "rxjs/operators";

const listenerMiddleware = createListenerMiddleware();

// Stream of save requests for the single map
const saveRequests$ = new Subject<{ map: SavedMap }>();

saveRequests$
  .pipe(
    debounceTime(autosaveMapDebounce), // collapse rapid bursts of actions
    concatMap(({ map }) =>
      from(persistMap(map)).pipe(
        tap(() => {
          // If a future 'markSaved' action is added to the map slice, dispatch it here.
        }),
        catchError((e) => {
          log.error({ e }, "Map autosave failed");
          return EMPTY;
        }),
      ),
    ),
  )
  .subscribe();

/**
 * Editor state no longer stores a `tilesetId` on tileset-backed map objects —
 * we resolve it dynamically via `objIdToTs[tsObjId]` so an object's image data
 * can re-bind to a different tileset (e.g. when tilesets are deleted/recreated).
 * The engine, however, expects each tileset-backed object to carry a
 * `tilesetId` for fast tileset lookups, so we stamp it on here at save time.
 */
function withEngineTilesetIds(
  objects: SavedMap["objects"],
  objIdToTs: Record<string, string>,
): SavedMap["objects"] {
  const entities: Record<string, MapObj & { tilesetId?: string }> = {};
  for (const id of objects.ids) {
    const obj = objects.entities[id];
    if (!obj) continue;
    entities[id] = isMapObjFromTileset(obj)
      ? { ...obj, tilesetId: objIdToTs[obj.tsObjId] }
      : obj;
  }
  return { ids: objects.ids, entities };
}

const startAppListening =
  listenerMiddleware.startListening as AppStartListening;

startAppListening({
  // Any action with a reconcileType
  predicate: (action) =>
    action.type.startsWith(slice.name) &&
    (action.meta as any)?.reconcileType !== undefined &&
    globals.autosaveMap,
  effect: async (_action, { getState }) => {
    const state = getState();
    const ms = state.mapEditor;

    const map: SavedMap = {
      tileWidth: defaultTileSize,
      tileHeight: defaultTileSize,
      objects: withEngineTilesetIds(ms.objects, state.tilesetEditor.objIdToTs),
      templates: ms.templates,
      bounds: ms.bounds,
      card: ms.card,
    } satisfies SavedMap;

    saveRequests$.next({ map });
  },
});

export default listenerMiddleware.middleware;
