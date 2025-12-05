import * as constants from "@/constants";
import { globals as gApp } from "@/globals";
import { selectors, actions as tsActions } from "@/slices/tilesetEditor";
import { store } from "@/store/store";
import { addPaletteObjectsThunk } from "@/thunks/tileset";
import { snap } from "@/types/rect";
import { SpatialIndex } from "@/types/spatial";
import { TemplateType } from "@/types/templates";
import { TileGroupTemplate } from "@/types/tilegroup";
import { TilesetObjectTemplate } from "@/types/tilesetobject";
import { averageOklab } from "@/utils/color";
import { oklabHilbertIndex } from "@/utils/hilbert";
import { amountOpaquePixels, subImageData } from "@/utils/image";
import { subState } from "@/utils/redux";
import { rectToBBox } from "@/utils/spatial";
import { genImageId, genTileId } from "@/utils/tileset";
import { Vector2 } from "@/vec";
import { notifications } from "@mantine/notifications";
import * as P from "pixi.js";
import {
  ClickDragger,
  ClickDragListener,
  PointerEventData,
} from "../../common/drag";
import { groupStroke } from "../../common/strokes";
import { globals as g } from "../globals";
import { shouldOutline } from "../utils/outline";

function getGridSize(): Vector2 {
  const state = store.getState();
  const ts = selectors.activeTileset(state);
  if (!ts || ts.composite) {
    return { x: 1, y: 1 };
  }
  const size = state.tilesetEditor.grid.size;
  return { x: size, y: size };
}

function isGroupActionMode(mode: string | null): boolean {
  return (
    mode === "add-group" || mode === "delete-group" || mode === "replace-group"
  );
}

class Grouper implements ClickDragListener {
  private spatialIndex: SpatialIndex<TilesetObjectTemplate>;

  constructor(spatialIndex: SpatialIndex<TilesetObjectTemplate>) {
    this.spatialIndex = spatialIndex;
  }

  pointerDown(_e: PointerEventData) {
    const state = store.getState();
    if (!state.tilesetEditor.activeTilesetId) return;
    const mode = state.tilesetEditor.selectedTool;
    if (mode === "add-group") {
      store.dispatch(tsActions.setMode("add-group"));
    } else if (mode === "delete-group") {
      store.dispatch(tsActions.setMode("delete-group"));
    } else if (mode === "replace-group") {
      store.dispatch(tsActions.setMode("replace-group"));
    }
  }

  async pointerUp(e: PointerEventData) {
    const state = store.getState();
    const tsState = state.tilesetEditor;
    const mode = selectors.selectMode(state);

    const coords = snap(e.hitbox, getGridSize());
    const isAdd = mode === "add-group" || mode === "replace-group";
    const isDelete = mode === "delete-group" || mode === "replace-group";

    let finishMode = false;
    if (isDelete) {
      const tsId = tsState.activeTilesetId!;

      const searchBounds = rectToBBox(coords, 1);
      const hitIds = this.spatialIndex.search(searchBounds).map((h) => h.id);

      store.dispatch(tsActions.deletePaletteObjects({ tsId, ids: hitIds }));
      finishMode = true;
    }

    if (isAdd) {
      const tsId = tsState.activeTilesetId!;
      const gridSize = tsState.grid.size;

      // The tile group id is a hash of the image data for it. This way a tile
      // can appear anywhere in any tileset, which makes it easier to fix maps
      // if a tileset gets deleted or renamed.
      const tsImageData = gApp.tilesetImageDataCache.get(tsId)!;
      let imgData: ImageData | undefined;
      try {
        imgData = subImageData(tsImageData, coords);
      } catch {
        notifications.show({
          title: "Grouping error",
          message: "The selected area must only contain tiles.",
          color: "red",
        });
        finishMode = true;
      }

      if (imgData) {
        const coverage = amountOpaquePixels(imgData);
        const imageId = await genImageId(imgData);
        const id = await genTileId({
          tsId,
          pos: coords,
        });
        const avgColor = averageOklab(imgData);

        const zIndices: number[] = [];
        for (let x = 0; x < coords.width / gridSize; x++) {
          zIndices.push(0.5);
        }
        zIndices.push(0.5);

        const group: TileGroupTemplate = {
          id,
          type: TemplateType.TileGroup,
          imageId,
          tilesetId: tsId,
          pos: coords,
          gridSize: { x: gridSize, y: gridSize },
          zIndices,
          name: "",
          tags: [],
          pinned: true,
          coverage,
          avgColor,
          hilbertIndex: oklabHilbertIndex(avgColor),
          walkSound: constants.defaultWalkSound,
          friction: constants.defaultFriction,
          traction: constants.defaultTraction,
          hidden: false,
          flipX: false,
          tint: null,
        };
        store.dispatch(addPaletteObjectsThunk({ tsId, objs: [group] }));
        finishMode = true;
      }
    }

    if (finishMode) {
      g.groupSelGraphics.visible = false;
      g.groupSelContainer.setSize(0);
      store.dispatch(tsActions.setMode(null));
    }
  }

  pointerDrag(e: PointerEventData) {
    const state = store.getState();
    const mode = selectors.selectMode(state);

    if (!isGroupActionMode(mode)) return;

    g.groupSelGraphics.visible = true;
    const c = g.groupSelContainer;

    const hb = snap(e.hitbox, getGridSize());
    c.position.set(hb.x, hb.y);
    c.width = hb.width;
    c.height = hb.height;
  }
}

export function setupGrouper({
  cd,
  spatialIndex,
}: {
  cd: ClickDragger;
  spatialIndex: SpatialIndex<TilesetObjectTemplate>;
}) {
  cd.addListener(new Grouper(spatialIndex));
}

function drawGroups(groups: TileGroupTemplate[], zoom: number) {
  if (!g.allGroupsOverlay) return;

  g.allGroupsOverlay.removeChildren();
  const gfx = new P.Graphics();
  const mask = new P.Graphics();
  g.allGroupsOverlay.addChild(mask);
  g.allGroupsOverlay.setMask({
    mask,
  });

  const stroke = { ...groupStroke, width: (groupStroke.width ?? 1) / zoom };

  for (const group of groups.filter(shouldOutline)) {
    gfx
      .rect(group.pos.x, group.pos.y, group.pos.width, group.pos.height)
      .stroke(stroke);

    mask
      .rect(group.pos.x, group.pos.y, group.pos.width, group.pos.height)
      .fill({ color: 0x000000, alpha: 1 });
  }
  g.allGroupsOverlay.addChild(gfx);
}

subState(
  [
    selectors.activeTilesetGroups,
    (state) => state.tilesetEditor.activeZoomPan.zoom,
  ],
  (groups, zoom) => {
    if (!groups) return;
    drawGroups(groups, zoom);
  }
);
