import { texAtlasPadding } from "@/constants";
import { log } from "@/log";
import { selectors as tsSelectors } from "@/slices/tilesetEditor";
import { store } from "@/store/store";
import { AnimationTemplate } from "@/types/animation";
import {
  isAnimatedInstance,
  isColliderBox,
  isColliderEllipse,
  isTileGroupInstance,
  MapObj,
  MapObjsFromTileset,
} from "@/types/map";
import { toPixiRect } from "@/types/rect";
import { IndexItem, SpatialIndex } from "@/types/spatial";
import { TileGroupTemplate } from "@/types/tilegroup";
import { makeGroupedDebouncer } from "@/utils/debounce";
import { notifications } from "@mantine/notifications";
import * as P from "pixi.js";
import { EMPTY } from "rxjs";
import { ReduxReconciler } from "./reconciler";
import { colliderFill } from "./strokes";

export class MapObjReconciler extends ReduxReconciler<MapObj> {
  private layerContainers?: Record<number, P.Container>;
  private tilesetCache: Map<string, P.Texture>;
  // Object id -> layer container
  private layerLookup = new Map<string, P.Container>();

  protected spatialIndex?: SpatialIndex<MapObj>;
  private connected = false;
  private debounceNodeError: ReturnType<
    typeof makeGroupedDebouncer<MapObjsFromTileset>
  >;

  constructor(tilesetCache: Map<string, P.Texture>) {
    super();
    this.tilesetCache = tilesetCache;

    this.debounceNodeError = makeGroupedDebouncer({
      getKey: (obj: MapObjsFromTileset) => obj.tilesetId,
      fn: (obj: MapObjsFromTileset) => {
        notifications.show({
          title: "Missing tileset",
          message: `Tileset with SHA-1 hash ${obj.tilesetId} not found. Map objects are replaced with a placeholder. Re-upload the tileset to fix this.`,
          color: "red",
          autoClose: false,
        });
        log.error(`Tileset texture not found for tilesetId ${obj.tilesetId}.`);
        return EMPTY;
      },
    });
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
        return this.makeErrorNode(obj);
      }

      const state = store.getState();
      const tsObj = tsSelectors.templateFromInstance(
        state,
        obj.tsObjId
      ) as TileGroupTemplate;
      const frame = tsObj.pos;

      const width = frame.br.x - frame.ul.x;
      const height = frame.br.y - frame.ul.y;
      const texFrame = new P.Rectangle(
        frame.ul.x + texAtlasPadding,
        frame.ul.y + texAtlasPadding,
        width - 2 * texAtlasPadding,
        height - 2 * texAtlasPadding
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
        sprite.width / 2 + texAtlasPadding,
        sprite.height / 2 + texAtlasPadding
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
      spriteContainer.scale.set(1 + texAtlasPadding); // avoid bleeding

      return spriteContainer;
    } else if (isAnimatedInstance(obj)) {
      const pixiFrames: P.FrameObject[] = [];
      const tsTex = this.tilesetCache.get(obj.tilesetId);
      if (!tsTex) {
        return this.makeErrorNode(obj);
      }

      const state = store.getState();
      const tsObj = tsSelectors.templateFromInstance(
        state,
        obj.tsObjId
      ) as AnimationTemplate;

      for (const animFrame of tsObj.frames) {
        const rect = animFrame.tg.pos;

        const texture = new P.Texture({
          source: tsTex.source,
          frame: toPixiRect(rect),
        });
        pixiFrames.push({
          texture,
          time: animFrame.time,
        });
      }
      const sprite = new P.AnimatedSprite(pixiFrames, true);
      sprite.play();

      sprite.position.set(
        sprite.width / 2 + texAtlasPadding,
        sprite.height / 2 + texAtlasPadding
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
      spriteContainer.scale.set(1 + texAtlasPadding); // avoid bleeding

      return spriteContainer;
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
      log.error("Unsupported MapObj type");
      return null;
    }
  }

  /**
   * Renders a placeholder error node for when a tileset is missing. It has a
   * big red X going from corner to corner and is the size of the object's
   * frame.
   *
   * @returns A placeholder error container
   */
  private makeErrorNode(obj: MapObjsFromTileset): P.Container {
    this.debounceNodeError(obj);

    const container = new P.Container();
    container.label = obj.id;

    const gfx = new P.Graphics();
    gfx.moveTo(0, 0);
    gfx.lineTo(obj.width, obj.height);
    gfx.moveTo(obj.width, 0);
    gfx.lineTo(0, obj.height);
    gfx.rect(0, 0, obj.width, obj.height);
    gfx.stroke({ color: 0xff0000, width: 4, cap: "round" });

    container.addChild(gfx);
    return container;
  }
}
