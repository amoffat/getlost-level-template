import { store } from "@/store/store";
import { subState } from "@/utils/redux";
import { globals as g } from "./globals";

/**
 * Called on initial draw or when the screen size changes.
 */
export function drawBounds() {
  g.boundsContainer.clear();
  g.boundsContainer
    .rect(0, 0, g.app.stage.width, g.app.stage.height)
    .fill({ color: 0x000000, alpha: 0.5 });

  redrawBounds();
}

/**
 * Called when the bounds in the state change.
 */
export function redrawBounds() {
  const state = store.getState();
  const bounds = state.mapEditor.bounds;
  g.boundsMask.clear();

  g.boundsMask
    .rect(
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height
    )
    .fill({ color: 0x000000, alpha: 1 });
}

subState([(state) => state.mapEditor.bounds], (_bounds) => {
  redrawBounds();
});
