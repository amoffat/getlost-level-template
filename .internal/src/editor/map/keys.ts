import { actions as mapActions } from "@/slices/map";
import { actions as mapEdActions, selectors } from "@/slices/mapEditor";
import { store } from "@/store/store";
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
        if (mode === "select" || mode === "rect-select") {
          store.dispatch(mapEdActions.setPlace(null));
          store.dispatch(mapEdActions.clearSelection());
        }

        store.dispatch(mapEdActions.setMode("select"));
      },
      Control: (pressed: boolean) => {
        store.dispatch(mapEdActions.setGridSnap(!pressed));
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
    },
  });
}
