import { TileGroup } from "../types/tilegroup";

export type TilesetDocV1 = {
  version: 1;
  tsId: string; // stable id for the image, based on hash of the image
  filename: string; // e.g., "mytiles.png"
  groups: TileGroup[];
};
