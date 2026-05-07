import * as constants from "@/constants";
import { globals as gApp } from "@/globals";
import { actions as uiActions } from "@/slices/ui";
import { store } from "@/store/store";
import { addPaletteObjectsThunk } from "@/thunks/tileset";
import { Rect } from "@/types/rect";
import { TemplateType } from "@/types/templates";
import { TileGroupTemplate } from "@/types/tilegroup";
import { Tileset } from "@/types/tileset";
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
  g.boundsMask.clear();

  if (ts) {
    const tex = await loadTilesetImage(ts);

    const sprite = new P.Sprite(tex);
    sprite.x = 0;
    sprite.y = 0;
    sprite.roundPixels = true;
    sprite.zIndex = 0; // Ensure tileset is at the bottom layer

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
  gridSize: number,
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
 * Slices a tileset by creating tile groups for the specified coordinates.
 * @param tsId - The tileset ID
 * @param coordsList - Array of Rect coordinates to unpack into tile groups
 * @param sliceCollection - Optional UUID shared by all tiles from the same reslicer action
 */
export async function sliceTileset(
  tsId: string,
  coordsList: Rect[],
  sliceCollection?: string,
) {
  const imageData = gApp.tilesetImageDataCache.get(tsId)!;

  store.dispatch(uiActions.loadingPalette(true));

  const tiles: TileGroupTemplate[] = [];

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

    const avgColor = averageOklab(tileImageData);
    const tg: TileGroupTemplate = {
      id,
      type: TemplateType.TileGroup,
      talkable: false,
      imageId,
      pos: coords,
      tilesetId: tsId,
      gridSize: { x: coords.width, y: coords.height },
      zIndices: structuredClone(constants.defaultZIndices),
      nameKey: null,
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
      groundOffset: 0,
      speakerImageId: null,
      collisions: {
        mask: null,
        shapes: [],
        simplify: 1.0,
      },
    };

    tiles.push(tg);
  }

  if (sliceCollection && tiles.length > 1) {
    for (const tg of tiles) {
      tg.sliceCollection = sliceCollection;
    }
  }

  store.dispatch(addPaletteObjectsThunk({ tsId, objs: tiles }));
  store.dispatch(uiActions.loadingPalette(false));
}

subState([(state) => state.tilesetEditor.activeZoomPan], (activeZoomPan) => {
  g.tilesetContainer.scale.set(activeZoomPan.zoom);
  g.tilesetContainer.position.set(activeZoomPan.pan.x, activeZoomPan.pan.y);
});
