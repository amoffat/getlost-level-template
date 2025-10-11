import { selectors } from "@/slices/map";
import { store } from "@/store/store";
import { isVector, Vector } from "@/vec";
import RBush, { BBox } from "rbush";
import type { MapObj, TileGroupInstance } from "./editor";

export interface IndexItem {
  id: string;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export class SpatialIndex extends RBush<IndexItem> {
  private indexItems = new Map<string, IndexItem>();

  public searchByPos(pos: Vector): IndexItem[] {
    return this.search({
      minX: pos.x,
      minY: pos.y,
      maxX: pos.x,
      maxY: pos.y,
    });
  }

  public removeById(id: string): void {
    const item = this.indexItems.get(id);
    if (item) {
      super.remove(item, (a, b) => a.id === b.id);
      this.indexItems.delete(id);
    }
  }

  public insert(item: IndexItem): SpatialIndex {
    super.insert(item);
    this.indexItems.set(item.id, item);
    return this;
  }

  public update(item: IndexItem): SpatialIndex {
    this.removeById(item.id);
    this.insert(item);
    return this;
  }
}

export function getObjects({
  index,
  pos,
}: {
  index: SpatialIndex;
  pos: Vector | BBox;
}): (MapObj | TileGroupInstance)[] {
  const state = store.getState();
  const ms = state.mapEditor;

  let firstPass: IndexItem[];
  if (isVector(pos)) {
    firstPass = index.searchByPos(pos);
  } else {
    firstPass = index.search(pos);
  }

  const objs = firstPass
    .map((it) => it.id)
    .map((hit) => selectors.selectById(state, hit))
    // This is because the removed objects (like from removeMany in place.ts)
    // get removed from the spatialIndex during reconciliation, which is *after*
    // the createEntityAdapter action removes it from the state. In other words,
    // the object might no longer exist in the state, but still temporarily
    // exist in the spatial index. It's temporary but we need to check for it.
    .filter((obj) => obj !== undefined)
    .filter((obj) => !ms.layers.lockInactive || obj.layer === ms.layers.active)
    .sort((a, b) => b.z - a.z);
  return objs;
}
