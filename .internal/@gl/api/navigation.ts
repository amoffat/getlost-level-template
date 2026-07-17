import { type Vector2 } from "@gl/types/api/vector";
import { Waypoint } from "@gl/types/api/waypoint";

/**
 * Sentinel resolved by {@link findPath} when a request is superseded (debounced)
 * by a newer request sharing the same `id`. The trailing request in the burst
 * delivers the real path, so a debounced result should be treated as "not mine"
 * — bail rather than act on it. Distinct from `null`, which strictly means
 * "no path found".
 */
export const PATH_DEBOUNCED = "path:debounced" as const;
export type PathDebounced = typeof PATH_DEBOUNCED;

export declare function getWaypointById(id: string): Waypoint | undefined;
export declare function getWaypointByName(name: string): Waypoint | undefined;
export declare function findPath({
  id,
  graphicsKey,
  startPos,
  endPos,
  nearestIsOk,
  max,
}: {
  id?: string;
  graphicsKey?: string;
  startPos: Vector2;
  endPos: Vector2;
  nearestIsOk: boolean;
  max?: number | undefined;
}): Promise<Vector2[] | null | PathDebounced>;
export declare function clearPath(graphicsKey: string): void;
