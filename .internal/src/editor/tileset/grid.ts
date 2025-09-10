import * as P from "pixi.js";
import { subscribeToSelector } from "../../utils/redux";
import { globals as g } from "./globals";

let container: P.Container | null = null;
let mask: P.Graphics | null = null;

export function drawGrid(gridSize: number): P.Container {
  container = new P.Container();

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

  return container;
}

subscribeToSelector(
  (state) => state.tilesetEditor.groups,
  (groups) => {
    mask = new P.Graphics();
    mask?.removeFromParent();
    container?.addChild(mask);

    mask.fill({ color: 0x000000, alpha: 0 });
    for (const group of groups) {
      mask
        .rect(
          group.ul.x,
          group.ul.y,
          group.br.x - group.ul.x,
          group.br.y - group.ul.y
        )
        .fill({ color: 0x000000, alpha: 1 });
    }

    container?.setMask({
      mask,
      inverse: true,
    });
  }
);
