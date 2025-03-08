import { Box } from "../utils/box";

export class Tile {
  gid: u32 = 0;
  idx: u32 = 0;
  collisionBox: Box | null = null;

  constructor() {}

  toString(): string {
    return `Tile(idx: ${this.idx}, gid: ${this.gid})`;
  }
}
