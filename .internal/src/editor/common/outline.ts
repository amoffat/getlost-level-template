import { Rect } from "@/types/rect";
import * as P from "pixi.js";

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
