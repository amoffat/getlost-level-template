import * as P from "pixi.js";
import { actions as tsActions } from "../../slices/tilesetEditor";
import { store } from "../../store/store";
import { Rect } from "../../types/rect";
import { TileGroup } from "../../types/tilegroup";
import { Tileset } from "../../types/tileset";
import { schedulerYield } from "../../utils/async";
import { subscribeToSelector } from "../../utils/redux";
import { genGroupId } from "../../utils/tileset";
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

export async function unpackTileset({
  ts,
  extractTiles,
}: {
  ts: Tileset;
  extractTiles: boolean;
}) {
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
  const gridSize = store.getState().tilesetEditor.grid.size;
  g.grid = drawGrid(gridSize);

  if (extractTiles) {
    const canvas = g.app.renderer.extract.canvas(texture) as HTMLCanvasElement;
    const bitmap = await createImageBitmap(canvas);

    // Add all single-tile groups by default
    const cols = Math.floor(sprite.width / gridSize);
    const rows = Math.floor(sprite.height / gridSize);
    // Build a single ImageData snapshot so we can quickly test transparency per tile
    const imageData = getImageDataFromBitmap(bitmap);

    store.dispatch(tsActions.loadingPalette(true));
    let chunk: TileGroup[] = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const coords: Rect = {
          ul: { x: x * gridSize, y: y * gridSize },
          br: { x: (x + 1) * gridSize, y: (y + 1) * gridSize },
        };
        // Skip empty tiles (all pixels fully transparent)
        if (isRectTransparent(imageData, coords)) continue;

        const id = await genGroupId({ coords, tsId: ts.id });
        chunk.push({
          id,
          pos: coords,
          tilesetId: ts.id,
          objectUrl: ts.objectUrl,
          gridSize,
          singleTile: true,
        });
        if (chunk.length > 10) {
          store.dispatch(tsActions.bulkAddSinglePaletteTiles(chunk));
          store.dispatch(tsActions.setScanPos(coords));
          await schedulerYield();
          chunk = [];
        }
      }
    }

    if (chunk.length > 0) {
      store.dispatch(tsActions.bulkAddSinglePaletteTiles(chunk));
    }
    store.dispatch(tsActions.setScanPos(null));
    store.dispatch(tsActions.loadingPalette(false));
  }
}

subscribeToSelector(
  (state) => state.tilesetEditor.activeZoomPan,
  (activeZoomPan) => {
    g.tilesetContainer.scale.set(activeZoomPan.zoom);
    g.tilesetContainer.position.set(activeZoomPan.pan.x, activeZoomPan.pan.y);
  }
);
