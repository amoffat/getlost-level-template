import { actions as tsActions } from "@/slices/tilesetEditor";
import { actions as uiActions } from "@/slices/ui";
import { store } from "@/store/store";
import { Rect } from "@/types/rect";
import { TileGroup } from "@/types/tilegroup";
import { Tileset } from "@/types/tileset";
import { schedulerYield } from "@/utils/async";
import { getImageDataFromBitmap, isRectTransparent } from "@/utils/image";
import { subState } from "@/utils/redux";
import { genGroupId } from "@/utils/tileset";
import * as P from "pixi.js";
import { globals as g } from "./globals";

export async function setCanvasTileset(ts: Tileset | null) {
  // Clear any previous content
  g.currentTileset?.removeFromParent();
  g.grid?.removeFromParent();
  g.tilesetContainer.position.set(0);
  g.tilesetContainer.scale.set(1);
  g.groupSelContainer.setSize(0);

  if (ts) {
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
}

export async function unpackActiveTileset() {
  const state = store.getState();
  const gridSize = state.tilesetEditor.grid.size;
  const tsId = state.tilesetEditor.activeTilesetId!;

  const sprite = g.currentTileset!;
  const texture = sprite.texture;

  const canvas = g.app.renderer.extract.canvas(texture) as HTMLCanvasElement;
  const bitmap = await createImageBitmap(canvas);

  // Add all single-tile groups by default
  const cols = Math.floor(sprite.width / gridSize);
  const rows = Math.floor(sprite.height / gridSize);
  // Build a single ImageData snapshot so we can quickly test transparency per tile
  const imageData = getImageDataFromBitmap(bitmap);

  store.dispatch(uiActions.loadingPalette(true));
  let chunk: TileGroup[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const coords: Rect = {
        ul: { x: x * gridSize, y: y * gridSize },
        br: { x: (x + 1) * gridSize, y: (y + 1) * gridSize },
      };
      // Skip empty tiles (all pixels fully transparent)
      if (isRectTransparent(imageData, coords)) continue;

      const id = genGroupId({ coords, tsId });
      chunk.push({
        id,
        pos: coords,
        tilesetId: tsId,
        gridSize,
        zIndices: [],
        name: "",
        tags: [],
        pinned: false,
      });
      if (chunk.length > 10) {
        store.dispatch(
          tsActions.bulkAddSinglePaletteTiles({ tsId, groups: chunk })
        );
        store.dispatch(tsActions.setScanPos(coords));
        await schedulerYield();
        chunk = [];
      }
    }
  }

  if (chunk.length > 0) {
    store.dispatch(
      tsActions.bulkAddSinglePaletteTiles({ tsId, groups: chunk })
    );
  }
  store.dispatch(tsActions.setScanPos(null));
  store.dispatch(uiActions.loadingPalette(false));
}

subState([(state) => state.tilesetEditor.activeZoomPan], (activeZoomPan) => {
  g.tilesetContainer.scale.set(activeZoomPan.zoom);
  g.tilesetContainer.position.set(activeZoomPan.pan.x, activeZoomPan.pan.y);
});
