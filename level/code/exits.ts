import { Exit } from "@gl/types/exit";

/**
 * This function returns an array of exits that are used in your level. Using
 * `host.map.exit()`, you can use these exits to send the player to another
 * level.
 */
export function exits(): Exit[] {
  return [
    {
      name: "east",
    },
    {
      name: "west",
    },
    {
      name: "south",
    },
    {
      name: "well",
    },
    {
      name: "death",
    },
  ];
}
