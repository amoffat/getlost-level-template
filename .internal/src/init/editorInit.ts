import { init as mapInit } from "@/editors/map/init";
import { init as tsInit } from "@/editors/tileset/init";
import { globals } from "@/globals";
import { store } from "@/store/store";
import { loadMapThunk } from "@/thunks/map";
import { loadStoryThunk } from "@/thunks/story";
import { loadTilesetsThunk } from "@/thunks/tileset";
import { log } from "../log";

// Module-level promises that persist across HMR
// These are initialized once and reused, preventing re-initialization on hot reload
let tilesetInitPromiseCache: Promise<void> | null = null;
let mapInitPromiseCache: Promise<void> | null = null;
let storyInitPromiseCache: Promise<void> | null = null;
let previewInitPromiseCache: Promise<void> | null = null;

export function getTilesetInitPromise() {
  if (!tilesetInitPromiseCache) {
    tilesetInitPromiseCache = (async () => {
      await store.dispatch(loadTilesetsThunk()).unwrap();
      await tsInit();
    })();
  }
  return tilesetInitPromiseCache;
}

export function getMapInitPromise() {
  if (!mapInitPromiseCache) {
    mapInitPromiseCache = (async () => {
      await getTilesetInitPromise();
      await mapInit();
      // This has to happen after the pixi app is initialized, because it
      // depends on the map reconciler existing.
      try {
        await store.dispatch(loadMapThunk()).unwrap();
      } catch (e) {
        log.error({ error: e }, "Failed to load map");
      }
    })();
  }
  return mapInitPromiseCache;
}

export async function getStoryInitPromise() {
  if (!storyInitPromiseCache) {
    storyInitPromiseCache = (async () => {
      await getMapInitPromise();
      await store.dispatch(loadStoryThunk()).unwrap();
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

/**
 * Destroys the tileset Pixi.js app and clears its init promise cache.
 * Called during HMR of the tileset editor to mimic a hard-refresh for the canvas.
 */
export function resetTilesetCanvasInit() {
  if (globals.tilesetEditorApp) {
    globals.tilesetEditorApp.destroy();
    globals.tilesetEditorApp = null;
  }
  tilesetInitPromiseCache = null;
}

/**
 * Destroys the map Pixi.js app and clears its init promise cache.
 * Called during HMR of the map editor to mimic a hard-refresh for the canvas.
 */
export function resetMapCanvasInit() {
  if (globals.mapEditorApp) {
    globals.mapEditorApp.destroy();
    globals.mapEditorApp = null;
  }
  mapInitPromiseCache = null;
}
