import * as P from "pixi.js";
import * as constants from "./constants";
import { globals as g } from "./globals";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function setupWheelZoom() {
  // Use Pixi's federated wheel events on the stage
  g.app.stage.on("wheel", (e: P.FederatedWheelEvent) => {
    // Prevent page scroll to make zoom feel native
    // e.preventDefault();

    // Determine zoom direction and amount using convenience deltaY
    const zoomFactor = e.deltaY < 0 ? 1.1 : 1 / 1.1;

    // Pointer position in global (world) coords provided by Pixi
    const global = e.global; // { x, y }

    // Convert the pointer position to the container's local coords BEFORE scaling
    const beforeLocal = g.tilesetContainer.toLocal(global);

    // Apply clamped uniform scaling
    const current = g.tilesetContainer.scale.x || 1;
    const next = clamp(
      current * zoomFactor,
      constants.MIN_ZOOM,
      constants.MAX_ZOOM
    );
    g.tilesetContainer.scale.set(next);

    // Compute where that same local point is AFTER scaling in global coords
    const afterGlobal = g.tilesetContainer.toGlobal(beforeLocal);

    // Translate so the zoom centers around the pointer
    g.tilesetContainer.position.x += global.x - afterGlobal.x;
    g.tilesetContainer.position.y += global.y - afterGlobal.y;
  });
}
