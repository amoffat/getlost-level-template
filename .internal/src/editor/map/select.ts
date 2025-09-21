import { selectors as mapSelectors } from "@/slices/map";
import { actions, selectors as mapEdSelectors } from "@/slices/mapEditor";
import { store } from "@/store/store";
import { isTileGroupInstance, TileGroupInstance } from "@/types/editor";
import { SpatialIndex } from "@/types/spatial";
import { subscribeToSelector } from "@/utils/redux";
import * as P from "pixi.js";
import { trackKeyPresses } from "../common/keypress";
import { drawMaskedOutline } from "../common/outline";
import { selectStroke } from "../common/strokes";
import { globals as g } from "./globals";

export function setupSelector(spatialIndex: SpatialIndex) {
  const stage = g.app.stage;
  const pressedKeys = trackKeyPresses();

  stage.addEventListener("pointerdown", (e) => {
    const state = store.getState();
    const mode = mapEdSelectors.selectMode(state);
    if (mode !== "select") return;
    if (e.button !== 0) return;

    const globalPos = { x: e.global.x, y: e.global.y };
    const pagePos = { x: e.pageX, y: e.pageY };
    const pos = g.mapContainer.toLocal(globalPos);
    const hits = spatialIndex
      .search({
        minX: pos.x,
        minY: pos.y,
        maxX: pos.x,
        maxY: pos.y,
      })
      .map((it) => it.id);

    const clickedObjects = hits
      .map((hit) => mapSelectors.selectById(state, hit))
      .filter((obj) => isTileGroupInstance(obj))
      .sort((a, b) => b.z - a.z);

    if (clickedObjects.length === 0) {
      const hasProposed = state.mapEditor.proposedSelection;
      if (hasProposed) {
        store.dispatch(actions.setProposedSelection(null));
      } else {
        store.dispatch(actions.clearSelection());
      }
    } else {
      store.dispatch(actions.setProposedSelection(null));
      if (clickedObjects.length === 1) {
        const obj = clickedObjects[0];
        const add = pressedKeys["Control"] ?? false;
        const action = add ? actions.addOneSelected : actions.setOneSelected;
        store.dispatch(action(obj));
      } else {
        store.dispatch(
          actions.setProposedSelection({
            objects: clickedObjects,
            pos: pagePos,
          })
        );
      }
    }
  });
}

export function outlineObjects(obs: TileGroupInstance[]) {
  clearObjectOutlines();

  for (const obj of obs) {
    const container = new P.Container();
    g.selectionOutlines.addChild(container);
    container.position.set(obj.x, obj.y);

    drawMaskedOutline({
      container,
      frame: obj.frame,
      stroke: selectStroke,
    });
  }
}

export function clearObjectOutlines() {
  g.selectionOutlines.removeChildren();
}

subscribeToSelector(
  (state) => state.mapEditor.selectedObjs,
  (selectedObjs) => {
    if (selectedObjs) {
      const objs = selectedObjs.ids.map((id) => selectedObjs.entities[id]);
      outlineObjects(objs);
    } else {
      clearObjectOutlines();
    }
  }
);
