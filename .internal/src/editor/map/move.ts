import { actions as mapActions, selectors as mapSelectors } from "@/slices/map";
import {
  actions as mapEdActions,
  selectors as mapEdSelectors,
} from "@/slices/mapEditor";
import { store } from "@/store/store";
import { Vec2, Vector } from "@/vec";
import { globals as g } from "./globals";

export function setupMover() {
  const stage = g.app.stage;
  let moveStart: Vec2 | null = null;

  stage.addEventListener("pointermove", (e) => {
    const state = store.getState();
    if (!moveStart) return;

    const snap = state.mapEditor.grid.snap;
    const gridSnap = g.gridSnap;

    const curPos = Vec2.fromPoint(e.getLocalPosition(g.mapContainer));
    const startOffset = curPos.subbed(moveStart);
    const sel = state.mapEditor.selectedObjs;
    const updates = [];
    for (const objId of sel.ids) {
      // It is technically wrong to use sel.entities here instead of
      // mapSelectors.selectById, because the position of `obj` is going to be
      // stale, since we're only updating the entities in the `map` slice. But
      // it works, because we're only using the starting position as a base
      // offset.
      //
      // To make the whole thing correct, we sync our selected object positions
      // on "pointerup"
      const obj = sel.entities[objId];
      const newPos: Vector = {
        x: Math.round(obj.x + startOffset.x),
        y: Math.round(obj.y + startOffset.y),
      };
      if (snap) {
        newPos.x = Math.floor(newPos.x / gridSnap) * gridSnap;
        newPos.y = Math.floor(newPos.y / gridSnap) * gridSnap;
      }
      updates.push({
        id: objId,
        changes: { x: newPos.x, y: newPos.y },
      });
    }
    store.dispatch(mapActions.updateMany(updates));
  });

  stage.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;

    const state = store.getState();
    const mode = mapEdSelectors.selectMode(state);
    if (mode !== "move") return;
    if (moveStart) return;

    const sel = state.mapEditor.selectedObjs;
    if (sel.ids.length === 0) return;

    moveStart = Vec2.fromPoint(e.getLocalPosition(g.mapContainer));
  });

  stage.addEventListener("pointerup", (e) => {
    if (!moveStart) return;
    if (e.button !== 0) return;
    moveStart = null;

    const state = store.getState();
    const sel = state.mapEditor.selectedObjs;

    // Here we're finalizing the positions of all selected objects, to ensure
    // that our selectedObjs.entities data is correct and in sync with the map
    // objects from the `map` slice.
    const updates = [];
    for (const objId of sel.ids) {
      const obj = mapSelectors.selectById(state, objId);
      updates.push({
        id: objId,
        changes: { x: obj.x, y: obj.y },
      });
    }
    store.dispatch(mapEdActions.updateManySelected(updates));
  });
}
