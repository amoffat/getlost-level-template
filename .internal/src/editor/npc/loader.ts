import * as P from "pixi.js";
import { Tileset } from "../../types/tileset";
import { subscribeToSelector } from "../../utils/redux";
import { globals as g } from "./globals";

export async function setCanvasTileset(ts: Tileset) {
  // Clear any previous content
  g.currentTileset?.removeFromParent();
  g.grid?.removeFromParent();
  g.tilesetContainer.position.set(0);
  g.tilesetContainer.scale.set(1);
  g.groupSelContainer.setSize(0);

  const texture = await P.Assets.load<P.Texture>({
    src: ts.objectUrl,
    parser: "loadTextures",
  });
  texture.source.scaleMode = "nearest";

  const sprite = new P.Sprite(texture);
  sprite.x = 0;
  sprite.y = 0;
  sprite.roundPixels = true;

  g.currentTileset = sprite;
  g.tilesetContainer.addChild(sprite);
}

subscribeToSelector(
  (state) => state.tilesetEditor.activeZoomPan,
  (activeZoomPan) => {
    g.tilesetContainer.scale.set(activeZoomPan.zoom);
    g.tilesetContainer.position.set(activeZoomPan.pan.x, activeZoomPan.pan.y);
  }
);
