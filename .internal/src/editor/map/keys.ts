import { actions } from "@/slices/mapEditor";
import { store } from "@/store/store";
import { trackKeyPresses } from "../common/keypress";

export const pressedKeys: Record<string, boolean> = {};

export function setupKeys(canvas: HTMLCanvasElement) {
  trackKeyPresses({
    element: canvas,
    pressedKeys,
    handlers: {
      Escape: () => {
        store.dispatch(actions.setMode("select"));
      },
      Control: (pressed: boolean) => {
        store.dispatch(actions.setGridSnap(!pressed));
      },
    },
  });
}
