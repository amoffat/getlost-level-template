import { Vector } from "@/vec";
import * as P from "pixi.js";

export function setupPanControls({
  stage,
  panContainer,
  onPanningStart,
  onPanningEnd,
}: {
  stage: P.Container;
  panContainer: P.Container;
  onPanningStart?: VoidFunction;
  onPanningEnd?: (panPos: Vector) => void;
}) {
  // Panning state
  let panStartGlobal = { x: 0, y: 0 };
  let panStartContainer = { x: 0, y: 0 };
  let panning = false;

  stage.on("pointerdown", (e: P.FederatedPointerEvent) => {
    if (e.button !== 2) return;

    panStartGlobal = { x: e.global.x, y: e.global.y };
    panStartContainer = {
      x: panContainer.position.x,
      y: panContainer.position.y,
    };
    panning = true;
    onPanningStart?.();
  });

  stage.on("pointermove", (e: P.FederatedPointerEvent) => {
    if (!panning) return;
    const dx = e.global.x - panStartGlobal.x;
    const dy = e.global.y - panStartGlobal.y;
    const pos = {
      x: panStartContainer.x + dx,
      y: panStartContainer.y + dy,
    };
    panContainer.position.set(pos.x, pos.y);
  });

  const endPan = (_e: P.FederatedPointerEvent) => {
    if (!panning) return;
    panning = false;

    const panPos = {
      x: panContainer.position.x,
      y: panContainer.position.y,
    };
    onPanningEnd?.(panPos);
  };

  stage.on("pointerup", endPan);
  stage.on("pointerupoutside", endPan);
  stage.on("pointercancel", endPan);
}
