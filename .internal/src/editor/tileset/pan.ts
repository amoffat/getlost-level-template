import * as P from "pixi.js";
import { actions } from "../../slices/tilesetEditor";
import { store } from "../../store/store";
import { globals as g } from "./globals";

export function setupPanControls({
  stage,
  onPanningStart,
  onPanningEnd,
}: {
  stage: P.Container;
  onPanningStart?: VoidFunction;
  onPanningEnd?: VoidFunction;
}) {
  // Panning state
  let panStartGlobal = { x: 0, y: 0 };
  let panStartContainer = { x: 0, y: 0 };
  let panning = false;

  stage.on("pointerdown", (e: P.FederatedPointerEvent) => {
    // Only start panning on primary button (left click)
    if (e.button !== 0) return;
    e.preventDefault();
    panStartGlobal = { x: e.global.x, y: e.global.y };
    panStartContainer = {
      x: g.tilesetContainer.position.x,
      y: g.tilesetContainer.position.y,
    };
    panning = true;
    onPanningStart?.();
    store.dispatch(actions.setMode("pan"));
  });

  stage.on("pointermove", (e: P.FederatedPointerEvent) => {
    if (!panning) return;
    e.preventDefault();
    const dx = e.global.x - panStartGlobal.x;
    const dy = e.global.y - panStartGlobal.y;
    const pos = {
      x: panStartContainer.x + dx,
      y: panStartContainer.y + dy,
    };
    g.tilesetContainer.position.set(pos.x, pos.y);
  });

  const endPan = (e: P.FederatedPointerEvent) => {
    if (!panning) return;
    e.preventDefault();
    panning = false;
    onPanningEnd?.();

    const panPos = {
      x: g.tilesetContainer.position.x,
      y: g.tilesetContainer.position.y,
    };
    store.dispatch(actions.setPan(panPos));
    store.dispatch(actions.setMode(null));
  };

  stage.on("pointerup", endPan);
  stage.on("pointerupoutside", endPan);
  stage.on("pointercancel", endPan);
}
