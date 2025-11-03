import { selectors } from "@/slices/tilesetEditor";
import * as P from "pixi.js";
import { store } from "../../store/store";
import { TileGroupTemplate } from "../../types/tilegroup";
import { subState } from "../../utils/redux";
import { drawGrid } from "../common/grid";
import { globals as g } from "./globals";
import { shouldOutline } from "./utils/outline";

let mask: P.Graphics | null = null;

export function drawGridMask(groups: TileGroupTemplate[]) {
  mask?.removeFromParent();

  mask = new P.Graphics();
  g.grid.addChild(mask);

  mask.fill({ color: 0x000000, alpha: 0 });
  for (const group of groups.filter(shouldOutline)) {
    mask
      .rect(
        group.pos.ul.x,
        group.pos.ul.y,
        group.pos.br.x - group.pos.ul.x,
        group.pos.br.y - group.pos.ul.y
      )
      .fill({ color: 0x000000, alpha: 1 });
  }

  g.grid.setMask({
    mask,
    inverse: true,
  });
}

subState([selectors.activeTilesetGroups], (groups) => {
  if (!g.grid) return;
  drawGridMask(groups);
});

subState([(state) => state.tilesetEditor.activeTilesetId], (_, state) => {
  const gridSize = state.tilesetEditor.grid.size;
  const size = {
    x: g.currentTileset!.width,
    y: g.currentTileset!.height,
  };
  g.grid = drawGrid({
    gridSize,
    oldGrid: g.grid,
    gridContainer: g.tilesetContainer,
    coverSize: size,
  });
  const groups = selectors.activeTilesetGroups(store.getState());
  drawGridMask(groups);
});
