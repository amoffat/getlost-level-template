import { selectors } from "@/slices/tilesetEditor";
import * as P from "pixi.js";
import { store } from "../../store/store";
import { TileGroup } from "../../types/tilegroup";
import { subscribeToSelector } from "../../utils/redux";
import { globals as g } from "./globals";

let mask: P.Graphics | null = null;

export function drawGrid(gridSize: number) {
  g.grid?.removeFromParent();

  const container = new P.Container();
  g.grid = container;

  const gfx = new P.Graphics();

  // Capture dimensions before adding the graphics to avoid affecting container bounds
  const w = Math.ceil(g.currentTileset!.width);
  const h = Math.ceil(g.currentTileset!.height);

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
  const gridStroke: P.StrokeInput = {
    color: 0x000000,
    width: 1,
    alpha: 0.3,
    pixelLine: true,
  };
  gfx.stroke(gridStroke);

  container.addChild(gfx);
  g.tilesetContainer.addChild(container);

  const groups = selectors.activeTilesetGroups(store.getState());
  drawGridMask(groups);
}

function drawGridMask(groups: TileGroup[]) {
  mask?.removeFromParent();

  mask = new P.Graphics();
  g.grid.addChild(mask);

  mask.fill({ color: 0x000000, alpha: 0 });
  for (const group of groups.filter((g) => !g.singleTile)) {
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

subscribeToSelector(selectors.activeTilesetGroups, (groups) => {
  if (!g.grid) return;
  if (!groups) return;
  drawGridMask(groups);
});
subscribeToSelector(
  (state) => state.tilesetEditor.activeTilesetId,
  (_, state) => {
    const gridSize = state.tilesetEditor.grid.size;
    drawGrid(gridSize);
  }
);
