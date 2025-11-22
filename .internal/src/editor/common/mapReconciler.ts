import { texAtlasPadding } from "@/constants";
import { log } from "@/log";
import { selectors as tsSelectors } from "@/slices/tilesetEditor";
import { store } from "@/store/store";
import { AnimationTemplate } from "@/types/animation";
import {
  isAnimatedInstance,
  isColliderBox,
  isColliderEllipse,
  isMapObjFromTileset,
  isNpcInstance,
  isTileGroupInstance,
  MapObj,
} from "@/types/map";
import { NpcTemplate } from "@/types/npc";
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
  private tilesetCache: Map<string, P.CanvasSource>;
  // Object id -> layer container
  private layerLookup = new Map<string, P.Container>();

  protected spatialIndex?: SpatialIndex<MapObj>;
  private connected = false;
  private debounceNodeError: ReturnType<typeof makeGroupedDebouncer>;

  constructor(tilesetCache: Map<string, P.CanvasSource>) {
    super();
    this.tilesetCache = tilesetCache;

    this.debounceNodeError = makeGroupedDebouncer();
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

  protected override applyProps({
    node,
    props,
  }: {
    node: P.Container;
    props: ReduxReconciler<MapObj>["ObjParamsType"];
  }): boolean {
    let recreate = false;
    if (!this.layerContainers || !this.spatialIndex) return recreate;

    if (props.x !== undefined) {
      node.x = props.x;
    }
    if (props.y !== undefined) {
      node.y = props.y;
    }
    if (props.z !== undefined) {
      node.zIndex = props.z;
    }

    if (props.flipX !== undefined) {
      node.children[0].scale.x = props.flipX ? -1 : 1;
    }

    if (props.layer !== undefined) {
      const oldLayer = this.layerLookup.get(node.label)!;
      const newLayer = this.layerContainers[props.layer]!;
      if (oldLayer !== newLayer) {
        if (oldLayer) {
          oldLayer.removeChild(node);
        }
        newLayer.addChild(node);
        this.layerLookup.set(node.label, newLayer);
      }
    }

    if (props.tilesetId !== undefined || props.tsObjId !== undefined) {
      // Recreate the node entirely, since the texture may have changed.
      recreate = true;
    }
    return recreate;
  }

  protected override createNode(obj: MapObj): P.Container | null {
    if (isAnimatedInstance(obj)) {
      const pixiFrames: P.FrameObject[] = [];
      const tsTex = this.getTilesetTex(obj.tilesetId);
      if (!tsTex) {
        return this.makeErrorNode(obj);
      }

      const state = store.getState();
      const tsObj = tsSelectors.templateFromInstanceId(
        state,
        obj.tsObjId
      ) as AnimationTemplate | null;
      if (!tsObj) {
        this.debouncedError(
          obj.tilesetId,
          "Missing object",
          `The animation object with ID ${obj.tsObjId} could not be found in the tileset.`
        );
        return this.makeErrorNode(obj);
      }

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
    } else if (isNpcInstance(obj)) {
      const pixiFrames: P.FrameObject[] = [];
      const tsTex = this.getTilesetTex(obj.tilesetId);
      if (!tsTex) {
        return this.makeErrorNode(obj);
      }

      const state = store.getState();
      const tsObj = tsSelectors.templateFromInstanceId(
        state,
        obj.tsObjId
      ) as NpcTemplate | null;
      if (!tsObj) {
        this.debouncedError(
          obj.tilesetId,
          "Missing object",
          `The NPC object with ID ${obj.tsObjId} could not be found in the tileset.`
        );
        return this.makeErrorNode(obj);
      }

      const idleFrames = tsObj.animations.Idle.frames;

      for (const animFrame of idleFrames) {
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
    } else if (isMapObjFromTileset(obj)) {
      const tsTex = this.getTilesetTex(obj.tilesetId);
      if (!tsTex) {
        return this.makeErrorNode(obj);
      }

      const state = store.getState();
      const tsObj = tsSelectors.templateFromInstanceId(
        state,
        obj.tsObjId
      ) as TileGroupTemplate;
      if (!tsObj) {
        this.debouncedError(
          obj.tilesetId,
          "Missing object",
          `The tile object with ID ${obj.tsObjId} could not be found in the tileset.`
        );
        return this.makeErrorNode(obj);
      }

      const frame = tsObj.pos;

      const texFrame = new P.Rectangle(
        frame.x + texAtlasPadding,
        frame.y + texAtlasPadding,
        frame.width - 2 * texAtlasPadding,
        frame.height - 2 * texAtlasPadding
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

      if (isTileGroupInstance(obj)) {
        sprite.scale.x = obj.flipX ? -1 : 1;
      }

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
      gfx.ellipse(0, 0, obj.width / 2, obj.height / 2);
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

  private getTilesetTex(tsId: string): P.TextureSource | undefined {
    const tex = this.tilesetCache.get(tsId);
    if (!tex) {
      this.missingTilesetError(tsId);
    }
    return tex;
  }

  /**
   * Renders a placeholder error node for when a tileset is missing. It has a
   * big red X going from corner to corner and is the size of the object's
   * frame.
   *
   * @returns A placeholder error container
   */
  private makeErrorNode(obj: MapObj): P.Container {
    const container = new P.Container();
    container.label = obj.id;

    const gfx = new P.Graphics();
    gfx.rect(0, 0, obj.width, obj.height);
    gfx.fill({ color: 0xff0000 });

    container.addChild(gfx);
    return container;
  }

  private missingTilesetError(tsId: string) {
    this.debouncedError(
      tsId,
      "Missing tileset",
      `Tileset with SHA-1 hash ${tsId} not found. Map objects are replaced with a placeholder. Re-upload the tileset to fix this.`
    );
  }

  private debouncedError(key: string, title: string, message: string) {
    this.debounceNodeError(key, () => {
      notifications.show({
        title,
        message,
        color: "red",
        autoClose: false,
      });
      return EMPTY;
    });
  }
}
