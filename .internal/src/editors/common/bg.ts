import * as P from "pixi.js";

export function makeCheckerboard({
  container,
  size = 16,
  width,
  height,
  blur = true,
}: {
  container: P.Container;
  size?: number;
  width: number;
  height: number;
  blur?: boolean;
}): P.Container {
  const canvas = new OffscreenCanvas(size * 2, size * 2);
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

  const pattern = new P.TilingSprite({
    texture: tex,
    width,
    height,
  });
  container.addChild(pattern);
  if (blur) {
    container.filters = [new P.BlurFilter({ strength: 4 })];
  }
  return pattern;
}

export function makeWarning({
  container,
  size = 16,
  width,
  height,
}: {
  container: P.Container;
  size?: number;
  width: number;
  height: number;
}): P.Container {
  const canvas = new OffscreenCanvas(size * 2, size * 2);
  const ctx = canvas.getContext("2d")!;

  // Colors for the warning pattern
  const c1 = "#000000"; // black
  const c2 = "#ffff00"; // yellow

  // Draw diagonal stripes
  ctx.fillStyle = c1;
  ctx.fillRect(0, 0, size * 2, size * 2);

  ctx.fillStyle = c2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(size * 2, 0);
  ctx.lineTo(0, size * 2);
  ctx.closePath();
  ctx.fill();

  const tex = P.Texture.from(canvas);

  const pattern = new P.TilingSprite({
    texture: tex,
    width,
    height,
  });
  container.addChild(pattern);
  return pattern;
}
