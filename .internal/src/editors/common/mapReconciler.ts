import { defaultTint, texAtlasPadding } from "@/constants";
import { errorIcon, iconTsId } from "@/constants/tsObjs";
import { log } from "@/log";
import { selectors as tsSelectors } from "@/slices/tilesetEditor";
import { store } from "@/store/store";
import { AnimationTemplate } from "@/types/animation";
import {
  isAnimatedInstance,
  isColliderBox,
  isColliderEllipse,
  isEntranceObj,
  isExitObj,
  isMapObjFromTileset,
  isNpcInstance,
  isTileGroupInstance,
  MapObj,
} from "@/types/map";
import { NpcTemplate } from "@/types/npc";
import { TileGroupProps } from "@/types/properties";
import { toPixiRect } from "@/types/rect";
import { IndexItem, SpatialIndex } from "@/types/spatial";
import { TileGroupTemplate } from "@/types/tilegroup";
import { makeGroupedDebouncer } from "@/utils/debounce";
import { resolveTemplate } from "@/utils/map";
import { notifications } from "@mantine/notifications";
import * as P from "pixi.js";
import { EMPTY } from "rxjs";
import { ReduxReconciler } from "./reconciler";
import { colliderFill, exitFill } from "./strokes";

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

  /**
   * Resolves a property value with template inheritance.
   * - If value is undefined, inherits from template (if available)
   * - If value is null, doesn't inherit (explicit override)
   * - Otherwise uses the provided value
   * - Falls back to defaultValue if no value is found
   *
   * @param value The property value from props
   * @param template The template object to inherit from
   * @param key The property key to look up in the template
   * @param defaultValue The fallback value if no other value is found
   * @returns The resolved property value
   */
  private resolveWithInheritance<T>(
    value: T | null | undefined,
    template: any,
    key: string,
    defaultValue: T
  ): T {
    // If value is undefined, inherit from template. If it's null, don't.
    if (value === undefined && template) {
      value = template[key] ?? value;
    }
    return (value ?? defaultValue) as T;
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

    const state = store.getState();
    const objId = node.label;
    const obj = state.mapEditor.objects.entities[objId];
    const tmpl = resolveTemplate(obj);

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

    if (props.sensorRadius !== undefined) {
      const gfx = node.getChildByLabel("sensorCircle") as P.Graphics;
      gfx.clear();
      gfx.circle(0, 0, props.sensorRadius).fill(exitFill);
    }

    if (Object.hasOwn(props, "hidden")) {
      // If hidden is undefined, inherit from template. If it's null, don't.
      const hidden = this.resolveWithInheritance<boolean>(
        props.hidden,
        tmpl,
        "hidden",
        false
      );
      node.alpha = hidden ? 0.35 : 1;
    }

    if (isTileGroupInstance(obj)) {
      if (Object.hasOwn(props, "tint")) {
        const tint = this.resolveWithInheritance<string>(
          props.tint,
          tmpl as unknown as TileGroupProps,
          "tint",
          defaultTint
        );
        node.tint = parseInt(tint, 16);
      }
    }

    if (Object.hasOwn(props, "status")) {
      const errorIndicator = node.getChildByLabel(
        "errorIndicator"
      ) as P.Container | null;

      if (errorIndicator) {
        errorIndicator.visible = props.status === "error";
      }
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
      sprite.eventMode = "passive";
      sprite.anchor.set(0.5);
      sprite.scale.x = obj.flipX ? -1 : 1;

      const spriteContainer = new P.Container();
      spriteContainer.label = obj.id;
      spriteContainer.position.set(obj.x, obj.y);
      spriteContainer.zIndex = obj.z;
      spriteContainer.addChild(sprite);
      spriteContainer.eventMode = "static";
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
      sprite.eventMode = "passive";
      sprite.anchor.set(0.5);
      sprite.scale.x = obj.flipX ? -1 : 1;

      const spriteContainer = new P.Container();
      spriteContainer.label = obj.id;
      spriteContainer.position.set(obj.x, obj.y);
      spriteContainer.zIndex = obj.z;
      spriteContainer.addChild(sprite);
      spriteContainer.eventMode = "static";
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
      sprite.eventMode = "passive";
      sprite.anchor.set(0.5);
      sprite.zIndex = 10;

      if (isTileGroupInstance(obj)) {
        sprite.scale.x = obj.flipX ? -1 : 1;
      }

      const spriteContainer = new P.Container();
      spriteContainer.label = obj.id;
      spriteContainer.position.set(obj.x, obj.y);
      spriteContainer.zIndex = obj.z;
      spriteContainer.addChild(sprite);
      spriteContainer.eventMode = "static";
      spriteContainer.scale.set(1 + texAtlasPadding); // avoid bleeding

      if (isExitObj(obj)) {
        const sensorCircle = new P.Graphics();
        sensorCircle.eventMode = "passive";
        sensorCircle.label = "sensorCircle";
        sensorCircle
          .circle(0, 0, state.mapEditor.templates.exitGateways.sensorRadius)
          .fill(exitFill);
        sensorCircle.position.set(
          sprite.width / 2 + texAtlasPadding,
          sprite.height / 2 + texAtlasPadding
        );
        sensorCircle.zIndex = 9;
        spriteContainer.addChild(sensorCircle);

        const errorIndicator = this.createErrorIndicator(
          sprite,
          obj.status === "error"
        );
        errorIndicator.zIndex = 20;
        spriteContainer.addChild(errorIndicator);
      }

      if (isEntranceObj(obj)) {
        const errorIndicator = this.createErrorIndicator(
          sprite,
          obj.status === "error"
        );
        spriteContainer.addChild(errorIndicator);
      }

      return spriteContainer;
    } else if (isColliderEllipse(obj)) {
      const gfx = new P.Graphics();
      gfx.eventMode = "passive";
      gfx.ellipse(0, 0, obj.width / 2, obj.height / 2);
      const container = new P.Container();
      container.label = obj.id;
      container.position.set(obj.x, obj.y);
      container.zIndex = obj.z;
      container.addChild(gfx);
      container.eventMode = "static";
      return container;
    } else if (isColliderBox(obj)) {
      const gfx = new P.Graphics();
      gfx.eventMode = "passive";
      gfx.rect(0, 0, obj.width, obj.height).fill(colliderFill);
      const container = new P.Container();
      container.label = obj.id;
      container.position.set(obj.x, obj.y);
      container.zIndex = obj.z;
      container.addChild(gfx);
      container.eventMode = "static";
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
   * Creates an error indicator container with a red border and warning icon.
   * The container includes both visual elements and can be shown/hidden as a unit.
   *
   * @param sprite The sprite to create the error indicator for
   * @param visible Whether the error indicator should be initially visible
   * @returns A container with error border and icon, or null if resources unavailable
   */
  private createErrorIndicator(
    sprite: P.Sprite | P.AnimatedSprite,
    visible: boolean
  ): P.Container {
    const state = store.getState();
    const errorContainer = new P.Container();
    errorContainer.label = "errorIndicator";
    errorContainer.eventMode = "passive";
    errorContainer.visible = visible;

    // Add error border (red rectangle outline)
    const errorBorder = new P.Graphics();
    errorBorder.eventMode = "passive";
    errorBorder
      .rect(
        0,
        0,
        sprite.width + 2 * texAtlasPadding,
        sprite.height + 2 * texAtlasPadding
      )
      .stroke({ color: 0xff0000, width: 2 });
    errorContainer.addChild(errorBorder);

    // Add warning triangle icon sprite in top-right corner
    const iconTsTex = this.getTilesetTex(iconTsId)!;
    const iconTsObj = tsSelectors.templateFromInstanceId(
      state,
      errorIcon
    ) as TileGroupTemplate;
    const iconFrame = iconTsObj.pos;
    const iconTexFrame = new P.Rectangle(
      iconFrame.x + texAtlasPadding,
      iconFrame.y + texAtlasPadding,
      iconFrame.width - 2 * texAtlasPadding,
      iconFrame.height - 2 * texAtlasPadding
    );
    const iconTex = new P.Texture({
      source: iconTsTex.source,
      frame: iconTexFrame,
    });

    const errorIconSprite = new P.Sprite(iconTex);
    errorIconSprite.eventMode = "passive";
    errorIconSprite.tint = 0xff0000; // Red tint
    errorIconSprite.position.set(
      sprite.width + texAtlasPadding,
      texAtlasPadding
    );
    errorContainer.addChild(errorIconSprite);

    return errorContainer;
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
