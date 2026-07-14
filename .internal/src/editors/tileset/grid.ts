import { selectors } from "@/slices/tilesetEditor";
import { ZoomPan } from "@/types/zoompan";
import { Vector2 } from "@/vec";
import * as P from "pixi.js";
import { TileGroupTemplate } from "../../types/tilegroup";
import { subState } from "../../utils/redux";
import { drawGrid, GridRegion } from "../common/grid";
import { globals as g } from "./globals";
import { rectsForTemplate } from "./occurrences";
import { shouldOutline } from "./utils/outline";

/**
 * World-space rectangle to fill with grid lines: the current viewport expanded
 * by a one-screen margin on each side. The grid lives inside the pan/zoomed
 * `tilesetContainer`, so filling the viewport (rather than just the image)
 * draws lines across the transparent area around the tileset too. The margin
 * keeps the grid filled mid-gesture, since pan/zoom only commit to Redux when
 * the gesture ends.
 */
function computeGridRegion(
  zoomPan: ZoomPan,
  gridSize: Vector2 | null,
  imageSize: Vector2,
): GridRegion {
  const { zoom, pan } = zoomPan;
  const sw = g.app.screen.width;
  const sh = g.app.screen.height;

  // When zoomed out far enough that cells are sub-pixel, a viewport-filling
  // grid is meaningless (and would be thousands of lines), so fall back to
  // covering just the image.
  if (gridSize) {
    const cellPx = Math.min(gridSize.x, gridSize.y) * zoom;
    if (cellPx < 3) {
      return { minX: 0, minY: 0, maxX: imageSize.x, maxY: imageSize.y };
    }
  }

  // screen = world * zoom + pan  =>  world = (screen - pan) / zoom
  return {
    minX: (-sw - pan.x) / zoom,
    minY: (-sh - pan.y) / zoom,
    maxX: (2 * sw - pan.x) / zoom,
    maxY: (2 * sh - pan.y) / zoom,
  };
}

let mask: P.Graphics | null = null;

/**
 * Removes the grid wherever there's a tilegroup, so it's obvious where groups
 * are
 * @param groups The tilegroups
 */
function drawGridMask(groups: TileGroupTemplate[]) {
  clearGridMask();

  mask = new P.Graphics();
  g.grid.addChild(mask);

  mask.fill({ color: 0x000000, alpha: 0 });
  for (const group of groups.filter(shouldOutline)) {
    // Punch a hole at every sheet position of this template so identical tiles
    // all read as grouped (see occurrences.ts).
    for (const rect of rectsForTemplate(group)) {
      mask
        .rect(rect.x, rect.y, rect.width, rect.height)
        .fill({ color: 0x000000, alpha: 1 });
    }
  }

  g.grid.setMask({
    mask,
    inverse: true,
  });
}

function clearGridMask() {
  mask?.removeFromParent();
}

export function setupGrid() {
  subState([selectors.activeTilesetGroups], (groups) => {
    if (!g.grid) return;
    drawGridMask(groups);
  });

  subState(
    [
      selectors.activeTileset,
      (state) => state.tilesetEditor.grid.size,
      (state) => state.tilesetEditor.activeZoomPan,
      (state) => state.tilesetEditor.canvas,
    ],
    (ts, gridSize, zoomPan, _canvas, state) => {
      if (ts === null) {
        g.grid?.removeFromParent();
        clearGridMask();
        return;
      }

      const imageSize: Vector2 = {
        x: g.currentTileset!.width,
        y: g.currentTileset!.height,
      };
      // Composite tilesets have no innate grid size.
      const effectiveGridSize = ts.composite ? null : gridSize;

      g.grid = drawGrid({
        gridSize: effectiveGridSize,
        imageSize,
        region: computeGridRegion(zoomPan, effectiveGridSize, imageSize),
        oldGrid: g.grid,
        gridContainer: g.tilesetContainer,
      });
      const groups = selectors.activeTilesetGroups(state);
      drawGridMask(groups);
    }
  );
}
