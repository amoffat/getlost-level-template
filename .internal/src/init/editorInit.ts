import { init as mapInit } from "@/editors/map/init";
import { init as tsInit } from "@/editors/tileset/init";
import { store } from "@/store/store";
import { loadMapThunk } from "@/thunks/map";
import { loadStoryThunk } from "@/thunks/story";
import { loadTilesetsThunk } from "@/thunks/tileset";
import { log } from "../log";

// Module-level promises that persist across HMR
// These are initialized once and reused, preventing re-initialization on hot reload
let tilesetInitPromiseCache: Promise<
  Awaited<ReturnType<typeof tsInit>>
> | null = null;
let mapInitPromiseCache: Promise<Awaited<ReturnType<typeof mapInit>>> | null =
  null;
let storyInitPromiseCache: Promise<void> | null = null;
let previewInitPromiseCache: Promise<void> | null = null;

export function getTilesetInitPromise() {
  if (!tilesetInitPromiseCache) {
    tilesetInitPromiseCache = (async () => {
      await store.dispatch(loadTilesetsThunk()).unwrap();
      const app = await tsInit();
      return app;
    })();
  }
  return tilesetInitPromiseCache;
}

export function getMapInitPromise() {
  if (!mapInitPromiseCache) {
    mapInitPromiseCache = (async () => {
      await getTilesetInitPromise();
      const app = await mapInit();
      // This has to happen after the pixi app is initialized, because it
      // depends on the map reconciler existing.
      try {
        await store.dispatch(loadMapThunk()).unwrap();
      } catch (e) {
        log.error({ error: e }, "Failed to load map");
      }
      return app;
    })();
  }
  return mapInitPromiseCache;
}

export async function getStoryInitPromise() {
  if (!storyInitPromiseCache) {
    storyInitPromiseCache = (async () => {
      await getMapInitPromise();
      await getPreviewInitPromise();
    })();
  }
  return storyInitPromiseCache;
}

export async function getPreviewInitPromise() {
  if (!previewInitPromiseCache) {
    previewInitPromiseCache = (async () => {
      await store.dispatch(loadStoryThunk()).unwrap();
    })();
  }
  return previewInitPromiseCache;
}

// Export reset functions for when we actually want to reinitialize (e.g., map reset)
export function resetInitPromises() {
  tilesetInitPromiseCache = null;
  mapInitPromiseCache = null;
  storyInitPromiseCache = null;
}
