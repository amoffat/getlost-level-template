import { log } from "@/log";
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

  // id -> ObjType.
  // This is used primarily for recreating nodes when needed.
  private objs = new Map<string, ObjType>();

  // coalesced ops for this frame
  private pendingAdds: ObjType[] = [];
  private pendingUpdates: Array<{
    id: string;
    changes: Partial<ObjType>;
  }> = [];
  private pendingRemoves: Set<string> = new Set();
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
    this.pendingRemoves.add(id);
    this.scheduleFlush();
  }

  // If you sometimes dispatch setAll, use this diffing helper:
  enqueueDiff(fullList: ObjType[]) {
    const nextIds = new Set(fullList.map(this.selectId));
    for (const id of this.nodes.keys()) {
      if (!nextIds.has(id)) {
        this.pendingRemoves.add(id);
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

    for (const obj of this.pendingAdds) {
      const id = this.selectId(obj);

      // skip adds that were also removed this frame. This is commented out
      // because it was causing an issue where a TileGroup (in the tileset
      // editor) was being removed and re-added in the same frame, using the
      // replace tool, and the resulting add was being skipped. This code was
      // added for a specific reason though, but that reason is now lost to
      // time.
      //
      // if (this.pendingRemoves.has(id)) { continue;
      // }

      const node = this.createNode(obj);
      if (!node) continue;

      // Store a shallow copy to avoid keeping references to frozen Immer objects from Redux
      this.objs.set(id, { ...obj });

      this.applyProps({ node, props: obj });

      this.nodes.set(id, node);
      const container = this.containerByObj(obj);
      container.addChild(node);

      // Index in spatial structure
      const item = makeIndexItem(id, node);
      this.insertItem(item);
    }
    this.pendingAdds.length = 0;
    this.pendingRemoves.clear();

    for (const { id, changes } of this.pendingUpdates) {
      const node = this.nodes.get(id);
      if (!node) continue;

      const shouldRecreate = this.applyProps({
        node,
        props: changes,
      });

      const obj = this.objs.get(id);
      if (!obj) {
        log.error(`ReduxReconciler: no obj for id ${id}`);
        continue;
      }
      // Update stored obj with a new shallow copy
      const updatedObj = { ...obj, ...changes };
      this.objs.set(id, updatedObj);

      // Sometimes applying props requires recreating the node entirely, e.g.,
      // in the case of the tileset id changing. In those cases, swap out the
      // node by calling the remove and then add logic.
      if (shouldRecreate) {
        // Remove old node
        const container = this.containerById(id);
        container.removeChild(node);
        this.removeById(id);
        this.nodes.delete(id);

        // Create new node
        const newNode = this.createNode(updatedObj);
        if (!newNode) continue;

        // Apply all current props
        this.applyProps({ node: newNode, props: updatedObj });

        // Insert new node
        container.addChild(newNode);
        this.nodes.set(id, newNode);
        const item = makeIndexItem(id, newNode);
        this.insertItem(item);
      } else {
        this.updateItem(makeIndexItem(id, node), changes);
      }
    }
    this.pendingUpdates.length = 0;
  }

  protected abstract createNode(obj: ObjType): P.Container | null;

  protected abstract applyProps({
    node,
    props,
  }: {
    node: P.Container;
    props: Partial<ObjType>;
  }): boolean;

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
