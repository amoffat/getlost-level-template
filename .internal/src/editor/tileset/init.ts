import * as constants from "@/constants";
import { globals as gApp } from "@/globals";
import { selectors, tileAdapter } from "@/slices/tilesetEditor";
import { SpatialIndex } from "@/types/spatial";
import { TileGroupTemplate } from "@/types/tilegroup";
import { Vector } from "@/vec";
import debounce from "debounce";
import * as P from "pixi.js";
import { actions } from "../../slices/tilesetEditor";
import { store } from "../../store/store";
import { subState } from "../../utils/redux";
import { onVisible } from "../../utils/visible";
import { makeBackground } from "../common/bg";
import { getCursorForMode } from "../common/cursor";
import { ClickDragger } from "../common/drag";
import { drawGrid } from "../common/grid";
import { setupPanControls } from "../common/pan";
import { setupWheelZoom } from "../common/zoom";
import { globals as g } from "./globals";
import { drawGridMask } from "./grid";
import { setupKeys } from "./keys";
import { setupFrameSelector } from "./tools/animator";
import { setupGrouper } from "./tools/group";
import { setupSelector } from "./tools/select";

export async function init(): Promise<P.Application> {
  // Create a new application
  const app = new P.Application();
  g.app = app;

  const spatialIndex = new SpatialIndex<TileGroupTemplate>({
    selectById: (state, id) => {
      const ts = selectors.activeTileset(state);
      if (!ts) return undefined;
      return tileAdapter
        .getSelectors()
        .selectById(ts.tiles, id) as TileGroupTemplate;
    },
    filterLayer: () => true,
  });
  g.spatialIndex = spatialIndex;

  // Initialize the application
  await app.init({ backgroundAlpha: 0 });
  const stage = app.stage;

  // Tweak canvas interaction to avoid browser scroll/selection during drag
  const canvas = app.canvas;
  canvas.tabIndex = 0; // Make canvas focusable to receive keyboard events
  canvas.style.touchAction = "none";
  canvas.style.userSelect = "none";
  canvas.style.cursor = "default";
  g.canvas = canvas;

  canvas.addEventListener("contextmenu", (e) => {
    e.preventDefault();
  });

  // Background container with checkerboard pattern (conventional transparent-bg look)
  g.backgroundContainer = new P.Container();
  stage.addChild(g.backgroundContainer);

  // Foreground container for the tileset sprite
  g.tilesetContainer = new P.Container();
  g.tilesetContainer.interactive = true;
  stage.addChild(g.tilesetContainer);

  g.selectionOutlines = new P.Container();
  g.selectionOutlines.zIndex = Number.MAX_SAFE_INTEGER;
  g.tilesetContainer.addChild(g.selectionOutlines);

  g.rectSelectOutline = new P.Container();
  g.rectSelectOutline.zIndex = Number.MAX_SAFE_INTEGER - 1;
  g.tilesetContainer.addChild(g.rectSelectOutline);

  g.rectSelect = new P.Graphics();
  g.rectSelectOutline.addChild(g.rectSelect);

  g.groupSelContainer = new P.Container();
  g.groupSelContainer.zIndex = Number.MAX_SAFE_INTEGER - 2;
  g.tilesetContainer.addChild(g.groupSelContainer);

  const allGroupsOverlay = new P.Container();
  allGroupsOverlay.zIndex = Number.MAX_SAFE_INTEGER - 3;
  g.tilesetContainer.addChild(allGroupsOverlay);
  g.allGroupsOverlay = allGroupsOverlay;

  const gfx = new P.Graphics();
  gfx.visible = false;
  gfx.rect(0, 0, 16, 16).fill({ color: "0x00ff00", alpha: 0.3 });
  g.groupSelContainer.addChild(gfx);
  g.groupSelGraphics = gfx;

  g.scanPos = new P.Container();
  g.scanPos.zIndex = 200;
  g.scanPos.visible = false;
  g.tilesetContainer.addChild(g.scanPos);
  const scanGfx = new P.Graphics();
  scanGfx.rect(0, 0, 16, 16).fill({ color: 0x00ff00, alpha: 0.75 });
  g.scanPos.addChild(scanGfx);

  // Route events directly to the stage to avoid per-move hit testing of children
  // (reduces pointermove overhead) and disable child event handling
  stage.interactive = true;
  // Make sure the stage captures pointer events across the whole viewport
  // and update its hitArea to the current screen when needed
  stage.hitArea = app.screen;

  // Overlay container for grid lines (kept separate so clearing tileset doesn't remove grid)
  g.gridContainer = new P.Container();

  // Build checkerboard background
  const checkerboard = makeBackground({
    container: g.backgroundContainer,
    width: app.screen.width,
    height: app.screen.height,
  });

  setupKeys(canvas);
  setupWheelZoom({
    canvas,
    stage,
    container: g.tilesetContainer,
    // Debounce, because redux state changes can lag if we're scrolling fast
    onZoomChange: debounce((zoomPan) => {
      store.dispatch(actions.setZoom(zoomPan.zoom));
      store.dispatch(actions.setPan(zoomPan.pan));
    }, 50),
  });
  setupPanControls({
    stage,
    panContainer: g.tilesetContainer,
    onPanningStart: () => {
      store.dispatch(actions.pushMode("pan"));
    },
    onPanningEnd: (panPos) => {
      store.dispatch(actions.setPan(panPos));
      store.dispatch(actions.popMode());
    },
  });

  const cd = new ClickDragger({
    app,
    container: stage,
    coordsRelativeTo: g.tilesetContainer,
    getGridSnap: () => {
      const state = store.getState();
      return state.tilesetEditor.grid.size;
    },
    checkPointerOver: (localPos: Vector): string[] => {
      const hits = spatialIndex.getObjects({
        pos: localPos,
      });
      return hits.map((h) => h.id);
    },
  });

  setupGrouper({ cd, spatialIndex });
  setupSelector({ cd, spatialIndex });
  setupFrameSelector({ cd, spatialIndex });

  gApp.tilesetEditorReconciler.attachCanvas({
    spatialIndex,
    container: g.tilesetContainer,
  });

  canvas.addEventListener("mouseover", () => {
    canvas.focus();
  });
  canvas.addEventListener("mouseout", () => {
    canvas.blur();
  });

  function redrawLayout() {
    const parent = document.getElementById(constants.tilesetEditorContainerId)!;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    checkerboard.width = rect.width;
    checkerboard.height = rect.height;
  }
  window.addEventListener("resize", redrawLayout);
  onVisible(canvas, redrawLayout);

  gApp.tilesetEditorApp = app;
  return app;
}

subState([(state) => state.tilesetEditor.grid.visible], (visible) => {
  g.grid.visible = visible;
});

subState([(state) => state.tilesetEditor.grid.size], (size) => {
  const coverSize = {
    x: g.currentTileset!.width,
    y: g.currentTileset!.height,
  };
  g.grid = drawGrid({
    gridSize: size,
    oldGrid: g.grid,
    gridContainer: g.tilesetContainer,
    coverSize,
  });
  const groups = selectors.activeTilesetGroups(store.getState());
  drawGridMask(groups);
});

subState([selectors.selectMode], (mode) => {
  const canvas = g.app.canvas;
  canvas.style.cursor = getCursorForMode(mode);
});

subState([(state) => state.tilesetEditor.scanPos], (scanPos) => {
  if (scanPos === null) {
    g.scanPos.visible = false;
  } else {
    g.scanPos.visible = true;
    g.scanPos.position.set(scanPos.x, scanPos.y);
    g.scanPos.width = scanPos.width;
    g.scanPos.height = scanPos.height;
  }
});
