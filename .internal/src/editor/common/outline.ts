import { Rect } from "@/types/rect";
import * as P from "pixi.js";

export function drawOutline({
  container,
  frame,
  stroke,
  fill,
}: {
  container: P.Container;
  frame: Rect;
  stroke: P.StrokeInput;
  fill?: P.FillStyle;
}) {
  const width = frame.br.x - frame.ul.x;
  const height = frame.br.y - frame.ul.y;

  const gfx = new P.Graphics();
  gfx.rect(0, 0, width, height).stroke(stroke);
  if (fill) gfx.fill(fill);
  container.addChild(gfx);
}

export function drawMaskedOutline({
  container,
  frame,
  stroke,
}: {
  container: P.Container;
  frame: Rect;
  stroke: P.StrokeInput;
}) {
  const width = frame.br.x - frame.ul.x;
  const height = frame.br.y - frame.ul.y;

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
