import { actions, selectors } from "@/slices/mapEditor";
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
          store.dispatch(actions.setPlace(null));
          store.dispatch(actions.clearSelection());
        }

        store.dispatch(actions.setMode("select"));
      },
      Control: (pressed: boolean) => {
        store.dispatch(actions.setGridSnap(!pressed));
      },
    },
  });
}
