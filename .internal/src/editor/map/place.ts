import { log } from "@/log";
import { actions } from "@/slices/map";
import { store } from "@/store/store";
import { TileGroupInstance } from "@/types/editor";
import { subscribeToSelector } from "@/utils/redux";
import * as P from "pixi.js";
import { drawMaskedOutline } from "../common/outline";
import { selectStroke } from "../common/strokes";
import { globals as g } from "./globals";

function mouseToPos(e: P.FederatedPointerEvent) {
  const pos = g.mapContainer.toLocal(e.global);
  const snap = store.getState().mapEditor.grid.snap;
  if (snap) {
    return {
      x: Math.floor(pos.x / g.gridSnap) * g.gridSnap,
      y: Math.floor(pos.y / g.gridSnap) * g.gridSnap,
    };
  } else {
    return {
      x: Math.round(pos.x),
      y: Math.round(pos.y),
    };
  }
}

export function setupPlacer() {
  const stage = g.app.stage;

  stage.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    if (!g.placableSprite) return;
    e.preventDefault();

    const pos = g.placableContainer.position;
    const state = store.getState();
    const place = state.mapEditor.place!;
    const id = crypto.randomUUID();

    const obj: TileGroupInstance = {
      id,
      x: pos.x,
      y: pos.y,
      tileId: place.id,
      tilesetId: place.tilesetId,
      frame: place.pos,
      flipX: false,
      z: pos.y + g.placableSprite.height,
    };

    store.dispatch(actions.addOne(obj));
  });

  stage.on("pointermove", (e) => {
    e.preventDefault();

    if (g.placableSprite) {
      const pos = mouseToPos(e);
      g.placableContainer.position = pos;
      g.placableContainer.zIndex = pos.y;
      g.placableOutline.position = pos;
    }
  });
}

subscribeToSelector(
  (state) => state.mapEditor.place,
  (place) => {
    if (!g.initialized) return;

    g.placableOutline.removeChildren();
    g.placableContainer.removeChildren();

    if (place) {
      g.gridSnap = place.gridSize;
      const rect = place.pos;

      const frame = new P.Rectangle(
        rect.ul.x,
        rect.ul.y,
        rect.br.x - rect.ul.x,
        rect.br.y - rect.ul.y
      );
      const tsTex = g.tilesetCache.get(place.tilesetId);
      if (!tsTex) {
        log.error("Tileset texture not found for placer");
        return;
      }
      const texture = new P.Texture({ source: tsTex.source, frame });
      const sprite = new P.Sprite(texture);

      g.placableContainer.removeChildren();
      g.placableContainer.addChild(sprite);
      g.placableSprite = sprite;

      drawMaskedOutline({
        container: g.placableOutline,
        frame: rect,
        stroke: selectStroke,
      });
    } else {
      g.placableSprite?.destroy();
      g.placableSprite = undefined;
    }
  }
);
