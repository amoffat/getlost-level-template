import { Box } from "../utils/box";

export interface Tile {
  gid: number;
  idx: number;
  collisionBox: Box | null;
}
