import { actions as mapActions } from "@/slices/map";
import { actions as mapEdActions, selectors } from "@/slices/mapEditor";
import { store } from "@/store/store";
import { duplicateSelectionThunk } from "@/thunks/map";
import { isTileGroupInstance } from "@/types/map";
import { trackKeyPresses } from "../common/keypress";

export const pressedKeys: Record<string, boolean> = {};

export function setupKeys(canvas: HTMLCanvasElement): Record<string, boolean> {
  return trackKeyPresses({
    element: canvas,
    pressedKeys,
    handlers: {
      Escape: (keydown: boolean) => {
        if (!keydown) return;

        const state = store.getState();
        const mode = selectors.selectMode(state);
        if (mode === "select" || mode === "rect-select") {
          store.dispatch(mapEdActions.setPlace(null));
          store.dispatch(mapEdActions.clearSelection());
        }

        store.dispatch(mapEdActions.setMode("select"));
      },
      Control: (pressed: boolean) => {
        store.dispatch(mapEdActions.setGridSnap(!pressed));
      },
      "Shift-D": (keydown: boolean) => {
        if (!keydown) return;
        store.dispatch(duplicateSelectionThunk());
      },
      Delete: (keydown: boolean) => {
        if (!keydown) return;

        const state = store.getState();
        const mode = selectors.selectMode(state);

        if (mode === "select" || mode === "rect-select") {
          const selection = state.mapEditor.selectedObjs.ids;
          store.dispatch(mapActions.removeMany(selection));
          store.dispatch(mapEdActions.clearSelection());
        }
      },
      g: (keydown: boolean) => {
        if (!keydown) return;
        store.dispatch(mapEdActions.setMode("move"));
      },
      x: (keydown: boolean) => {
        if (!keydown) return;
        const state = store.getState();
        const mode = selectors.selectMode(state);

        if (mode === "select" || mode === "rect-select") {
          const sel = state.mapEditor.selectedObjs;
          const updates = [];
          for (const obj of Object.values(sel.entities)) {
            if (isTileGroupInstance(obj)) {
              updates.push({ id: obj.id, changes: { flipX: !obj.flipX } });
            }
          }
          store.dispatch(mapEdActions.updateManySelected(updates));
          store.dispatch(mapActions.updateMany(updates));
        } else if (mode === "paint") {
          store.dispatch(mapEdActions.toggleFlipX());
        }
      },
    },
  });
}
