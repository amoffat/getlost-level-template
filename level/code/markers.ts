import { Marker } from "@gl/types/marker";

/**
 * Returns the markers that this level can grant to the player.
 */
export function grantedMarkers(): Marker[] {
  return [
    {
      slug: "stole-fruit",
      description: "The player stole fruit from an unguarded market.",
    },
  ];
}

/**
 * Returns the markers that are used by your level.
 *
 * @returns The list of markers.
 */
export function usedMarkers(): Marker[] {
  return [
    {
      slug: "stole-fruit",
      description: "The player stole fruit from an unguarded market.",
    },
  ];
}
