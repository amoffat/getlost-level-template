import { IndexItem } from "@/types/spatial";
import { AllPropsLoose } from "@/types/union";
import * as P from "pixi.js";

// Create an RBush index item from a node's world-space bounds
export function makeIndexItem(id: string, node: P.Container): IndexItem {
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
}

/**
 * A reconciler that applies changes from Redux to a Pixi.js scene graph.
 * It batches changes and applies them on the next animation frame.
 */
export abstract class ReduxReconciler<
  ObjType extends CanvasPlacable,
  ObjParams extends Partial<ObjType> = AllPropsLoose<ObjType>,
> {
  // phantom type for subclasses
  protected readonly ObjParamsType!: ObjParams;

  // id -> DisplayObject
  private nodes = new Map<string, P.Container>();

  // coalesced ops for this frame
  private pendingAdds: ObjType[] = [];
  private pendingUpdates: Array<{
    id: string;
    changes: Partial<ObjType>;
  }> = [];
  private pendingRemoves: string[] = [];
  private rafScheduled = false;

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
    const nextIds = new Set(fullList.map(this.selectId));
    for (const id of this.nodes.keys()) {
      if (!nextIds.has(id)) {
        this.pendingRemoves.push(id);
      }
    }
    // add/upsert (cheap path: treat as upserts)
    for (const o of fullList) {
      if (this.nodes.has(this.selectId(o))) {
        this.pendingUpdates.push({ id: this.selectId(o), changes: o });
      } else {
        this.pendingAdds.push(o);
      }
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
    this.assertConnected();

    // removes first so re-add in same frame won’t conflict
    for (const id of this.pendingRemoves) {
      const node = this.nodes.get(id);
      if (node) {
        node.destroy({ children: true });
        const container = this.containerById(id);
        container.removeChild(node);
        this.removeById(id);
        this.nodes.delete(id);
      }
    }
    this.pendingRemoves.length = 0;

    for (const obj of this.pendingAdds) {
      const node = this.createNode(obj);
      if (!node) continue;

      this.nodes.set(this.selectId(obj), node);
      const container = this.containerByObj(obj);
      container.addChild(node);
      this.applyProps(node, obj);

      // Index in spatial structure
      const item = makeIndexItem(this.selectId(obj), node);
      this.insertItem(item);
    }
    this.pendingAdds.length = 0;

    for (const { id, changes } of this.pendingUpdates) {
      const node = this.nodes.get(id);
      if (!node) continue;

      this.applyProps(node, changes);
      this.updateItem(makeIndexItem(id, node), changes);
    }
    this.pendingUpdates.length = 0;
  }

  protected abstract createNode(obj: ObjType): P.Container | null;

  protected abstract applyProps(node: P.Container, p: Partial<ObjType>): void;

  protected abstract containerByObj(obj: ObjType): P.Container;

  protected abstract containerById(id: string): P.Container;

  protected abstract assertConnected(): void;

  protected removeById(_id: string): void {}

  protected insertItem(_item: IndexItem): void {}

  protected updateItem(_item: IndexItem, _changes: Partial<ObjType>): void {}

  protected selectId(obj: ObjType): string {
    return obj.id;
  }
}
