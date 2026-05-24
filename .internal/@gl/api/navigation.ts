import { type Vector2 } from "@gl/types/api/vector";
import { Waypoint } from "@gl/types/api/waypoint";

export declare function getWaypoint(id: string): Waypoint;
export declare function findPath(
  key: string,
  startPos: Vector2,
  endPos: Vector2,
  nearestIsOk: boolean,
  max: number,
): Promise<Vector2[]>;
export declare function clearPath(key: string): void;
