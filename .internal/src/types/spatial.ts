import { RootState, store } from "@/store/store";
import { isVector, Vector2 } from "@/vec";
import RBush, { BBox } from "rbush";

export interface IndexItem {
  id: string;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

type LayerFilter = (params: {
  state: RootState;
  layer: number;
  hits: IndexItem[];
}) => boolean;

export class SpatialIndex<Obj> extends RBush<IndexItem> {
  private indexItems = new Map<string, IndexItem>();
  /**
   * Secondary tree holding "occurrence" rects: extra sheet positions where a
   * tile whose content-hash `id` already lives in the main tree also appears.
   * Content-hash ids collapse identical tiles into one entity/node/main-tree
   * bbox, so without this the duplicate copies would be invisible to every
   * hit-test. Populated wholesale via `setOccurrences`; the main tree
   * (insert/update/removeById) is unaware of it. Empty unless a caller opts in,
   * so consumers that never call `setOccurrences` (e.g. the map editor) are
   * unaffected.
   */
  private occurrenceTree = new RBush<IndexItem>();
  private occurrenceCount = 0;
  private selectById: (state: RootState, id: string) => Obj | undefined;
  private filterLayer: LayerFilter;

  constructor({
    selectById,
    filterLayer,
  }: {
    selectById: (state: RootState, id: string) => Obj | undefined;
    filterLayer: LayerFilter;
  }) {
    super();
    this.selectById = selectById;
    this.filterLayer = filterLayer;
  }

  public searchByPos(pos: Vector2): IndexItem[] {
    return this.search({
      minX: pos.x,
      minY: pos.y,
      maxX: pos.x,
      maxY: pos.y,
    });
  }

  /**
   * Search the main tree AND the occurrence tree. `searchByPos` and
   * `getObjects` both funnel through here, so every consumer transparently
   * hit-tests duplicate tile positions in addition to canonical ones.
   */
  public override search(bbox: BBox): IndexItem[] {
    const hits = super.search(bbox);
    if (this.occurrenceCount === 0) return hits;
    return hits.concat(this.occurrenceTree.search(bbox));
  }

  /**
   * Replace the set of occurrence rects (extra, non-canonical positions of
   * content-hash tiles). Each item carries the shared template `id` so hits
   * resolve back to the one entity via `selectById`.
   */
  public setOccurrences(items: IndexItem[]): void {
    this.occurrenceTree.clear();
    if (items.length > 0) this.occurrenceTree.load(items);
    this.occurrenceCount = items.length;
  }

  public removeById(id: string): void {
    const item = this.indexItems.get(id);
    if (item) {
      super.remove(item, (a, b) => a.id === b.id);
      this.indexItems.delete(id);
    }
  }

  public insert(item: IndexItem): SpatialIndex<Obj> {
    super.insert(item);
    this.indexItems.set(item.id, item);
    return this;
  }

  public update(item: IndexItem): SpatialIndex<Obj> {
    this.removeById(item.id);
    this.insert(item);
    return this;
  }

  public getObjects({
    pos,
    filterByLayer = true,
  }: {
    pos: Vector2 | BBox;
    filterByLayer?: boolean;
  }): Obj[] {
    let hits: IndexItem[];
    if (isVector(pos)) {
      hits = this.searchByPos(pos);
    } else {
      hits = this.search(pos);
    }
    if (hits.length === 0) return [];

    const state = store.getState();

    const objs = hits
      .map((it) => it.id)
      .map((hit) => this.selectById(state, hit))
      // This is because the removed objects (like from removeMany in place.ts)
      // get removed from the spatialIndex during reconciliation, which is *after*
      // the createEntityAdapter action removes it from the state. In other words,
      // the object might no longer exist in the state, but still temporarily
      // exist in the spatial index. It's temporary but we need to check for it.
      .filter((obj) => obj !== undefined)
      .filter(
        (obj) =>
          filterByLayer === false ||
          (obj as any).layer === undefined ||
          this.filterLayer({
            state,
            layer: (obj as any).layer,
            hits,
          }),
      )
      .sort((a, b) => ((a as any).z ?? 0) - ((b as any).z ?? 0));
    return objs;
  }
}
