import {
  entranceIcon,
  exitIcon,
  lightIcon,
  pickupIcon,
} from "@/constants/tsObjs";
import { drawOutline } from "@/editors/common/outline";
import { selectStroke } from "@/editors/common/strokes";
import { Tool } from "@/editors/common/tooldispatch";
import { globals as gApp } from "@/globals";
import { log } from "@/log";
import { actions, selectors } from "@/slices/mapEditor";
import { selectors as tsSelectors } from "@/slices/tilesetEditor";
import { store } from "@/store/store";
import { isAnimationTemplate, TileAnimationFrame } from "@/types/animation";
import { Mode } from "@/types/editor";
import { MapLayerName } from "@/types/layer";
import {
  AnimationInstance,
  EntranceObj,
  ExitObj,
  isTileGroupInstance,
  LightObj,
  MapObj,
  MapObjType,
  NpcInstance,
  PickupObj,
  TileGroupInstance,
} from "@/types/map";
import { isNpcTemplate } from "@/types/npc";
import { toPixiRect } from "@/types/rect";
import { SpatialIndex } from "@/types/spatial";
import { isTileGroupTemplate } from "@/types/tilegroup";
import { PaintOpts } from "@/types/tools";
import { subState } from "@/utils/redux";
import { rectToBBox } from "@/utils/spatial";
import { Vector2 } from "@/vec";
import * as P from "pixi.js";
import {
  ClickDragger,
  ClickDragListener,
  PointerEventData,
} from "../../common/drag";
import { globals as g } from "../globals";

const placeModes: Set<Mode> = new Set([
  "paint",
  "set-waypoint",
  "add-light",
  "set-gateway",
  "add-pickup",
]);

// Modes that allow the creation of the place icon in the canvas.
const placeIconModes: Set<Mode> = new Set([...placeModes, "autotiler"]);

// Modes that allow dragging to paint/place objects
const draggableModes: Set<Mode> = new Set(["paint"]);

export class Placer extends ClickDragListener<Mode> implements Tool {
  public immediateDrag = true;
  protected paint = false;
  private _hoveringObjects = false;

  // This exists purely because we want to paint fast if the user is dragging,
  // and our full spatial index is only updated by the reconciler, which is too
  // late.
  protected tempSpatialIndex: Set<string> = new Set();
  protected dragSessionIndex: Set<string> = new Set();

  constructor(protected spatialIndex: SpatialIndex<MapObj>) {
    super((state) => selectors.selectMode(state));
  }

  protected override get providedModes(): Set<Mode> {
    return placeModes;
  }

  public override pointerUp(_e: PointerEventData): boolean {
    if (!this.paint) return false;
    if (!this.modeMatches()) return false;

    const state = store.getState();
    const ms = state.mapEditor;
    const paintMode = ms.toolOptions.paint.mode;
    this.instantiatePlacable(paintMode);

    this.paint = false;
    return true;
  }

  public override pointerDown(e: PointerEventData): boolean {
    if (!this.modeMatches()) return false;

    this.dragSessionIndex.clear();
    this.tempSpatialIndex.clear();

    if (g.placableSprite) {
      this.paint = true;
    } else {
      const searchBounds = rectToBBox(e.hitbox);

      const hits = this.spatialIndex.getObjects({
        pos: searchBounds,
      });
      if (hits.length > 0) {
        const obj = hits[0]!;
        if (isTileGroupInstance(obj)) {
          const state = store.getState();
          const tmpl = tsSelectors.templateFromId(state, obj.tsObjId);
          if (tmpl) {
            store.dispatch(actions.setPlace(tmpl));
          }
        }
      }
    }
    return true;
  }

  public override pointerMove(e: PointerEventData): boolean {
    if (!this.modeMatches()) return false;
    const state = store.getState();

    if (!g.placableSprite) {
      this._hoveringObjects = e.hoverIds.length > 0;
      return true;
    }

    const gridSize = state.mapEditor.place.obj!.gridSize;
    const rawPos = e.localPos;
    let finalPos: Vector2 = rawPos;
    const snap = state.mapEditor.grid.snap;
    if (snap) {
      finalPos = {
        x: Math.floor(rawPos.x / gridSize.x) * gridSize.x,
        y: Math.floor(rawPos.y / gridSize.y) * gridSize.y,
      };
    } else {
      finalPos = {
        x: Math.round(rawPos.x),
        y: Math.round(rawPos.y),
      };
    }

    g.placableOutline.position = finalPos;
    g.placableContainer.position = finalPos;
    return true;
  }

