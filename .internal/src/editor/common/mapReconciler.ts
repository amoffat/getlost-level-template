import {
  isAnimatedInstance,
  isColliderBox,
  isColliderEllipse,
  isTileGroupInstance,
  MapObj,
} from "@/types/map";
import { IndexItem, SpatialIndex } from "@/types/spatial";
import { notifications } from "@mantine/notifications";
import * as P from "pixi.js";
import { ReduxReconciler } from "./reconciler";
import { colliderFill } from "./strokes";

export class MapObjReconciler extends ReduxReconciler<MapObj> {
  private layerContainers?: Record<number, P.Container>;
  private tilesetCache: Map<string, P.Texture>;
  // Object id -> layer container
  private layerLookup = new Map<string, P.Container>();

  protected spatialIndex?: SpatialIndex<MapObj>;
  private connected = false;

  constructor(tilesetCache: Map<string, P.Texture>) {
    super();
    this.tilesetCache = tilesetCache;
  }

  public attachCanvas({
    layerContainers,
    spatialIndex,
  }: {
    layerContainers: Record<number, P.Container>;
    spatialIndex: SpatialIndex<MapObj>;
  }) {
    this.layerContainers = layerContainers;
    this.spatialIndex = spatialIndex;
    this.connected = true;
  }

  protected override assertConnected() {
    if (!this.connected) {
      throw new Error("MapObjReconciler operation called before attachCanvas");
    }
  }

  protected override containerByObj(obj: MapObj): P.Container {
    return this.layerContainers![obj.layer]!;
  }

  protected override containerById(id: string): P.Container {
    const layer = this.layerLookup.get(id)!;
    return layer;
  }

  protected override removeById(id: string): void {
    this.spatialIndex!.removeById(id);
    this.layerLookup.delete(id);
  }

  protected override insertItem(item: IndexItem): void {
    this.spatialIndex!.insert(item);
  }

  protected override updateItem(
    item: IndexItem,
    changes: ReduxReconciler<MapObj>["ObjParamsType"]
  ): void {
    // If position-affecting props are changing, update spatial index.
    const willAffectPos =
      "x" in changes || "y" in changes || "frame" in (changes as any);
    if (willAffectPos) {
      this.spatialIndex!.update(item);
    }
  }

  protected override applyProps(
    node: P.Container,
    p: ReduxReconciler<MapObj>["ObjParamsType"]
  ) {
    if (!this.layerContainers || !this.spatialIndex) return;

    if (p.x !== undefined) {
      node.x = p.x;
    }
    if (p.y !== undefined) {
      node.y = p.y;
    }
    if (p.z !== undefined) {
      node.zIndex = p.z;
    }

    if (p.flipX !== undefined) {
      node.children[0].scale.x = p.flipX ? -1 : 1;
    }

    if (p.layer !== undefined) {
      const oldLayer = this.layerLookup.get(node.label)!;
      const newLayer = this.layerContainers[p.layer]!;
      if (oldLayer !== newLayer) {
        if (oldLayer) {
          oldLayer.removeChild(node);
        }
        newLayer.addChild(node);
        this.layerLookup.set(node.label, newLayer);
      }
    }
  }

  protected override createNode(obj: MapObj): P.Container | null {
    if (isTileGroupInstance(obj)) {
      const tsTex = this.tilesetCache.get(obj.tilesetId);
      if (!tsTex) {
        notifications.show({
          title: "Missing tileset",
          message: `Tileset with id ${obj.tilesetId} not found.`,
          color: "red",
          autoClose: false,
        });
        throw new Error(
          `Tileset texture not found for tilesetId ${obj.tilesetId}`
        );
      }

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
        source: tsTex.source,
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
    } else if (isAnimatedInstance(obj)) {
      throw new Error("AnimatedInstance rendering not implemented");
    } else if (isColliderEllipse(obj)) {
      const gfx = new P.Graphics();
      gfx.interactive = false;
      gfx.ellipse(0, 0, obj.radiusX, obj.radiusY);
      const container = new P.Container();
      container.label = obj.id;
      container.position.set(obj.x, obj.y);
      container.zIndex = obj.z;
      container.addChild(gfx);
      container.interactive = true;
      return container;
    } else if (isColliderBox(obj)) {
      const gfx = new P.Graphics();
      gfx.interactive = false;
      gfx.rect(0, 0, obj.width, obj.height).fill(colliderFill);
      const container = new P.Container();
      container.label = obj.id;
      container.position.set(obj.x, obj.y);
      container.zIndex = obj.z;
      container.addChild(gfx);
      container.interactive = true;
      return container;
    } else {
      throw new Error("Unsupported MapObj type");
    }
  }
}
