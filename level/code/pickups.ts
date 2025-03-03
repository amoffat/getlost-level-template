import { Pickup } from "@gl/types/pickup";

// This function returns an array of pickups that are used in your level. You'll
// reference the pickup in your code by the `slug` property.
export function pickups(): Pickup[] {
  return [
    {
      slug: "potion",
      name: "Sleeping potion",
      text: "A sturdy flask containing enough sleeping potion to put even a dragon under. The label says 'Property of Maester Mordred.'",
      uses: 3,
    },
  ];
}
