import { Tileset } from "@/types/tileset";

export type TilesetDocV1 = {
  version: 1;
  tileset: Tileset;
  imageData: Uint8Array;
};
