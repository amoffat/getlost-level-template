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
  size = 16,
  width,
  height,
}: {
  size?: number;
  width: number;
  height: number;
}): P.Container {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;

  // Colors for the warning pattern
  const c1 = "#000000"; // black
  const c2 = "#ffff00"; // yellow

  // Draw diagonal candy-cane stripes (2-pixel wide diagonal lines)
  // Draw pixel by pixel for crisp lines
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      const diagonal = x + y;
      const stripe = Math.floor(diagonal / 2) % 2;
      ctx.fillStyle = stripe === 0 ? c1 : c2;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  const tex = P.Texture.from(canvas);
  tex.source.scaleMode = "nearest";

  const pattern = new P.TilingSprite({
    texture: tex,
    width,
    height,
  });
  return pattern;
}
