import { log } from "@/log";
import { actions, selectors as mapSelectors } from "@/slices/map";
import { selectors } from "@/slices/mapEditor";
import { store } from "@/store/store";
import { isTileGroupInstance, TileGroupInstance } from "@/types/editor";
import { SpatialIndex } from "@/types/spatial";
import { subscribeToSelector } from "@/utils/redux";
import { Vector } from "@/vec";
import * as P from "pixi.js";
import {
  ClickDragger,
  ClickDragListener,
  PointerEventData,
} from "../../common/drag";
import { drawMaskedOutline } from "../../common/outline";
import { selectStroke } from "../../common/strokes";
import { globals as g } from "../globals";

class Placer implements ClickDragListener {
  private paint = false;

  // This exists purely because we want to paint fast if the user is dragging,
  // and our full spatial index is only updated by the reconciler, which is too
  // late.
  private tempSpatialIndex: Set<string> = new Set();

  constructor(private spatialIndex: SpatialIndex) {}

  public pointerUp(_e: PointerEventData): void {
    const state = store.getState();
    const mode = selectors.selectMode(state);
    if (mode !== "paint") return;

    this.instantiatePlacable();
    this.paint = false;
  }

  public pointerDown(_e: PointerEventData): void {
    this.paint = true;
  }

  public pointerMove(e: PointerEventData): void {
    const state = store.getState();
    const mode = selectors.selectMode(state);

    if (mode === "paint") {
      if (!g.placableSprite) return;

      const rawPos = e.localPos;
      let finalPos: Vector = rawPos;
      const snap = state.mapEditor.grid.snap;
      if (snap) {
        finalPos = {
          x: Math.floor(rawPos.x / g.gridSnap) * g.gridSnap,
          y: Math.floor(rawPos.y / g.gridSnap) * g.gridSnap,
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
      this.instantiatePlacable();
    }
  }

  private instantiatePlacable(): void {
    if (!g.placableSprite) return;

    const state = store.getState();
    const ms = state.mapEditor;

    const pos = g.placableContainer.position;
    const { width, height } = g.placableSprite;
    const posKey = `${pos.x},${pos.y}`;
    if (this.tempSpatialIndex.has(posKey)) {
      return;
    }

    const innerPadding = 0.01;
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

    if (layer === "ground") {
      const maxZ = this.spatialIndex
        .search(searchBounds)
        .map((it) => it.id)
        .map((hit) => mapSelectors.selectById(state, hit))
        .filter((obj) => obj.layer === ms.layers.active)
        .filter((obj) => isTileGroupInstance(obj))
        // Get the max z-index of any existing objects here
        .reduce((max, obj) => (obj.z > max ? obj.z : max), 0);

      // Don't place if there's already something here
      const occupied = maxZ !== 0;
      if (occupied) {
        return;
      }
      z = maxZ + 0.01;
    }

    this.tempSpatialIndex.add(posKey);

    const place = ms.place;
    const obj = place.obj!;
    const id = crypto.randomUUID();

    const tgi: TileGroupInstance = {
      id,
      x: pos.x,
      y: pos.y,
      tileId: obj.id,
      tilesetId: obj.tilesetId,
      frame: obj.pos,
      flipX: place.flipX,
      z,
      layer,
    };

    store.dispatch(actions.addOne(tgi));
  }
}

export function setupPlacer({
  cd,
  spatialIndex,
}: {
  cd: ClickDragger;
  spatialIndex: SpatialIndex;
}) {
  cd.addListener(new Placer(spatialIndex));
}

subscribeToSelector(
  [(state) => state.mapEditor.place.obj, (state) => state.mapEditor.zoomPan],
  (placeObj, zoomPan) => {
    if (!g.initialized) return;

    g.placableOutline.removeChildren();
    g.placableContainer.removeChildren();

    if (placeObj) {
      g.gridSnap = placeObj.gridSize;
      const rect = placeObj.pos;

      const frame = new P.Rectangle(
        rect.ul.x,
        rect.ul.y,
        rect.br.x - rect.ul.x,
        rect.br.y - rect.ul.y
      );
      const tsTex = g.tilesetCache.get(placeObj.tilesetId);
      if (!tsTex) {
        log.error("Tileset texture not found for placer");
        return;
      }
      const texture = new P.Texture({ source: tsTex.source, frame });
      const sprite = new P.Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.position.set(sprite.width / 2, sprite.height / 2);

      g.placableContainer.removeChildren();
      g.placableContainer.addChild(sprite);
      g.placableSprite = sprite;

      const stroke = {
        ...selectStroke,
        width: (selectStroke.width ?? 1) / zoomPan.zoom,
      };

      drawMaskedOutline({
        container: g.placableOutline,
        frame: rect,
        stroke,
      });
    } else {
      g.placableSprite?.destroy();
      g.placableSprite = undefined;
    }
  }
);

subscribeToSelector([(state) => state.mapEditor.place.flipX], (flipX) => {
  if (!g.initialized) return;
  const child = g.placableContainer.children[0];
  if (!child) return;
  child.scale.x = flipX ? -1 : 1;
});
