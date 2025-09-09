import * as P from "pixi.js";
import { setMode } from "../../slices/tilesetEditor";
import { store } from "../../store";
import { globals as g } from "./globals";

// Panning state
let panStartGlobal = { x: 0, y: 0 };
let panStartContainer = { x: 0, y: 0 };

function isPanning(): boolean {
  return store.getState().tilesetEditor.mode === "pan";
}

export function setupPanControls() {
  g.app.stage.on("pointerdown", (e: P.FederatedPointerEvent) => {
    // Only start panning on primary button (left click)
    if (e.button !== 0) return;
    e.preventDefault();
    panStartGlobal = { x: e.global.x, y: e.global.y };
    panStartContainer = {
      x: g.tilesetContainer.position.x,
      y: g.tilesetContainer.position.y,
    };
    store.dispatch(setMode("pan"));
  });

  g.app.stage.on("pointermove", (e: P.FederatedPointerEvent) => {
    if (!isPanning()) return;
    e.preventDefault();
    const dx = e.global.x - panStartGlobal.x;
    const dy = e.global.y - panStartGlobal.y;
    g.tilesetContainer.position.set(
      panStartContainer.x + dx,
      panStartContainer.y + dy
    );
  });

  const endPan = (e: P.FederatedPointerEvent) => {
    if (!isPanning()) return;
    e.preventDefault();
    store.dispatch(setMode(null));
  };

  g.app.stage.on("pointerup", endPan);
  g.app.stage.on("pointerupoutside", endPan);
  g.app.stage.on("pointercancel", endPan);
}
