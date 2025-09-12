import * as P from "pixi.js";
import { actions as mapActions } from "../../slices/mapEditor";
import { actions as tsActions } from "../../slices/tilesetEditor";
import { store } from "../../store";
import { Rect } from "../../types/rect";
import { schedulerYield } from "../../utils/async";
import { genGroupId, genTilesetId } from "../../utils/tileset";
import { globals as g } from "./globals";
import { drawGrid } from "./grid";

function getImageDataFromBitmap(bitmap: ImageBitmap): ImageData {
  const width = bitmap.width;
  const height = bitmap.height;
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get 2D context for OffscreenCanvas");
  ctx.drawImage(bitmap, 0, 0);
  return ctx.getImageData(0, 0, width, height);
}

// Returns true if every pixel within the rect has alpha == 0
function isRectTransparent(imageData: ImageData, rect: Rect): boolean {
  const { width, data } = imageData;
  const x0 = Math.max(0, Math.floor(rect.ul.x));
  const y0 = Math.max(0, Math.floor(rect.ul.y));
  const x1 = Math.min(imageData.width, Math.ceil(rect.br.x));
  const y1 = Math.min(imageData.height, Math.ceil(rect.br.y));

  for (let y = y0; y < y1; y++) {
    let idx = (y * width + x0) * 4 + 3; // start at alpha channel for (x0, y)
    for (let x = x0; x < x1; x++) {
      if (data[idx] !== 0) return false; // found a non-transparent pixel
      idx += 4; // advance to next pixel's alpha
    }
  }
  return true;
}

export async function loadTileset(source: File) {
  // Clear any previous content
  g.currentTileset?.removeFromParent();
  g.grid?.removeFromParent();
  g.tilesetContainer.position.set(0);
  g.groupSelContainer.setSize(0);

  const bitmap = await createImageBitmap(source);
  const texture = P.Texture.from(bitmap);
  texture.source.scaleMode = "nearest";

  const sprite = new P.Sprite(texture);
  sprite.x = 0;
  sprite.y = 0;
  sprite.roundPixels = true;

  g.currentTileset = sprite;

  g.tilesetContainer.addChild(sprite);
  const gridSize = store.getState().tilesetEditor.grid.size;
  g.grid = drawGrid(gridSize);

  const objectUrl = URL.createObjectURL(source);
  const tsId = await genTilesetId(source);
  store.dispatch(tsActions.setTileset({ objectUrl, id: tsId }));

  // Add all single-tile groups by default
  const cols = Math.floor(sprite.width / gridSize);
  const rows = Math.floor(sprite.height / gridSize);
  // Build a single ImageData snapshot so we can quickly test transparency per tile
  const imageData = getImageDataFromBitmap(bitmap);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const coords: Rect = {
        ul: { x: x * gridSize, y: y * gridSize },
        br: { x: (x + 1) * gridSize, y: (y + 1) * gridSize },
      };
      // Skip empty tiles (all pixels fully transparent)
      if (isRectTransparent(imageData, coords)) continue;

      const id = await genGroupId({ coords, tsId });
      await schedulerYield();

      store.dispatch(
        mapActions.addSinglePaletteTile({
          id,
          pos: coords,
          objectUrl,
          gridSize,
          singleTile: true,
        })
      );
    }
  }
}
