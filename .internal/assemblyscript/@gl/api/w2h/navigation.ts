import { Vector } from "../types/vector";
import { Waypoint } from "../types/waypoint";

export declare function getWaypoint(name: string): Waypoint;
export declare function findPath(
  key: string,
  startPos: Vector,
  endPos: Vector
): Vector[];
export declare function clearPath(key: string): void;

export const _keep_getWaypoint = getWaypoint;
export const _keep_findPath = findPath;
export const _keep_clearPath = clearPath;
