import { closeEnough } from "@/utils/math";
import { genGroupId } from "@/utils/tileset";
import * as P from "pixi.js";
import { selectors, actions as tsActions } from "../../slices/tilesetEditor";
import { store } from "../../store/store";
import { TileGroup } from "../../types/tilegroup";
import { subscribeToSelector } from "../../utils/redux";
import {
  ClickDragger,
  ClickDragListener,
  PointerEventData,
} from "../common/drag";
import { groupStroke } from "../common/strokes";
import { globals as g } from "./globals";
import { pressedKeys } from "./keys";
import { shouldOutline } from "./utils/outline";

function getGridSize(): number {
  return store.getState().tilesetEditor.grid.size;
}

function snapDown(n: number, size: number): number {
  return Math.floor(n / size) * size;
}

function snapUp(n: number, size: number): number {
  return Math.ceil(n / size) * size;
}

function isGrouping(): boolean {
  const mode = selectors.selectMode(store.getState());
  return mode === "group" || mode === "add";
}

class Grouper implements ClickDragListener {
  pointerDown(e: PointerEventData) {
    if (pressedKeys["Control"]) {
      const state = store.getState();
      if (!state.tilesetEditor.activeTilesetId) return;
      store.dispatch(tsActions.setMode("add"));
    } else {
      const state = store.getState();
      if (!state.tilesetEditor.activeTilesetId) return;
      store.dispatch(tsActions.setMode("group"));
    }
  }

  pointerUp(e: PointerEventData) {
    if (isGrouping()) {
      const tsState = store.getState().tilesetEditor;
      const tsId = tsState.activeTilesetId!;
      const gridSize = tsState.grid.size;

      const c = g.groupSelContainer;

      const coords = {
        ul: { x: c.x, y: c.y },
        br: { x: c.x + c.width, y: c.y + c.height },
      };
      const id = genGroupId({ coords, tsId });
      const group: TileGroup = {
        id,
        tilesetId: tsId,
        pos: coords,
        singleTile: false,
        gridSize,
        children: [],
        zIndices: [],
        name: "",
        tags: [],
        pinned: true,
      };

      group.singleTile =
        closeEnough(c.width, gridSize) && closeEnough(c.height, gridSize);

      store.dispatch(tsActions.addPaletteObject({ tsId, group }));
      store.dispatch(tsActions.popMode());
      g.groupSelGraphics.visible = false;
      g.groupSelContainer.setSize(0);
    }
  }

  pointerDrag(e: PointerEventData) {
    if (!isGrouping()) return;

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

export function setupGrouper(cd: ClickDragger) {
  cd.addListener(new Grouper());
}

async function drawGroups(groups: TileGroup[]) {
  if (!g.allGroupsOverlay) return;

  g.allGroupsOverlay.removeChildren();
  const gfx = new P.Graphics();
  const mask = new P.Graphics();
  g.allGroupsOverlay.addChild(mask);
  g.allGroupsOverlay.setMask({
    mask,
  });

  for (const group of groups.filter(shouldOutline)) {
    const rect = new P.Rectangle(
      group.pos.ul.x,
      group.pos.ul.y,
      group.pos.br.x - group.pos.ul.x,
      group.pos.br.y - group.pos.ul.y
    );
    gfx.rect(rect.x, rect.y, rect.width, rect.height).stroke(groupStroke);

    mask
      .rect(rect.x, rect.y, rect.width, rect.height)
      .fill({ color: 0x000000, alpha: 1 });
  }
  g.allGroupsOverlay.addChild(gfx);
}

subscribeToSelector(selectors.activeTilesetGroups, (groups) => {
  if (!groups) return;
  drawGroups(groups);
});
