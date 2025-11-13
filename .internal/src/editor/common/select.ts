import { Rect } from "@/types/rect";
import * as P from "pixi.js";
import { selectStroke, tileSelectFill } from "./strokes";

/**
 * Draws a rectangle selection outline. Called frequently during drag.
 * @param rect Rectangle in map container space
 * @param zoom Current zoom level
 */
export function drawRectSelect({
  gfx,
  rect,
  zoom,
  stroke = selectStroke,
  fill = tileSelectFill,
}: {
  gfx: P.Graphics;
  rect: Rect;
  zoom: number;
  stroke?: P.StrokeStyle;
  fill?: P.FillStyle | null;
}) {
  gfx.clear();

  // This logic ensures that our rect select hitbox can go "negative" correctly
  const left = Math.min(rect.x, rect.x + rect.width);
  const top = Math.min(rect.y, rect.y + rect.height);
  const width = Math.abs(rect.width);
  const height = Math.abs(rect.height);

  gfx
    .rect(left, top, width, height)
    .stroke({ ...stroke, width: (stroke.width ?? 1) / zoom });

  if (fill) {
    gfx.fill(fill);
  }
}
