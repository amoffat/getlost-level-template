import { TilesetObjectTemplate } from "./tilesetobject";

export interface PaletteObjectProps<ObjType extends TilesetObjectTemplate> {
  obj: ObjType;
  scale: number;
  selected: boolean | undefined;
}
