import { CollisionResult } from "../../types/collision";
import { Tuple2 } from "../../types/tuple";
import { Box } from "../box";
import { Vec2 } from "../la/vec2";
import { Polygon } from "../polygon";

export function aabbCollision(box1: Box, box2: Box): bool {
  const pos1 = box1.upperLeft;
  const size1 = box1.size;

  const pos2 = box2.upperLeft;
  const size2 = box2.size;

  // Check for overlap along x-axis
  let overlapX: bool = pos1.x < pos2.x + size2.x && pos1.x + size1.x > pos2.x;

  // Check for overlap along y-axis
  let overlapY: bool = pos1.y < pos2.y + size2.y && pos1.y + size1.y > pos2.y;

  // If both axes overlap, return true (collision detected)
  return overlapX && overlapY;
}

function projectPolygon(polygon: Polygon, axis: Vec2): Tuple2<f32, f32> {
  let min = polygon.vertices[0].dot(axis);
  let max = min;

  for (let i = 1; i < polygon.vertices.length; i++) {
    let projection = polygon.vertices[i].dot(axis);
    if (projection < min) {
      min = projection;
    } else if (projection > max) {
      max = projection;
    }
  }

  return new Tuple2(min, max);
}

function overlap(proj1: Tuple2<f32, f32>, proj2: Tuple2<f32, f32>): boolean {
  return proj1.second >= proj2.first && proj2.second >= proj1.first;
}

export function polygonCollision(
  polygon1: Polygon,
  polygon2: Polygon
): CollisionResult {
  const edges: Vec2[] = [];
  let minOverlap = Infinity;
  let collisionNormal: Vec2 | null = null;

  // Gather all edges of both polygons
  for (let i = 0; i < polygon1.vertices.length; i++) {
    let next = (i + 1) % polygon1.vertices.length;
    edges.push(polygon1.vertices[next].subbed(polygon1.vertices[i]));
  }

  for (let i = 0; i < polygon2.vertices.length; i++) {
    let next = (i + 1) % polygon2.vertices.length;
    edges.push(polygon2.vertices[next].subbed(polygon2.vertices[i]));
  }

  // Check projections on each edge's perpendicular axis
  for (let i = 0; i < edges.length; i++) {
    let edge = edges[i];
    let axis = edge.perp();

    // Project both polygons onto the axis
    let proj1 = projectPolygon(polygon1, axis);
    let proj2 = projectPolygon(polygon2, axis);

    // If projections don't overlap, there's no collision
    if (!overlap(proj1, proj2)) {
      return new CollisionResult();
    }

    // Calculate overlap depth (how much projections overlap)
    let overlapDepth =
      Math.min(proj1.second, proj2.second) - Math.max(proj1.first, proj2.first);

    // Find the smallest overlap to get the MTV
    if (overlapDepth < minOverlap) {
      minOverlap = overlapDepth;
      collisionNormal = axis.normalized();
    }
  }

  // If no separating axis was found, there is a collision
  if (collisionNormal !== null) {
    // // Calculate the perpendicular component of velocity using the collision normal
    // let dotProduct = velocity.dot(collisionNormal);
    // let parallelComponent = collisionNormal.scaled(dotProduct); // Component in direction of collision normal
    // let perpendicularComponent = velocity.sub(parallelComponent); // Component perpendicular to collision normal

    // Return result with collision and adjusted perpendicular velocity
    return new CollisionResult(true, collisionNormal);
  }

  // Fallback, no collision
  return new CollisionResult();
}
