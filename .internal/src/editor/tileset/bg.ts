import * as P from "pixi.js";
import { globals as g } from "./globals";

export function makeBackground(
  container: P.Container,
  size: number = 16
): P.Container {
  const canvas = document.createElement("canvas");
  canvas.width = size * 2;
  canvas.height = size * 2;
  const ctx = canvas.getContext("2d")!;

  // Colors for the checker pattern
  const c1 = "#bfbfbf"; // light gray
  const c2 = "#8f8f8f"; // darker gray

  // Draw 2x2 checkerboard
  ctx.fillStyle = c1;
  ctx.fillRect(0, 0, size * 2, size * 2);
  ctx.fillStyle = c2;
  ctx.fillRect(0, 0, size, size);
  ctx.fillRect(size, size, size, size);

  const tex = P.Texture.from(canvas);

  const checkerboard = new P.TilingSprite({
    texture: tex,
    width: g.app.screen.width,
    height: g.app.screen.height,
  });
  container.addChild(checkerboard);
  container.filters = [new P.BlurFilter({ strength: 4 })];
  return checkerboard;
}
