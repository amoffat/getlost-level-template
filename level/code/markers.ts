import { Marker } from "@gl/types/marker";

/**
 * Returns the markers that this level can grant to the player.
 */
export function markers(): Marker[] {
  return [
    {
      slug: "stole-fruit",
      description: "The player stole fruit from an unguarded market.",
    },
    {
      slug: "lied-about-stealing",
      description:
        "The player lied about stealing fruit from an unguarded market.",
    },
    {
      slug: "died-overheated",
      description: "The player died from overheating.",
    },
  ];
}
