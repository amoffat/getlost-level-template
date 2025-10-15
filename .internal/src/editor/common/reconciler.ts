// pixiReconciler.ts
import {
  isTileGroupInstance,
  MapObj,
  TileGroupInstance,
} from "@/types/reconciler";
import { IndexItem, SpatialIndex } from "@/types/spatial";
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

/**
 * A reconciler that applies changes from Redux to a Pixi.js scene graph.
 * It batches changes and applies them on the next animation frame.
 */
export class ReduxReconciler {
  private layerContainers?: Record<number, P.Container>;
  private tilesetCache: Map<string, P.Texture>;
  // Axis-aligned bbox entry for RBush
  private spatialIndex?: SpatialIndex;

  // id -> DisplayObject
  private nodes = new Map<string, P.Container>();
  // Object id -> layer container
  private layerLookup = new Map<string, P.Container>();

  // coalesced ops for this frame
  private pendingAdds: MapObj[] = [];
  private pendingUpdates: Array<{
    id: string;
    changes: Partial<MapObj & TileGroupInstance>;
  }> = [];
  private pendingRemoves: string[] = [];
  private rafScheduled = false;

  constructor(tilesetCache: Map<string, P.Texture>) {
    this.tilesetCache = tilesetCache;
  }

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
      this.applyProps(node, obj); // position/angle/z, etc.

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

  private createNode(obj: MapObj): P.Container {
    if (isTileGroupInstance(obj)) {
      const tsTex = this.tilesetCache.get(obj.tilesetId);
      const frame = obj.frame;

      const padding = 0.001; // avoid bleeding
      const width = frame.br.x - frame.ul.x;
      const height = frame.br.y - frame.ul.y;
      const texFrame = new P.Rectangle(
        frame.ul.x + padding,
        frame.ul.y + padding,
        width - 2 * padding,
        height - 2 * padding
      );
      const tileTex = new P.Texture({
        source: tsTex!.source,
        frame: texFrame,
      });

      // We apply the x-flip on the child sprite so that it can happen about the
      // center anchor, while the container can have its anchor at top-left for
      // easier positioning.
      const sprite = new P.Sprite(tileTex);
      sprite.position.set(
        sprite.width / 2 + padding,
        sprite.height / 2 + padding
      );
      sprite.interactive = false;
      sprite.anchor.set(0.5);
      sprite.scale.x = obj.flipX ? -1 : 1;

      const spriteContainer = new P.Container();
      spriteContainer.label = obj.id;
      spriteContainer.position.set(obj.x, obj.y);
      spriteContainer.zIndex = obj.z;
      spriteContainer.addChild(sprite);
      spriteContainer.interactive = true;
      spriteContainer.scale.set(1 + padding); // avoid bleeding

      return spriteContainer;
    } else {
      throw new Error("Unsupported MapObj type");
    }
  }

  private applyProps(
    node: P.Container,
    p: Partial<MapObj & TileGroupInstance>
  ) {
    if (!this.layerContainers || !this.spatialIndex) return;

    if (p.x !== undefined) node.x = p.x;
    if (p.y !== undefined) {
      node.y = p.y;
    }
    if (p.z !== undefined) node.zIndex = p.z;
    if (p.flipX !== undefined) {
      node.children[0].scale.x = p.flipX ? -1 : 1;
    }
    if (p.layer !== undefined) {
      const oldLayer = this.layerLookup.get(node.label)!;
      const newLayer = this.layerContainers[p.layer]!;
      if (oldLayer !== newLayer) {
        oldLayer.removeChild(node);
        newLayer.addChild(node);
        this.layerLookup.set(node.label, newLayer);
      }
    }
  }
}