  public override pointerDrag(_e: PointerEventData): boolean {
    const state = store.getState();
    const mode = selectors.selectMode(state);

    if (this.paint && draggableModes.has(mode)) {
      const state = store.getState();
      const ms = state.mapEditor;
      const paintMode = ms.toolOptions.paint.mode;
      this.instantiatePlacable(paintMode);
      return true;
    }

    return false;
  }

  protected instantiatePlacable(paintMode: PaintOpts["mode"]): void {
    if (!g.placableSprite) return;

    const state = store.getState();
    const ms = state.mapEditor;

    const pos = g.placableContainer.position;
    const { width, height } = g.placableSprite;
    const posKey = `${pos.x},${pos.y}`;
    const placedThisSession = this.dragSessionIndex.has(posKey);
    if (placedThisSession) return;

    // We check a slightly smaller area than the actual object size to allow
    // for some small gaps between objects.
    const searchBounds = rectToBBox(
      {
        x: pos.x,
        y: pos.y,
        width,
        height,
      },
      1,
    );

    const layer = ms.layers.active;
    let z = pos.y + g.placableSprite.height;

    if (layer === MapLayerName.Ground) {
      z = 0;

      // This is the authoritative spatial index, but it might be out of sync
      // with the map, since it updates async.
      const hits = this.spatialIndex
        .getObjects({
          pos: searchBounds,
        })
        .filter((obj) => isTileGroupInstance(obj));

      // Also check our temp index which has objects we've placed this drag
      // session but which aren't in the main spatial index yet. This prevents
      // placing multiple objects on top of each other while dragging.
      const occupied = hits.length > 0 || this.tempSpatialIndex.has(posKey);

      // Get the max z-index of any existing objects here
      const maxZ = hits.reduce(
        (max, obj) => (obj.z > max ? obj.z : max),
        Number.NEGATIVE_INFINITY,
      );

      // Don't place if there's already something here
      if (paintMode === "place-once") {
        if (occupied) {
          return;
        }
      } else if (paintMode === "stack") {
        // Stack just above the highest object here
        z = maxZ + 1;
      } else if (paintMode === "overwrite") {
        store.dispatch(actions.removeMany(hits.map((h) => h.id)));
      }
    }

    this.tempSpatialIndex.add(posKey);
    this.dragSessionIndex.add(posKey);

    const place = ms.place;
    const obj = place.obj!;
    const id = crypto.randomUUID();
    let inst!: MapObj;

    if (isTileGroupTemplate(obj)) {
      if (obj.id === lightIcon) {
        inst = {
          id,
          color: undefined,
          intensity: undefined,
          hidden: undefined,
          name: undefined,
          type: MapObjType.Light,
          x: pos.x,
          y: pos.y,
          z,
          tsObjId: obj.id,
          tilesetId: obj.tilesetId,
          layer,
          width: obj.pos.width,
          height: obj.pos.height,
          flicker: undefined,
          offDuringDay: undefined,
        } satisfies LightObj;
      } else if (obj.id === entranceIcon) {
        inst = {
          id,
          exitIds: [],
          name: undefined,
          tags: undefined,
          type: MapObjType.Entry,
          x: pos.x,
          y: pos.y,
          z,
          tsObjId: obj.id,
          tilesetId: obj.tilesetId,
          layer,
          width: obj.pos.width,
          height: obj.pos.height,
          status: "error", // New exits start as error until named
        } satisfies EntranceObj;
      } else if (obj.id === exitIcon) {
        inst = {
          id,
          force: false,
          preferredEntranceId: null,
          sensorRadius: undefined,
          name: undefined,
          tags: undefined,
          type: MapObjType.Exit,
          x: pos.x,
          y: pos.y,
          z,
          tsObjId: obj.id,
          tilesetId: obj.tilesetId,
          layer,
          width: obj.pos.width,
          height: obj.pos.height,
          status: "error", // New exits start as error until named
        } satisfies ExitObj;
      } else if (obj.id === pickupIcon) {
        inst = {
          id,
          name: undefined,
          assetId: undefined,
          tags: undefined,
          type: MapObjType.Pickup,
          x: pos.x,
          y: pos.y,
          z,
          tsObjId: obj.id,
          tilesetId: obj.tilesetId,
          layer,
          width: obj.pos.width,
          height: obj.pos.height,
          status: "error", // New pickups start as error until named
          hidden: undefined,
        } satisfies PickupObj;
      } else {
        inst = {
          id,
          name: undefined,
          tags: undefined,
          type: MapObjType.TileGroupInstance,
          x: pos.x,
          y: pos.y,
          tsObjId: obj.id,
          imageId: obj.imageId,
          tilesetId: obj.tilesetId,
          z,
          layer,
          flipX: place.flipX,
          width: obj.pos.width,
          height: obj.pos.height,
          tint: undefined,
          hidden: undefined,
          walkSound: undefined,
          friction: undefined,
          traction: undefined,
          groundOffset: undefined,
        } satisfies TileGroupInstance;
      }
    } else if (isAnimationTemplate(obj)) {
      const firstFrame = obj.frames[0]!.tg;

      inst = {
        id,
        names: undefined,
        tags: undefined,
        type: MapObjType.AnimationInstance,
        tsObjId: obj.id,
        tilesetId: firstFrame.tilesetId,
        x: pos.x,
        y: pos.y,
        z,
        layer,
        flipX: place.flipX,
        width,
        height,
        tint: undefined,
        hidden: undefined,
        loop: undefined,
        groundOffset: undefined,
      } satisfies AnimationInstance;
    } else if (isNpcTemplate(obj)) {
      inst = {
        id,
        name: obj.name,
        tags: undefined,
        type: MapObjType.NpcInstance,
        tsObjId: obj.id,
        tilesetId: obj.tilesetId,
        x: pos.x,
        y: pos.y,
        z,
        layer,
        flipX: place.flipX,
        width,
        height,
        tint: undefined,
        hidden: undefined,
        walkSpeed: undefined,
        defaultAnimation: undefined,
        groundOffset: undefined,
        dampenWalkCollisions: undefined,
        status: undefined,
      } satisfies NpcInstance;
    }

    console.assert(!!inst, "No instance created for placer");
    store.dispatch(actions.addOne(inst));
  }

