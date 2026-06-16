import { clamp } from "@/utils/math";
import * as P from "pixi.js";
import { ZoomPan } from "../../types/zoompan";
import { trackKeyPresses } from "@/utils/keypress";

export function setupWheelZoom({
  canvas,
  stage,
  container,
  minZoom = 0.125,
  maxZoom = 16,
  onZoomChange,
}: {
  canvas: HTMLCanvasElement;
  stage: P.Container;
  container: P.Container;
  minZoom?: number;
  maxZoom?: number;
  onZoomChange?: (zoomPan: ZoomPan) => void;
}) {
  const pressedKeys: Record<string, boolean> = {};
  trackKeyPresses({
    element: canvas,
    pressedKeys,
  });

  canvas.addEventListener("wheel", (e) => {
    // Prevent the whole page from scrolling
    e.preventDefault();
  });

  // Use Pixi's federated wheel events on the stage
  stage.on("wheel", (e: P.FederatedWheelEvent) => {
    if (pressedKeys["Control"]) return;

    // Determine zoom direction and amount using convenience deltaY
    const zoomFactor = e.deltaY < 0 ? 1.1 : 1 / 1.1;

    // Pointer position in global (world) coords provided by Pixi
    const global = e.global; // { x, y }

    // Convert the pointer position to the container's local coords BEFORE scaling
    const beforeLocal = container.toLocal(global);

    // Apply clamped uniform scaling
    const current = container.scale.x || 1;
    const next = clamp(current * zoomFactor, minZoom, maxZoom);
    container.scale.set(next);

    // Compute where that same local point is AFTER scaling in global coords
    const afterGlobal = container.toGlobal(beforeLocal);

    // Translate so the zoom centers around the pointer
    container.position.x += global.x - afterGlobal.x;
    container.position.y += global.y - afterGlobal.y;

    onZoomChange?.({
      zoom: next,
      pan: { x: container.position.x, y: container.position.y },
    });
  });
}
