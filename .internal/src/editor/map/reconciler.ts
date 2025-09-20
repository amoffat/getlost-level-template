// pixiReconciler.ts
import { MapObj, TileObj } from "@/types/editor";
import { IndexItem, SpatialIndex } from "@/types/spatial";
import * as P from "pixi.js";

function isTileObj(obj: MapObj): obj is TileObj {
  return (obj as TileObj).tileId !== undefined;
}

// Create an RBush index item from a node's world-space bounds
function makeIndexItem(id: string, node: P.Container): IndexItem {
  const r = node.getLocalBounds();
  return {
    id,
    minX: r.minX + node.position.x,
    minY: r.minY + node.position.y,
    maxX: r.maxX + node.position.x,
    maxY: r.maxY + node.position.y,
  };
}

/**
 * A reconciler that applies changes from Redux to a Pixi.js scene graph.
 * It batches changes and applies them on the next animation frame.
 */
export class ReduxReconciler {
  private root: P.Container;
  private tilesetCache: Map<string, P.Texture>;
  // Axis-aligned bbox entry for RBush
  private spatialIndex: SpatialIndex;
  // Track the last indexed bbox per object id for fast remove/update
  private indexItems = new Map<string, IndexItem>();

  constructor({
    root,
    tilesetCache,
    spatialIndex,
  }: {
    root: P.Container;
    tilesetCache: Map<string, P.Texture>;
    spatialIndex: SpatialIndex;
  }) {
    this.root = root;
    this.tilesetCache = tilesetCache;
    this.spatialIndex = spatialIndex;
  }

  // id -> DisplayObject
  private nodes = new Map<string, P.Container>();

  // coalesced ops for this frame
  private pendingAdds: MapObj[] = [];
  private pendingUpdates: Array<{ id: string; changes: Partial<MapObj> }> = [];
  private pendingRemoves: string[] = [];
  private rafScheduled = false;

  enqueueAdd(obj: MapObj) {
    this.pendingAdds.push(obj);
    this.scheduleFlush();
  }
  enqueueUpdate(id: string, changes: Partial<MapObj>) {
    this.pendingUpdates.push({ id, changes });
    this.scheduleFlush();
  }
  enqueueRemove(id: string) {
    this.pendingRemoves.push(id);
    this.scheduleFlush();
  }

  // If you sometimes dispatch setAll, use this diffing helper:
  enqueueDiff(fullList: MapObj[]) {
    const nextIds = new Set(fullList.map((o) => o.id));
    for (const id of this.nodes.keys())
      if (!nextIds.has(id)) this.pendingRemoves.push(id);
    // add/upsert (cheap path: treat as upserts)
    for (const o of fullList) {
      if (this.nodes.has(o.id))
        this.pendingUpdates.push({ id: o.id, changes: o });
      else this.pendingAdds.push(o);
    }
    this.scheduleFlush();
  }

  private scheduleFlush() {
    if (this.rafScheduled) return;
    this.rafScheduled = true;
    requestAnimationFrame(() => {
      this.rafScheduled = false;
      this.flush();
    });
  }

  private flush() {
    // removes first so re-add in same frame won’t conflict
    for (const id of this.pendingRemoves) {
      const node = this.nodes.get(id);
      if (node) {
        // Remove from spatial index if present
        const prev = this.indexItems.get(id);
        if (prev) {
          this.spatialIndex.remove(prev, (a, b) => a.id === b.id);
          this.indexItems.delete(id);
        }
        node.destroy({ children: true });
        this.root.removeChild(node);
        this.nodes.delete(id);
      }
    }
    this.pendingRemoves.length = 0;

    for (const obj of this.pendingAdds) {
      const node = this.createNode(obj);
      this.nodes.set(obj.id, node);
      this.root.addChild(node);
      this.applyProps(node, obj); // position/angle/z, etc.

      // Index in spatial structure
      const item = makeIndexItem(obj.id, node);
      this.spatialIndex.insert(item);
      this.indexItems.set(obj.id, item);
    }
    this.pendingAdds.length = 0;

    for (const { id, changes } of this.pendingUpdates) {
      const node = this.nodes.get(id);
      if (!node) continue;
      // If position-affecting props are changing, update spatial index.
      const willAffectPos =
        "x" in changes || "y" in changes || "frame" in (changes as any);

      // Remove previous bbox before we mutate
      if (willAffectPos) {
        const prev = this.indexItems.get(id);
        if (prev) {
          this.spatialIndex.remove(prev, (a, b) => a.id === b.id);
          this.indexItems.delete(id);
        }
      }

      this.applyProps(node, changes);

      if (willAffectPos) {
        const nextItem = makeIndexItem(id, node);
        this.spatialIndex.insert(nextItem);
        this.indexItems.set(id, nextItem);
      }
    }
    this.pendingUpdates.length = 0;
  }

  private createNode(obj: MapObj): P.Container {
    if (isTileObj(obj)) {
      const tsTex = this.tilesetCache.get(obj.tilesetId);
      const frame = obj.frame;
      const texFrame = new P.Rectangle(
        frame.ul.x,
        frame.ul.y,
        frame.br.x - frame.ul.x,
        frame.br.y - frame.ul.y
      );
      const tileTex = new P.Texture({
        source: tsTex!.source,
        frame: texFrame,
      });
      const sprite = new P.Sprite(tileTex);
      sprite.position.set(obj.x, obj.y);
      sprite.zIndex = obj.y;
      sprite.interactive = true;
      sprite.label = obj.id;

      return sprite;
    } else {
      throw new Error("Unsupported MapObj type");
    }
  }

  private applyProps(node: P.Container, p: Partial<MapObj>) {
    if (p.x != null) node.x = p.x;
    if (p.y != null) {
      node.y = p.y;
      node.zIndex = p.y;
    }
  }
}
