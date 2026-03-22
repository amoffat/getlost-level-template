import { type Vector } from "@gl/types/api/vector";
import { Waypoint } from "@gl/types/api/waypoint";

export declare function getWaypoint(name: string): Waypoint;
export declare function findPath(
  key: string,
  startPos: Vector,
  endPos: Vector,
  nearestIsOk: boolean,
  max: number,
): Promise<Vector[]>;
export declare function clearPath(key: string): void;
