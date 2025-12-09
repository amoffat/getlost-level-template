import { type Vector } from "../types/vector";
import { Waypoint } from "../types/waypoint";

export declare function getWaypoint(name: string): Waypoint;
export declare function findPath(
  key: string,
  startPos: Vector,
  endPos: Vector,
  nearestIsOk: boolean,
  max: number
): Promise<Vector[]>;
export declare function clearPath(key: string): void;
