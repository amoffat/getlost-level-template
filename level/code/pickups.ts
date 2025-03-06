import { Pickup } from "@gl/types/pickup";

// This function returns an array of pickups that are used in your level. You'll
// reference the pickup in your code by the `slug` property.
export function pickups(): Pickup[] {
  return [
    {
      slug: "map",
      name: "Dusty map",
      text: "A map of an unfamiliar place. There's a clear X marking something important.",
      uses: -1,
    },
  ];
}
