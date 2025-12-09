import { Pickup } from "@gl/types/pickup";

// This function returns an array of pickups that are used in your level. You'll
// reference the pickup in your code by the `slug` property.
export function pickups(): Pickup[] {
  return [
    {
      key: "map",
      tags: ["map"],
    },
    {
      key: "flame",
      tags: ["fire", "magic"],
    },
    {
      key: "fruit",
      tags: ["food", "fruit"],
    },
  ];
}
