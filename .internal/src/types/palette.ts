import { TilesetObject } from "@/types/tilegroup";

export interface PaletteObjectProps {
  obj: TilesetObject;
  scale: number;
  selected: boolean | undefined;
  dimmed: boolean | undefined;
}
