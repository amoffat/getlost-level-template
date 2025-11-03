import { drawOutline } from "@/editor/common/outline";
import { selectStroke } from "@/editor/common/strokes";
import { globals as gApp } from "@/globals";
import { log } from "@/log";
import { actions, selectors } from "@/slices/mapEditor";
import { store } from "@/store/store";
import { isObjectAnimationTemplate } from "@/types/animation";
import { MapLayerName } from "@/types/layer";
import {
  AnimatedInstance,
  isTileGroupInstance,
  MapObj,
  MapObjType,
  TileGroupInstance,
} from "@/types/map";
import { Rect, toPixiRect } from "@/types/rect";
import { SpatialIndex } from "@/types/spatial";
import { isTileGroupTemplate } from "@/types/tilegroup";
import { PaintOpts } from "@/types/tools";
import { subState } from "@/utils/redux";
import { Vector } from "@/vec";
import * as P from "pixi.js";
import {
  ClickDragger,
  ClickDragListener,
  PointerEventData,
} from "../../common/drag";
import { globals as g } from "../globals";

export class Placer implements ClickDragListener {
  public immediateDrag = true;
  protected paint = false;

  // This exists purely because we want to paint fast if the user is dragging,
  // and our full spatial index is only updated by the reconciler, which is too
  // late.
  protected tempSpatialIndex: Set<string> = new Set();
  protected dragSessionIndex: Set<string> = new Set();

  constructor(protected spatialIndex: SpatialIndex<MapObj>) {}

  public pointerUp(_e: PointerEventData): void {
    const state = store.getState();
    const mode = selectors.selectMode(state);
    if (mode !== "paint") return;

    const ms = state.mapEditor;
    const paintMode = ms.toolOptions.paint.mode;
    this.instantiatePlacable(paintMode);

    this.paint = false;
  }

  public pointerDown(_e: PointerEventData): void {
    this.paint = true;
    this.dragSessionIndex.clear();
    this.tempSpatialIndex.clear();
  }

  public pointerMove(e: PointerEventData): void {
    const state = store.getState();
    const mode = selectors.selectMode(state);

    if (mode === "paint") {
      if (!g.placableSprite) return;

      const gridSnap = state.mapEditor.grid.size;
      const rawPos = e.localPos;
      let finalPos: Vector = rawPos;
      const snap = state.mapEditor.grid.snap;
      if (snap) {
        finalPos = {
          x: Math.floor(rawPos.x / gridSnap) * gridSnap,
          y: Math.floor(rawPos.y / gridSnap) * gridSnap,
        };
      } else {
        finalPos = {
          x: Math.round(rawPos.x),
          y: Math.round(rawPos.y),
        };
      }

      const z = finalPos.y + g.placableSprite.height;
      g.placableOutline.position = finalPos;
      g.placableContainer.position = finalPos;
      g.placableContainer.zIndex = z;
    }
  }

  public pointerDrag(_e: PointerEventData): void {
    if (this.paint) {
      const state = store.getState();
      const ms = state.mapEditor;
      const paintMode = ms.toolOptions.paint.mode;
      this.instantiatePlacable(paintMode);
    }
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

    const innerPadding = 1;
    // We check a slightly smaller area than the actual object size to allow
    // for some small gaps between objects.
    const searchBounds = {
      minX: pos.x + innerPadding,
      minY: pos.y + innerPadding,
      maxX: pos.x + width - innerPadding,
      maxY: pos.y + height - innerPadding,
    };

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
        Number.NEGATIVE_INFINITY
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

    if (isTileGroupTemplate(obj)) {
      const inst: TileGroupInstance = {
        id,
        type: MapObjType.TileGroupInstance,
        x: pos.x,
        y: pos.y,
        tileId: obj.id,
        tilesetId: obj.tilesetId,
        frame: obj.pos,
        flipX: place.flipX,
        z,
        layer,
      };

      store.dispatch(actions.addOne(inst));
    } else if (isObjectAnimationTemplate(obj)) {
      const inst: AnimatedInstance = {
        id,
        type: MapObjType.AnimatedInstance,
        animId: obj.id,
        tilesetId: obj.frames[0]!.tg.tilesetId,
        frames: obj.frames.map((f) => ({
          tileId: f.tg.id,
          frame: f.tg.pos,
          time: f.time,
        })),
        x: pos.x,
        y: pos.y,
        z,
        layer,
        flipX: place.flipX,
      };

      store.dispatch(actions.addOne(inst));
    }
  }
}

export function setupPlacer({
  cd,
  spatialIndex,
}: {
  cd: ClickDragger;
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

    // No change necessary
    if (placeObj && g.placableSprite?.label === placeObj.id) return;

    g.placableOutline.removeChildren();
    g.placableContainer.removeChildren();

    if (placeObj && ["paint", "magic-paint"].includes(mode)) {
      let sprite: P.Sprite;
      let outlineFrame!: Rect;

      if (isTileGroupTemplate(placeObj)) {
        const rect = placeObj.pos;
        outlineFrame = rect;
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
      } else if (isObjectAnimationTemplate(placeObj)) {
        const pixiFrames: P.FrameObject[] = [];
        for (const frame of placeObj.frames) {
          const rect = frame.tg.pos;
          outlineFrame = rect;
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
        return;
      }

      sprite.label = placeObj.id;
      sprite.anchor.set(0.5);
      sprite.position.set(sprite.width / 2, sprite.height / 2);

      g.placableContainer.removeChildren();
      g.placableContainer.addChild(sprite);
      g.placableSprite = sprite;

      const stroke = {
        ...selectStroke,
        width: (selectStroke.width ?? 1) / zoom,
      };

      drawOutline({
        container: g.placableOutline,
        frame: outlineFrame,
        stroke,
      });
    } else {
      g.placableSprite?.destroy();
      g.placableSprite = undefined;
    }
  }
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
