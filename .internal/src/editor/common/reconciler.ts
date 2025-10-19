import { IndexItem, SpatialIndex } from "@/types/spatial";
import { AllPropsLoose } from "@/types/union";
import * as P from "pixi.js";

// Create an RBush index item from a node's world-space bounds
function makeIndexItem(id: string, node: P.Container): IndexItem {
  const r = node.getLocalBounds();
  const pos = node.position;
  return {
    id,
    minX: r.minX + pos.x,
    minY: r.minY + pos.y,
    maxX: r.maxX + pos.x,
    maxY: r.maxY + pos.y,
  };
}

interface CanvasPlacable {
  id: string;
  layer: number;
}

/**
 * A reconciler that applies changes from Redux to a Pixi.js scene graph.
 * It batches changes and applies them on the next animation frame.
 */
export abstract class ReduxReconciler<
  ObjType extends CanvasPlacable,
  ObjParams extends Partial<ObjType> = AllPropsLoose<ObjType>,
> {
  protected layerContainers?: Record<number, P.Container>;
  protected spatialIndex?: SpatialIndex;

  // id -> DisplayObject
  private nodes = new Map<string, P.Container>();
  // Object id -> layer container
  protected layerLookup = new Map<string, P.Container>();

  // coalesced ops for this frame
  private pendingAdds: ObjType[] = [];
  private pendingUpdates: Array<{
    id: string;
    changes: Partial<ObjType>;
  }> = [];
  private pendingRemoves: string[] = [];
  private rafScheduled = false;

  attachCanvas({
    layerContainers,
    spatialIndex,
  }: {
    layerContainers: Record<number, P.Container>;
    spatialIndex: SpatialIndex;
  }) {
    this.layerContainers = layerContainers;
    this.spatialIndex = spatialIndex;
  }

  enqueueAdd(obj: ObjType) {
    this.pendingAdds.push(obj);
    this.scheduleFlush();
  }
  enqueueUpdate(id: string, changes: ObjParams) {
    this.pendingUpdates.push({ id, changes });
    this.scheduleFlush();
  }
  enqueueRemove(id: string) {
    this.pendingRemoves.push(id);
    this.scheduleFlush();
  }

  // If you sometimes dispatch setAll, use this diffing helper:
  enqueueDiff(fullList: ObjType[]) {
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
    if (!this.layerContainers || !this.spatialIndex) return;

    // removes first so re-add in same frame won’t conflict
    for (const id of this.pendingRemoves) {
      const node = this.nodes.get(id);
      if (node) {
        this.spatialIndex.removeById(id);
        node.destroy({ children: true });
        const layer = this.layerLookup.get(id)!;
        this.layerLookup.delete(id);
        layer.removeChild(node);
        this.nodes.delete(id);
      }
    }
    this.pendingRemoves.length = 0;

    for (const obj of this.pendingAdds) {
      const node = this.createNode(obj);
      this.nodes.set(obj.id, node);
      const layer = this.layerContainers[obj.layer]!;
      this.layerLookup.set(obj.id, layer);
      layer.addChild(node);
      this.applyProps(node, obj);

      // Index in spatial structure
      const item = makeIndexItem(obj.id, node);
      this.spatialIndex.insert(item);
    }
    this.pendingAdds.length = 0;

    for (const { id, changes } of this.pendingUpdates) {
      const node = this.nodes.get(id);
      if (!node) continue;
      // If position-affecting props are changing, update spatial index.
      const willAffectPos =
        "x" in changes || "y" in changes || "frame" in (changes as any);

      this.applyProps(node, changes);

      if (willAffectPos) {
        const nextItem = makeIndexItem(id, node);
        this.spatialIndex.update(nextItem);
      }
    }
    this.pendingUpdates.length = 0;
  }

  protected abstract createNode(obj: ObjType): P.Container;

  protected abstract applyProps(node: P.Container, p: Partial<ObjType>): void;
}
