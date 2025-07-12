import { Entrance, Exit } from "@gl/types/gateways";

/**
 * These are the entrances where players start in your level. The `exits` field
 * is used to connect this entrance to another level's exit. If `exits` is
 * empty, it means the player can start here randomly at game start, subject to
 * other requirements. Because `attachments` is an array, there can be multiple
 * ways to reach this entrance from other levels.
 *
 * Minimum of 1 entrance, max of 20 entrances. Minimum of 0 exits, max of 2
 * exits per entrance.
 */
export function entrances(): Entrance[] {
  return [
    {
      name: "main",
      exits: [],
    },
    {
      name: "east",
      exits: [],
    },
    {
      name: "south",
      exits: [],
    },
    {
      name: "well",
      exits: [],
    },
    {
      name: "water",
      exits: [],
    },
  ];
}

/**
 * These are the exits that the player can use to leave your level. By calling
 * `host.map.exit(exitName)`, you can send the player to another level. You
 * cannot choose where these exits lead, as that is determined by another
 * level's `entrances` function (see above). However, you can specify a
 * preferred attachment point. If the preferred attachment's entry decides to
 * attach to this exit, we will preserve it and not let it be overritten by
 * another attachment. This lets you have some control over how levels are
 * linked.
 *
 * Each entrance needs a physical placeholder object in the map with the same
 * name.
 *
 * The first exit in this list will be used if the player decides to skip the
 * level, so choose it wisely.
 *
 * Minimum of 2 exits, max of 20 exits.
 */
export function exits(): Exit[] {
  return [
    { name: "east", preferredEntrance: "" },
    { name: "west", preferredEntrance: "" },
    { name: "south", preferredEntrance: "" },
    { name: "well", preferredEntrance: "" },
    { name: "death", preferredEntrance: "" },
    { name: "water", preferredEntrance: "" },
  ];
}
