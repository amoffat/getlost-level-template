import * as constants from "@/constants";
import { globals as gApp } from "@/globals";
import { actions as tsActions } from "@/slices/tilesetEditor";
import { actions as uiActions } from "@/slices/ui";
import { store } from "@/store/store";
import { addPaletteObjectsThunk } from "@/thunks/tileset";
import { Rect } from "@/types/rect";
import { TemplateType } from "@/types/templates";
import { TileGroupTemplate } from "@/types/tilegroup";
import { Tileset } from "@/types/tileset";
import { schedulerYield } from "@/utils/async";
import { averageOklab } from "@/utils/color";
import { oklabHilbertIndex } from "@/utils/hilbert";
import { amountOpaquePixels, isTransparent, subImageData } from "@/utils/image";
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

/**
 * Generates grid-aligned coordinates for a tileset based on its dimensions and grid size.
 * @param tsId - The tileset ID
 * @param gridSize - The size of each grid cell
 * @returns An array of Rect coordinates representing each grid-aligned tile position
 */
export function generateGridAlignedCoords(
  tsId: string,
  gridSize: number
): Rect[] {
  const texture = gApp.tilesetTextureCache.get(tsId)!;
  const cols = Math.floor(texture.width / gridSize);
  const rows = Math.floor(texture.height / gridSize);
  const coords: Rect[] = [];

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      coords.push({
        x: x * gridSize,
        y: y * gridSize,
        width: gridSize,
        height: gridSize,
      });
    }
  }

  return coords;
}

/**
 * Unpacks a tileset by creating tile groups for the specified coordinates.
 * @param tsId - The tileset ID
 * @param coordsList - Array of Rect coordinates to unpack into tile groups
 */
export async function unpackTileset(tsId: string, coordsList: Rect[]) {
  const imageData = gApp.tilesetImageDataCache.get(tsId)!;

  store.dispatch(uiActions.loadingPalette(true));
  let chunk: TileGroupTemplate[] = [];
  const chunkIds = new Set<string>();
  const chunkSize = 100;

  const flushChunk = async (currentCoords: Rect | null = null) => {
    if (chunk.length > 0) {
      store.dispatch(addPaletteObjectsThunk({ tsId, objs: chunk }));
      store.dispatch(tsActions.setScanPos(currentCoords));
      chunk = [];
      chunkIds.clear();
      await schedulerYield();
    }
  };

  for (const coords of coordsList) {
    const innerPadding = 1;
    const searchCoords: BBox = {
      minX: coords.x + innerPadding,
      minY: coords.y + innerPadding,
      maxX: coords.x + coords.width - innerPadding,
      maxY: coords.y + coords.height - innerPadding,
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
    const tg: TileGroupTemplate = {
      id,
      type: TemplateType.TileGroup,
      imageId,
      pos: coords,
      tilesetId: tsId,
      gridSize: { x: coords.width, y: coords.height },
      zIndices: [],
      name: "",
      tags: [],
      pinned: false,
      coverage: amountOpaquePixels(tileImageData),
      avgColor,
      hilbertIndex: oklabHilbertIndex(avgColor),
      walkSound: constants.defaultWalkSound,
      friction: constants.defaultFriction,
      traction: constants.defaultTraction,
      hidden: false,
      flipX: false,
      tint: null,
    };

    chunk.push(tg);
    chunkIds.add(id);

    if (chunk.length > chunkSize) {
      await flushChunk(coords);
    }
  }

  await flushChunk();
  store.dispatch(uiActions.loadingPalette(false));
}

subState([(state) => state.tilesetEditor.activeZoomPan], (activeZoomPan) => {
  g.tilesetContainer.scale.set(activeZoomPan.zoom);
  g.tilesetContainer.position.set(activeZoomPan.pan.x, activeZoomPan.pan.y);
});
