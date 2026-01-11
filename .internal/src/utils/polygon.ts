import type { Vector2 } from "@/vec";

export type Triangle = {
  a: Vector2;
  b: Vector2;
  c: Vector2;
};

export type TrianglePolygon = Triangle[];
