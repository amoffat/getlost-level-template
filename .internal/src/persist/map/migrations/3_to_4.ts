import { store } from "@/store/store";
import { isTileGroupInstance } from "@/types/map";
import { TileGroupTemplate } from "@/types/tilegroup";
import type { MapDocV3 } from "../schema";

export function migrate(doc: MapDocV3) {
  const state = store.getState();
  for (const obj of Object.values(doc.objects.entities)) {
    if (isTileGroupInstance(obj)) {
      const ts = state.tilesetEditor.tilesets[obj.tilesetId];
      const tsObj = ts.tiles.entities[obj.tsObjId];
      obj.imageId = (tsObj as TileGroupTemplate).imageId;
    }
  }
}
