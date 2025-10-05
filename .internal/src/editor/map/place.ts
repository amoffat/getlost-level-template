import { log } from "@/log";
import { actions } from "@/slices/map";
import { selectors } from "@/slices/mapEditor";
import { store } from "@/store/store";
import { TileGroupInstance } from "@/types/editor";
import { subscribeToSelector } from "@/utils/redux";
import { Vector } from "@/vec";
import * as P from "pixi.js";
import {
  ClickDragger,
  ClickDragListener,
  PointerEventData,
} from "../common/drag";
import { drawMaskedOutline } from "../common/outline";
import { selectStroke } from "../common/strokes";
import { pickDirectionWeights } from "../tileset/autotile";
import { globals as g } from "./globals";

class Placer implements ClickDragListener {
  private paint = false;
  // The positions of objects we've placed during this paint session, to avoid
  // placing duplicates on top of each other.
  private painted: Set<string> = new Set();

  public pointerUp(e: PointerEventData): void {
    const state = store.getState();
    const mode = selectors.selectMode(state);
    if (mode !== "paint") return;

    this.instantiatePlacable();
    this.paint = false;
    this.painted.clear();
  }

  public pointerDown(e: PointerEventData): void {
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
    } else if (mode === "magic-paint") {
      const dirs = pickDirectionWeights(e.localPos, g.gridSnap);
      console.log("magic paint", dirs);
    }
  }

  public pointerDrag(e: PointerEventData): void {
    if (this.paint) {
      this.instantiatePlacable();
    }
  }

  private instantiatePlacable(): void {
    if (!g.placableSprite) return;

    const pos = g.placableContainer.position;
    const key = `${pos.x},${pos.y}`;
    if (this.painted.has(key)) {
      return;
    }
    this.painted.add(key);

    const state = store.getState();
    const mState = state.mapEditor;
    const place = mState.place;
    const obj = place.obj!;
    const id = crypto.randomUUID();

    let z = pos.y + g.placableSprite.height;
    const layer = mState.layers.active;
    if (layer === "ground") {
      z = 0;
    }

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

export function setupPlacer(cd: ClickDragger) {
  cd.addListener(new Placer());
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