  public override getCursor(_e: P.FederatedPointerEvent): string | null {
    if (g.placableSprite) {
      return "crosshair";
    }
    if (this._hoveringObjects) {
      return "pointer";
    }
    return null;
  }
}

export function setupPlacer({
  cd,
  spatialIndex,
}: {
  cd: ClickDragger<Mode>;
  spatialIndex: SpatialIndex<MapObj>;
}) {
  cd.addListener(new Placer(spatialIndex));
}

subState(
  [
    (state) => state.mapEditor.place.obj,
    (state) => state.mapEditor.zoomPan.zoom,
    selectors.selectMode,
  ],
  (placeObj, zoom, mode) => {
    if (!g.initialized) return;

    const assetChanged = g.placableSprite?.label !== placeObj?.id;
    g.placableOutline.removeChildren();

    if (assetChanged) {
      g.placableContainer.removeChildren();
    }

    if (placeObj && placeIconModes.has(mode)) {
      let sprite: P.Sprite;
      if (assetChanged) {
        if (isTileGroupTemplate(placeObj)) {
          const rect = placeObj.pos;
          const tsTex = gApp.tilesetTextureCache.get(placeObj.tilesetId);
          if (!tsTex) {
            log.error("Tileset texture not found for placer");
            return;
          }
          const texture = new P.Texture({
            source: tsTex.source,
            frame: toPixiRect(rect),
          });
          sprite = new P.Sprite(texture);
        } else if (isAnimationTemplate(placeObj) || isNpcTemplate(placeObj)) {
          let frames: TileAnimationFrame[] = [];
          if (isAnimationTemplate(placeObj)) {
            frames = placeObj.frames;
          } else if (isNpcTemplate(placeObj)) {
            frames = placeObj.animations.WalkDown.animation.frames;
          }

          const pixiFrames: P.FrameObject[] = [];
          for (const frame of frames) {
            const rect = frame.tg.pos;
            const tsTex = gApp.tilesetTextureCache.get(frame.tg.tilesetId);
            if (!tsTex) {
              log.error("Tileset texture not found for placer");
              return;
            }
            const texture = new P.Texture({
              source: tsTex.source,
              frame: toPixiRect(rect),
            });
            pixiFrames.push({
              texture,
              time: frame.time,
            });
          }

          const anim = new P.AnimatedSprite(pixiFrames, true);
          anim.play();
          sprite = anim;
        } else {
          log.error("Unsupported place object type for placer");
          return;
        }

        sprite.label = placeObj.id;
        sprite.anchor.set(0.5);
        sprite.position.set(sprite.width / 2, sprite.height / 2);

        g.placableContainer.removeChildren();
        g.placableContainer.addChild(sprite);
        g.placableSprite = sprite;
      } else {
        sprite = g.placableSprite!;
      }

      const stroke = {
        ...selectStroke,
        width: (selectStroke.width ?? 1) / zoom,
      };

      drawOutline({
        container: g.placableOutline,
        width: sprite.width,
        height: sprite.height,
        stroke,
      });
    } else {
      g.placableSprite?.destroy();
      g.placableSprite = undefined;
    }
  },
);

