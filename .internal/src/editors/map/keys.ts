import { actions as mapEdActions, selectors } from "@/slices/mapEditor";
import { store } from "@/store/store";
import { duplicateSelectionThunk } from "@/thunks/map";
import { isTileGroupInstance } from "@/types/map";
import { trackKeyPresses } from "../common/keypress";

export const pressedKeys: Record<string, boolean> = {};

export function setupKeys(canvas: HTMLCanvasElement) {
  trackKeyPresses({
    element: canvas,
    pressedKeys,
    handlers: {
      Escape: (keydown: boolean) => {
        if (!keydown) return;

        const state = store.getState();
        const mode = selectors.selectMode(state);
        if (mode === "select") {
          store.dispatch(mapEdActions.clearSelection());
          store.dispatch(mapEdActions.setPlace(null));
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

        if (mode === "select") {
          const selection = state.mapEditor.selectedIds;
          store.dispatch(mapEdActions.clearSelection());
          store.dispatch(mapEdActions.removeMany(selection));
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

        if (mode === "select") {
          const updates = [];
          for (const obj of selectors.selectedObjs(state)) {
            if (isTileGroupInstance(obj)) {
              updates.push({ id: obj.id, changes: { flipX: !obj.flipX } });
            }
          }
          store.dispatch(mapEdActions.updateMany(updates));
        } else if (mode === "paint") {
          store.dispatch(mapEdActions.toggleFlipX());
        }
      },
    },
  });
}
