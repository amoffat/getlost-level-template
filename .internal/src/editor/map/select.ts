import { log } from "@/log";
import { selectors as mapSelectors } from "@/slices/map";
import { actions, selectors as mapEdSelectors } from "@/slices/mapEditor";
import { store } from "@/store/store";
import { SpatialIndex } from "@/types/spatial";
import { subscribeToSelector } from "@/utils/redux";
import { globals as g } from "./globals";

export function setupSelector(spatialIndex: SpatialIndex) {
  const stage = g.app.stage;

  stage.addEventListener("pointerdown", (e) => {
    const state = store.getState();
    const mode = mapEdSelectors.selectMode(state);
    if (mode !== "select") return;
    if (e.button !== 0) return;

    const pos = g.mapContainer.toLocal(e.global);
    const hits = spatialIndex
      .search({
        minX: pos.x,
        minY: pos.y,
        maxX: pos.x,
        maxY: pos.y,
      })
      .map((it) => it.id);

    if (hits.length === 0) {
      store.dispatch(actions.selectObj(null));
    } else {
      const selectedObjects = hits
        .map((hit) => mapSelectors.selectById(state, hit))
        .sort((a, b) => a.z - b.z)
        .map((it) => it.id);
      const set = new Set(selectedObjects);
      console.log(selectedObjects);
      store.dispatch(actions.selectObj(selectedObjects));
    }
  });
}

subscribeToSelector(
  (state) => state.mapEditor.selectedObjs,
  (selectedObjs) => {
    log.info({ selectedObjs }, "Selected objects");
  }
);
