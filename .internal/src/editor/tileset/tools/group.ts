import { selectors, actions as tsActions } from "@/slices/tilesetEditor";
import { store } from "@/store/store";
import { SpatialIndex } from "@/types/spatial";
import { TileGroup, TilesetObject } from "@/types/tilegroup";
import { subState } from "@/utils/redux";
import { genGroupId } from "@/utils/tileset";
import * as P from "pixi.js";
import {
  ClickDragger,
  ClickDragListener,
  PointerEventData,
} from "../../common/drag";
import { groupStroke } from "../../common/strokes";
import { globals as g } from "../globals";
import { shouldOutline } from "../utils/outline";

function getGridSize(): number {
  return store.getState().tilesetEditor.grid.size;
}

function snapDown(n: number, size: number): number {
  return Math.floor(n / size) * size;
}

function snapUp(n: number, size: number): number {
  return Math.ceil(n / size) * size;
}

function isGroupActionMode(mode: string | null): boolean {
  return (
    mode === "add-group" || mode === "delete-group" || mode === "replace-group"
  );
}

class Grouper implements ClickDragListener {
  private spatialIndex: SpatialIndex<TilesetObject>;

  constructor(spatialIndex: SpatialIndex<TilesetObject>) {
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

  pointerUp(_e: PointerEventData) {
    const state = store.getState();
    const tsState = state.tilesetEditor;
    const mode = selectors.selectMode(state);

    const c = g.groupSelContainer;
    const coords = {
      ul: { x: c.x, y: c.y },
      br: { x: c.x + c.width, y: c.y + c.height },
    };

    let finishMode = false;
    if (mode === "delete-group" || mode === "replace-group") {
      const tsId = tsState.activeTilesetId!;

      const innerPadding = 0.1;
      const searchBounds = {
        minX: coords.ul.x + innerPadding,
        minY: coords.ul.y + innerPadding,
        maxX: coords.br.x - innerPadding,
        maxY: coords.br.y - innerPadding,
      };
      const hitIds = this.spatialIndex.search(searchBounds).map((h) => h.id);

      store.dispatch(tsActions.deletePaletteObjects({ tsId, ids: hitIds }));
      finishMode = true;
    }

    if (mode === "add-group" || mode === "replace-group") {
      const tsId = tsState.activeTilesetId!;
      const gridSize = tsState.grid.size;

      const id = genGroupId({ coords, tsId });
      const group: TileGroup = {
        id,
        tilesetId: tsId,
        pos: coords,
        gridSize,
        zIndices: [],
        name: "",
        tags: [],
        pinned: true,
      };

      store.dispatch(tsActions.addPaletteObject({ tsId, group }));
      finishMode = true;
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

    const hb = e.hitbox;
    const gridSize = getGridSize();

    // Normalize rectangle so that width/height are always positive

    const left = snapDown(Math.min(hb.ul.x, hb.br.x), gridSize);
    const top = snapDown(Math.min(hb.ul.y, hb.br.y), gridSize);
    const right = snapUp(Math.max(hb.ul.x, hb.br.x), gridSize);
    const bottom = snapUp(Math.max(hb.ul.y, hb.br.y), gridSize);
    const width = right - left;
    const height = bottom - top;

    c.position.set(left, top);
    c.width = width;
    c.height = height;
  }
}

export function setupGrouper({
  cd,
  spatialIndex,
}: {
  cd: ClickDragger;
  spatialIndex: SpatialIndex<TilesetObject>;
}) {
  cd.addListener(new Grouper(spatialIndex));
}

async function drawGroups(groups: TileGroup[], zoom: number) {
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
    const rect = new P.Rectangle(
      group.pos.ul.x,
      group.pos.ul.y,
      group.pos.br.x - group.pos.ul.x,
      group.pos.br.y - group.pos.ul.y
    );
    gfx.rect(rect.x, rect.y, rect.width, rect.height).stroke(stroke);

    mask
      .rect(rect.x, rect.y, rect.width, rect.height)
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
