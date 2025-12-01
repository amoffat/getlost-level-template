import { selectors } from "@/slices/tilesetEditor";
import * as P from "pixi.js";
import { TileGroupTemplate } from "../../types/tilegroup";
import { subState } from "../../utils/redux";
import { drawGrid } from "../common/grid";
import { globals as g } from "./globals";
import { shouldOutline } from "./utils/outline";

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
    mask
      .rect(group.pos.x, group.pos.y, group.pos.width, group.pos.height)
      .fill({ color: 0x000000, alpha: 1 });
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
    [selectors.activeTileset, (state) => state.tilesetEditor.grid.size],
    (ts, gridSize: number | null, state) => {
      if (ts === null) {
        g.grid?.removeFromParent();
        clearGridMask();
      } else {
        if (ts.composite) {
          gridSize = null;
        }
        g.grid = drawGrid({
          gridSize,
          oldGrid: g.grid,
          gridContainer: g.tilesetContainer,
          coverSize: {
            x: g.currentTileset!.width,
            y: g.currentTileset!.height,
          },
        });
        const groups = selectors.activeTilesetGroups(state);
        drawGridMask(groups);
      }
    }
  );
}
