import RBush from "rbush";

export interface IndexItem {
  id: string;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export class SpatialIndex extends RBush<IndexItem> {
  private indexItems = new Map<string, IndexItem>();

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
