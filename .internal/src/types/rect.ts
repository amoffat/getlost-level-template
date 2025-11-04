import { Rectangle } from "pixi.js";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function area(rect: Rect): number {
  return rect.width * rect.height;
}

export function toPixiRect(rect: Rect): Rectangle {
  return new Rectangle(rect.x, rect.y, rect.width, rect.height);
}
