import type { Rect } from "@/types/rect";
import type { BBox } from "rbush";

export function rectToBBox(rect: Rect, innerPadding: number = 0): BBox {
  return {
    minX: rect.x + innerPadding,
    minY: rect.y + innerPadding,
    maxX: rect.x + rect.width - innerPadding,
    maxY: rect.y + rect.height - innerPadding,
  };
}
