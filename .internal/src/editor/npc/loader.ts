import { loadTilesetTex } from "@/utils/tileset";
import * as P from "pixi.js";
import { Tileset } from "../../types/tileset";
import { subState } from "../../utils/redux";
import { globals as g } from "./globals";

export async function setCanvasTileset(ts: Tileset) {
  // Clear any previous content
  g.currentTileset?.removeFromParent();
  g.grid?.removeFromParent();
  g.tilesetContainer.position.set(0);
  g.tilesetContainer.scale.set(1);
  g.groupSelContainer.setSize(0);

  const tex = await loadTilesetTex(ts.id, ts.objectUrl);

  const sprite = new P.Sprite(tex);
  sprite.x = 0;
  sprite.y = 0;
  sprite.roundPixels = true;

  g.currentTileset = sprite;
  g.tilesetContainer.addChild(sprite);
}

subState([(state) => state.tilesetEditor.activeZoomPan], (activeZoomPan) => {
  g.tilesetContainer.scale.set(activeZoomPan.zoom);
  g.tilesetContainer.position.set(activeZoomPan.pan.x, activeZoomPan.pan.y);
});
