import { actions } from "@/slices/mapEditor";
import { store } from "@/store/store";

export function setupKeys(canvas: HTMLCanvasElement) {
  canvas.addEventListener("keydown", (e) => {
    if (e.repeat) return;
    if (e.key === "Control") {
      store.dispatch(actions.setGridSnap(false));
    }
  });

  canvas.addEventListener("keyup", (e) => {
    if (e.key === "Control") {
      store.dispatch(actions.setGridSnap(true));
    }
  });
}
