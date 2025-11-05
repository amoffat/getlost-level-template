import { Vector } from "@/vec";
import * as P from "pixi.js";

export function drawGrid({
  gridSize,
  oldGrid,
  gridContainer,
  coverSize,
}: {
  gridSize: number | null;
  oldGrid?: P.Container;
  gridContainer: P.Container;
  coverSize: Vector;
}): P.Container {
  oldGrid?.removeFromParent();

  const container = new P.Container();

  const gfx = new P.Graphics();

  // Capture dimensions before adding the graphics to avoid affecting container
  // bounds
  const w = coverSize.x;
  const h = coverSize.y;

  if (gridSize === null) {
    // Draw only the outline
    gfx.rect(0, 0, w, h);
  } else {
    // Vertical grid lines
    for (let x = 0; x < w; x += gridSize) {
      gfx.moveTo(x, 0);
      gfx.lineTo(x, h);
    }
    // Ensure the rightmost boundary line is drawn
    gfx.moveTo(w, 0);
    gfx.lineTo(w, h);

    // Horizontal grid lines
    for (let y = 0; y < h; y += gridSize) {
      gfx.moveTo(0, y);
      gfx.lineTo(w, y);
    }
    // Ensure the bottom boundary line is drawn
    gfx.moveTo(0, h);
    gfx.lineTo(w, h);
  }

  const gridStroke: P.StrokeInput = {
    color: 0x000000,
    width: 1,
    alpha: 0.3,
    pixelLine: true,
  };
  gfx.stroke(gridStroke);

  container.addChild(gfx);
  gridContainer.addChild(container);

  return container;
}
