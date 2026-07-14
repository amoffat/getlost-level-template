import { Vector2 } from "@/vec";
import * as P from "pixi.js";
import { gridBoundaryStroke, gridStroke } from "./strokes";

/** A world-space rectangle (min/max on each axis) for the grid to fill. */
export interface GridRegion {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function drawGrid({
  gridSize,
  imageSize,
  region,
  oldGrid,
  gridContainer,
}: {
  gridSize: Vector2 | null;
  /** The tileset image's pixel dimensions, used to detect boundary alignment. */
  imageSize: Vector2;
  /** World-space area to fill with grid lines (covers the transparent margin). */
  region: GridRegion;
  oldGrid?: P.Container;
  gridContainer: P.Container;
}): P.Container {
  oldGrid?.removeFromParent();

  const container = new P.Container();
  const gfx = new P.Graphics();

  if (gridSize === null) {
    // Composite tilesets have no innate grid; just outline the image extent.
    gfx.rect(0, 0, imageSize.x, imageSize.y);
    gfx.stroke(gridStroke);
    container.addChild(gfx);
    gridContainer.addChild(container);
    return container;
  }

  const { minX, minY, maxX, maxY } = region;

  // A grid line coincides with an image edge at x=0 / y=0 (always) and at
  // x=imageWidth / y=imageHeight only when the grid size divides the image
  // evenly. Those coincident lines are drawn green so it's obvious at a glance
  // when the grid size is a clean factor of the image.
  const greenXs = [0, ...(imageSize.x % gridSize.x === 0 ? [imageSize.x] : [])];
  const greenYs = [0, ...(imageSize.y % gridSize.y === 0 ? [imageSize.y] : [])];

  // Pass 1: the regular grid, spanning the whole visible region (including the
  // transparent margin around the image). Skip lines drawn green in pass 2.
  const firstX = Math.ceil(minX / gridSize.x) * gridSize.x;
  for (let x = firstX; x <= maxX; x += gridSize.x) {
    if (greenXs.includes(x)) continue;
    gfx.moveTo(x, minY);
    gfx.lineTo(x, maxY);
  }
  const firstY = Math.ceil(minY / gridSize.y) * gridSize.y;
  for (let y = firstY; y <= maxY; y += gridSize.y) {
    if (greenYs.includes(y)) continue;
    gfx.moveTo(minX, y);
    gfx.lineTo(maxX, y);
  }
  gfx.stroke(gridStroke);

  // Pass 2: green image-boundary lines, drawn on top and spanning the region.
  for (const x of greenXs) {
    if (x < minX || x > maxX) continue;
    gfx.moveTo(x, minY);
    gfx.lineTo(x, maxY);
  }
  for (const y of greenYs) {
    if (y < minY || y > maxY) continue;
    gfx.moveTo(minX, y);
    gfx.lineTo(maxX, y);
  }
  gfx.stroke(gridBoundaryStroke);

  container.addChild(gfx);
  gridContainer.addChild(container);

  return container;
}
