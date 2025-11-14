import { TilesetObjectTemplate } from "./tilesetobject";

export interface PaletteObjectProps<ObjType extends TilesetObjectTemplate> {
  obj: ObjType;
  scale: number;
  selected: boolean | undefined;
}

export type PaletteFilterName = "hideAnimations" | "hideNpcs";

export interface PaletteFilterSwitches {
  objects: {
    hideAnimations: boolean;
    hideNpcLeftovers: boolean;
    hideUnusedObjects: boolean;
    showOnlyTiles: boolean;
    showHiddenTilesets: boolean;
  };
  animations: {
    hideNpcs: boolean;
  };
  npcs: object;
}

export type PaletteTabName = keyof PaletteFilterSwitches;
