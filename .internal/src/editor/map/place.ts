import { actions } from "@/slices/map";
import { store } from "@/store/store";
import { TileObj } from "@/types/editor";
import * as P from "pixi.js";
import { globals as g } from "./globals";

function mouseToPos(e: P.FederatedPointerEvent) {
  const pos = g.mapContainer.toLocal(e.global);
  return {
    x: Math.floor(pos.x / g.gridSnap) * g.gridSnap,
    y: Math.floor(pos.y / g.gridSnap) * g.gridSnap,
  };
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

    const obj: TileObj = {
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
    }
  });
}
