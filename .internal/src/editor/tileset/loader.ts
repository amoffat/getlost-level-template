import { globals as gApp } from "@/globals";
import { actions as tsActions } from "@/slices/tilesetEditor";
import { actions as uiActions } from "@/slices/ui";
import { store } from "@/store/store";
import { Rect } from "@/types/rect";
import { TileGroup } from "@/types/tilegroup";
import { Tileset } from "@/types/tileset";
import { schedulerYield } from "@/utils/async";
import { averageOklab } from "@/utils/color";
import { oklabHilbertIndex } from "@/utils/hilbert";
import {
  amountOpaquePixels,
  getImageDataFromBitmap,
  isTransparent,
  subImageData,
} from "@/utils/image";
import { subState } from "@/utils/redux";
import { genImageId, genTileId, loadTilesetImage } from "@/utils/tileset";
import * as P from "pixi.js";
import { BBox } from "rbush";
import { globals as g } from "./globals";

export async function setCanvasTileset(ts: Tileset | null) {
  // Clear any previous content
  g.currentTileset?.removeFromParent();
  g.grid?.removeFromParent();
  g.tilesetContainer.position.set(0);
  g.tilesetContainer.scale.set(1);
  g.groupSelContainer.setSize(0);

  if (ts) {
    const tex = await loadTilesetImage(ts);

    const sprite = new P.Sprite(tex);
    sprite.x = 0;
    sprite.y = 0;
    sprite.roundPixels = true;

    g.currentTileset = sprite;
    g.tilesetContainer.addChild(sprite);
  }
}

export async function unpackTileset(tsId: string) {
  const state = store.getState();
  const gridSize = state.tilesetEditor.grid.size;
  const texture = gApp.tilesetTextureCache.get(tsId)!;

  const canvas = g.app.renderer.extract.canvas(texture) as HTMLCanvasElement;
  const bitmap = await createImageBitmap(canvas);

  // Add all single-tile groups by default
  const cols = Math.floor(texture.width / gridSize);
  const rows = Math.floor(texture.height / gridSize);
  // Build a single ImageData snapshot so we can quickly test transparency per tile
  const imageData = getImageDataFromBitmap(bitmap);

  store.dispatch(uiActions.loadingPalette(true));
  let chunk: TileGroup[] = [];
  const chunkIds = new Set<string>();

  const flushChunk = async (coords: Rect | null = null) => {
    if (chunk.length > 0) {
      store.dispatch(
        tsActions.bulkAddSinglePaletteTiles({ tsId, groups: chunk })
      );
      store.dispatch(tsActions.setScanPos(coords));
      chunk = [];
      chunkIds.clear();
      await schedulerYield();
    }
  };

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const coords: Rect = {
        ul: { x: x * gridSize, y: y * gridSize },
        br: { x: (x + 1) * gridSize, y: (y + 1) * gridSize },
      };

      const innerPadding = 1;
      const searchCoords: BBox = {
        minX: coords.ul.x + innerPadding,
        minY: coords.ul.y + innerPadding,
        maxX: coords.br.x - innerPadding,
        maxY: coords.br.y - innerPadding,
      };

      // Don't re-tile over pinned groups
      const hits = g.spatialIndex
        .getObjects({ pos: searchCoords })
        .filter((obj) => obj.pinned);
      if (hits.length > 0) {
        // Skip tiles that are already part of a pinned group
        continue;
      }

      const tileImageData = subImageData(imageData, coords);

      // Skip empty tiles (all pixels fully transparent)
      if (isTransparent(tileImageData)) {
        continue;
      }

      const imageId = await genImageId(tileImageData);
      const id = await genTileId({
        tsId,
        pos: coords,
      });

      // This fixes a bug where tiles with the same id, but different positions,
      // are being added in the same chunk, causing only one of them to be added
      // to the spatial index in the tileReconciler.
      if (chunkIds.has(id)) {
        await flushChunk(coords);
      }

      const avgColor = averageOklab(tileImageData);
      const tg: TileGroup = {
        id,
        imageId,
        pos: coords,
        tilesetId: tsId,
        gridSize,
        zIndices: [],
        name: "",
        tags: [],
        pinned: false,
        coverage: amountOpaquePixels(tileImageData),
        avgColor,
        hilbertIndex: oklabHilbertIndex(avgColor),
      };

      chunk.push(tg);
      chunkIds.add(id);

      if (chunk.length > 10) {
        await flushChunk(coords);
      }
    }
  }

  await flushChunk();
  store.dispatch(uiActions.loadingPalette(false));
}

subState([(state) => state.tilesetEditor.activeZoomPan], (activeZoomPan) => {
  g.tilesetContainer.scale.set(activeZoomPan.zoom);
  g.tilesetContainer.position.set(activeZoomPan.pan.x, activeZoomPan.pan.y);
});
