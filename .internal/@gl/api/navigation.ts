import { type Vector2 } from "@gl/types/api/vector";
import { Waypoint } from "@gl/types/api/waypoint";

export declare function getWaypointById(id: string): Waypoint | undefined;
export declare function getWaypointByName(name: string): Waypoint | undefined;
export declare function findPath({
  graphicsKey,
  startPos,
  endPos,
  nearestIsOk,
  max,
}: {
  graphicsKey?: string;
  startPos: Vector2;
  endPos: Vector2;
  nearestIsOk: boolean;
  max?: number | undefined;
}): Promise<Vector2[]>;
export declare function clearPath(graphicsKey: string): void;
