import { Exit } from "@gl/types/exit";

// This function returns an array of exits that are used in your level. You can
// only exit one of the options listed here.
export function exits(): Exit[] {
  return [
    {
      name: "main",
    },
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
  ];
}
