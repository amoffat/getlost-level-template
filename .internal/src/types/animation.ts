import { TileGroup } from "./tilegroup";

export type TileAnimationFrame = {
  tg: TileGroup;
  time: number; // ms to display this frame
};
