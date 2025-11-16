import { Vector2 } from "@/vec";
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

export function snap(rect: Rect, gridSize: Vector2): Rect {
  let left = rect.x;
  let top = rect.y;
  let right = rect.x + rect.width;
  let bottom = rect.y + rect.height;

  left = Math.floor(left / gridSize.x) * gridSize.x;
  top = Math.floor(top / gridSize.y) * gridSize.y;
  right = Math.ceil(right / gridSize.x) * gridSize.x;
  bottom = Math.ceil(bottom / gridSize.y) * gridSize.y;

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}
