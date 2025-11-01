import { TilesetObject } from "./tilesetobject";

export interface PaletteObjectProps<ObjType extends TilesetObject> {
  obj: ObjType;
  scale: number;
  selected: boolean | undefined;
}
