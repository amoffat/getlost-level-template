// pixiReconciler.ts
import { MapObj, TileObj } from "@/types/editor";
import * as P from "pixi.js";

type DO = P.Container | P.Sprite;

function isTileObj(obj: MapObj): obj is TileObj {
  return (obj as TileObj).tileId !== undefined;
}

/**
 * A reconciler that applies changes from Redux to a Pixi.js scene graph.
 * It batches changes and applies them on the next animation frame.
 */
export class ReduxReconciler {
  private root: P.Container;
  private tilesetCache: Map<string, P.Texture>;

  constructor({
    root,
    tilesetCache,
  }: {
    root: P.Container;
    tilesetCache: Map<string, P.Texture>;
  }) {
    this.root = root;
    this.tilesetCache = tilesetCache;
  }

  // id -> DisplayObject
  private nodes = new Map<string, DO>();

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
    }
    this.pendingAdds.length = 0;

    for (const { id, changes } of this.pendingUpdates) {
      const node = this.nodes.get(id);
      if (!node) continue;
      this.applyProps(node, changes);
    }
    this.pendingUpdates.length = 0;
  }

  private createNode(obj: MapObj): DO {
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
      sprite.zIndex = obj.y + sprite.height;

      return sprite;
    } else {
      throw new Error("Unsupported MapObj type");
    }
  }

  private applyProps(node: DO, p: Partial<MapObj>) {
    if (p.x != null) node.x = p.x;
    if (p.y != null) node.y = p.y;
    // if (p.angle != null) (node as any).angle = p.angle;
    // if (p.z != null) (node as any).zIndex = p.z;
    // // If sprite can change:
    // if (p.sprite) {
    //   if (node instanceof P.Sprite) node.texture = P.Texture.from(p.sprite);
    // }
  }
}
