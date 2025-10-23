import type { Rect } from "@/types/rect";
import type { BBox } from "rbush";

export function rectToBBox(rect: Rect): BBox {
  return {
    minX: rect.ul.x,
    minY: rect.ul.y,
    maxX: rect.br.x,
    maxY: rect.br.y,
  };
}
