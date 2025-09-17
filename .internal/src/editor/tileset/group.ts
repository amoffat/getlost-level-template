import * as P from "pixi.js";
import { selectors, actions as tsActions } from "../../slices/tilesetEditor";
import { store } from "../../store/store";
import { TileGroup } from "../../types/tilegroup";
import { closeEnough } from "../../utils/math";
import { subscribeToSelector } from "../../utils/redux";
import { genGroupId } from "../../utils/tileset";
import { groupStroke } from "../common/strokes";
import { ADD_KEY, GROUP_KEY } from "./constants";
import { globals as g } from "./globals";

let groupStart = { x: 0, y: 0 };
let groupEnd = { x: 0, y: 0 };
const groupsContainer = new P.Container();
groupsContainer.zIndex = 100;
// groupsContainer.blendMode = "screen";

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
  const mode = store.getState().tilesetEditor.mode;
  return mode === "group" || mode === "add";
}

export function setupGrouper() {
  const canvas = g.canvas;

  canvas.addEventListener("keydown", (e) => {
    if (e.repeat) return;
    if (e.key === GROUP_KEY) {
      e.preventDefault();
      const state = store.getState();
      if (!state.tilesetEditor.activeTilesetId) return;
      store.dispatch(tsActions.setMode("group"));
    } else if (e.key === ADD_KEY) {
      e.preventDefault();
      const state = store.getState();
      if (!state.tilesetEditor.activeTilesetId) return;
      store.dispatch(tsActions.setMode("add"));
    }
  });

  canvas.addEventListener("keyup", async (e) => {
    if (e.key === GROUP_KEY || e.key === ADD_KEY) {
      e.preventDefault();
      if (isGrouping()) {
        const tsState = store.getState().tilesetEditor;
        const tsId = tsState.activeTilesetId!;
        const gridSize = tsState.grid.size;

        const c = g.groupSelContainer;

        const coords = {
          ul: { x: c.x, y: c.y },
          br: { x: c.x + c.width, y: c.y + c.height },
        };
        const id = await genGroupId({ coords, tsId });
        const group: TileGroup = {
          id,
          tilesetId: tsId,
          pos: coords,
          singleTile: false,
          gridSize,
          children: [], // currently unknown
        };

        group.singleTile =
          closeEnough(c.width, gridSize) && closeEnough(c.height, gridSize);

        store.dispatch(tsActions.addPaletteObject({ tsId, group }));
        store.dispatch(tsActions.setMode(null));
      }
    }
  });

  g.tilesetContainer.on("pointermove", (e: P.FederatedPointerEvent) => {
    const size = getGridSize();
    const pos = g.tilesetContainer.toLocal(e.global);

    if (isGrouping()) {
      // Copy values to avoid keeping a mutable reference to PIXI's global point
      groupEnd = { x: snapUp(pos.x, size), y: snapUp(pos.y, size) };
    } else {
      const x = snapDown(pos.x, size);
      const y = snapDown(pos.y, size);
      groupStart = { x, y };
      groupEnd = { x, y };
    }
  });

  const gfx = new P.Graphics();
  gfx.visible = false;
  gfx.rect(0, 0, 16, 16).fill({ color: "0x00ff00", alpha: 0.3 });
  g.groupSelContainer.addChild(gfx);
  g.groupSelContainer.parent!.addChild(groupsContainer);

  g.app.ticker.add(() => {
    if (isGrouping()) {
      gfx.visible = true;
      const c = g.groupSelContainer;
      // Normalize rectangle so that width/height are always positive
      const left = Math.min(groupStart.x, groupEnd.x);
      const top = Math.min(groupStart.y, groupEnd.y);
      const width = Math.abs(groupEnd.x - groupStart.x);
      const height = Math.abs(groupEnd.y - groupStart.y);

      c.position.set(left, top);
      c.width = width;
      c.height = height;
    } else {
      gfx.visible = false;
    }
  });
}

async function drawGroups(groups: TileGroup[]) {
  groupsContainer.removeChildren();
  const g = new P.Graphics();
  const mask = new P.Graphics();
  groupsContainer.addChild(mask);
  groupsContainer.setMask({
    mask,
  });
  for (const group of groups.filter((g) => !g.singleTile)) {
    const rect = new P.Rectangle(
      group.pos.ul.x,
      group.pos.ul.y,
      group.pos.br.x - group.pos.ul.x,
      group.pos.br.y - group.pos.ul.y
    );
    g.rect(rect.x, rect.y, rect.width, rect.height).stroke(groupStroke);

    mask
      .rect(rect.x, rect.y, rect.width, rect.height)
      .fill({ color: 0x000000, alpha: 1 });
  }
  groupsContainer.addChild(g);
}

subscribeToSelector(selectors.activeTilesetGroups, (groups) => {
  if (!groups) return;
  drawGroups(groups);
});
