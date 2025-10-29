import { Rectangle } from "pixi.js";
import { Vector } from "../vec";

export interface Rect {
  ul: Vector;
  br: Vector;
}

export function area(rect: Rect): number {
  const width = rect.br.x - rect.ul.x;
  const height = rect.br.y - rect.ul.y;
  return width * height;
}

export function toPixiRect(rect: Rect): Rectangle {
  return new Rectangle(
    rect.ul.x,
    rect.ul.y,
    rect.br.x - rect.ul.x,
    rect.br.y - rect.ul.y
  );
}
