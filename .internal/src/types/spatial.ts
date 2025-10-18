import { RootState, store } from "@/store/store";
import { isVector, Vector } from "@/vec";
import RBush, { BBox } from "rbush";
import { MapObj } from "./map";

export interface IndexItem {
  id: string;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export class SpatialIndex extends RBush<IndexItem> {
  private indexItems = new Map<string, IndexItem>();
  private selectById: (state: RootState, id: string) => MapObj | undefined;
  private filterLayer: (state: RootState, layer: number) => boolean;

  constructor({
    selectById,
    filterLayer,
  }: {
    selectById: (state: RootState, id: string) => MapObj | undefined;
    filterLayer: (state: RootState, layer: number) => boolean;
  }) {
    super();
    this.selectById = selectById;
    this.filterLayer = filterLayer;
  }

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

  public getObjects({ pos }: { pos: Vector | BBox }): MapObj[] {
    let firstPass: IndexItem[];
    if (isVector(pos)) {
      firstPass = this.searchByPos(pos);
    } else {
      firstPass = this.search(pos);
    }

    const state = store.getState();

    const objs = firstPass
      .map((it) => it.id)
      .map((hit) => this.selectById(state, hit))
      // This is because the removed objects (like from removeMany in place.ts)
      // get removed from the spatialIndex during reconciliation, which is *after*
      // the createEntityAdapter action removes it from the state. In other words,
      // the object might no longer exist in the state, but still temporarily
      // exist in the spatial index. It's temporary but we need to check for it.
      .filter((obj) => obj !== undefined)
      .filter((obj) => this.filterLayer(state, obj.layer))
      .sort((a, b) => b.z - a.z);
    return objs;
  }
}
