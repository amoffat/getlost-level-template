import * as P from "pixi.js";

export function drawOutline({
  container,
  width,
  height,
  stroke,
  fill,
}: {
  container: P.Container;
  width: number;
  height: number;
  stroke: P.StrokeInput;
  fill?: P.FillStyle;
}) {
  const gfx = new P.Graphics();
  gfx.rect(0, 0, width, height).stroke(stroke);
  if (fill) gfx.fill(fill);
  container.addChild(gfx);
}

export function drawMaskedOutline({
  container,
  width,
  height,
  stroke,
}: {
  container: P.Container;
  width: number;
  height: number;
  stroke: P.StrokeInput;
}) {
  const mask = new P.Graphics();
  mask.rect(0, 0, width, height).fill(stroke);
  container.addChild(mask);

  const gfx = new P.Graphics();
  gfx.rect(0, 0, width, height).stroke(stroke);
  container.addChild(gfx);
  gfx.setMask({
    mask,
    inverse: true,
  });
}