subState([(state) => state.mapEditor.place.flipX], (flipX) => {
  if (!g.initialized) return;
  const child = g.placableContainer.children[0];
  if (!child) return;
  child.scale.x = flipX ? -1 : 1;
});

// subState([(state) => state.mapEditor.toolOptions.paint.size], (size) => {
//   // Update preview container to show a size x size grid of the placable sprite.
//   if (!g.initialized) return;
//   // If we don't currently have a base sprite (no object selected), nothing to
//   // do.
//   if (!g.placableSprite) return;

//   return; // TODO

//   // Remove all children; we'll rebuild the grid. Keep reference to original
//   // texture.
//   const baseTex = g.placableSprite.texture;
//   g.placableContainer.removeChildren();

//   // We want a flush grid where each cell is exactly the width/height of the base sprite.
//   const cellW = g.placableSprite.width; // width already accounts for frame
//   const cellH = g.placableSprite.height;

//   // Anchor handling: existing single sprite used anchor (0.5, 0.5) and was
//   // positioned at (w/2, h/2) For a multi-cell brush we center the whole grid
//   // around (0,0) like before so placement math still works. Compute total
//   // extents and offset so that (0,0) corresponds to top-left of first cell then
//   // shift as before. We'll position each sprite with anchor (0.5,0.5) like the
//   // original; position = cell origin + half size.
//   const offsetX = 0; // We'll later translate container so its registration mimics previous single-sprite layout.
//   const offsetY = 0;

//   for (let gy = 0; gy < size; gy++) {
//     for (let gx = 0; gx < size; gx++) {
//       const sprite = new P.Sprite(baseTex);
//       sprite.anchor.set(0.5);
//       sprite.position.set(
//         offsetX + gx * cellW + cellW / 2,
//         offsetY + gy * cellH + cellH / 2
//       );
//       g.placableContainer.addChild(sprite);
//     }
//   }

//   // Adjust outline: reuse existing outline container but redraw if we have rect
//   // info. We don't have direct access to place.obj here; derive from existing
//   // single frame dimensions. The outline was previously drawn in the other
//   // subState when place.obj changes, so here we'll just scale the outline
//   // container. Simplest: scale outline to size in both directions if it
//   // currently matches one cell.
//   const outlineChild = g.placableOutline.children[0];
//   if (outlineChild) {
//     // Reset any previous scaling then apply new
//     outlineChild.scale.set(size, size);
//   }
// });
