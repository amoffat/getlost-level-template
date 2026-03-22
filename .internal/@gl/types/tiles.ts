import { Box } from "@gl/utils/box";

export interface Tile {
  gid: number;
  idx: number;
  collisionBox: Box | null;
}
