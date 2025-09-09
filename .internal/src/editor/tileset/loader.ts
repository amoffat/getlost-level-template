import * as P from "pixi.js";
import { globals as g } from "./globals";
import { drawGrid } from "./grid";

export async function loadTileset(source: File) {
  // Clear any previous content
  g.tilesetContainer.removeChildren();
  g.tilesetContainer.setSize(0);
  g.tilesetContainer.position.set(0);

  const bitmap = await createImageBitmap(source);
  const texture = P.Texture.from(bitmap);
  texture.source.scaleMode = "nearest";

  const sprite = new P.Sprite(texture);
  sprite.x = 0;
  sprite.y = 0;
  sprite.roundPixels = true;

  g.currentTileset = sprite;

  g.tilesetContainer.addChild(sprite);
  g.grid = drawGrid(16);

  return sprite;
}
