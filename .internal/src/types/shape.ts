import { Vec2 } from "@/vec";

/**
 * The result of a proximity query to a shape.
 */
export interface ShapeProximity {
  /**
   * The direction from the point to the nearest point on the shape. The
   * magnitude of the vector is the distance between the two points.
   */
  direction: Vec2;
  /**
   * Whether the point is inside the shape.
   */
  inside: boolean;
}
