import * as constants from "@/constants";
import { globals as gApp } from "@/globals";
import { actions, selectors, tileAdapter } from "@/slices/tilesetEditor";
import { store } from "@/store/store";
import { SpatialIndex } from "@/types/spatial";
import { TileGroupTemplate } from "@/types/tilegroup";
import { Mode } from "@/types/tileset";
import { subState } from "@/utils/redux";
import { onVisible } from "@/utils/visible";
import { Vector2 } from "@/vec";
import debounce from "debounce";
import * as P from "pixi.js";
import { makeCheckerboard } from "../common/bg";
import { ClickDragger } from "../common/drag";
import { setupPanControls } from "../common/pan";
import { ToolDispatcher } from "../common/tooldispatch";
import { setupWheelZoom } from "../common/zoom";
import { drawBounds } from "./bounds";
import { globals as g } from "./globals";
import { setupGrid } from "./grid";
import { setupKeys } from "./keys";
import { setupFrameSelector } from "./tools/animator";
import { setupCollider } from "./tools/collider";
import { setupGrouper } from "./tools/group";
import { setupSelector } from "./tools/select";
import { setupZIndexer } from "./tools/zindex";

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
  await app.init({ backgroundAlpha: 0, useBackBuffer: true });
  const stage = app.stage;
  stage.sortableChildren = true;
  stage.label = "Tileset Editor Stage";
  g.stage = stage;

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
  g.backgroundContainer.label = "Background Container";
  stage.addChild(g.backgroundContainer);

  // Foreground container for the tileset sprite
  g.tilesetContainer = new P.Container();
  g.tilesetContainer.zIndex = 20;
  g.tilesetContainer.label = "Tileset Container";
  g.tilesetContainer.eventMode = "static";
  g.tilesetContainer.sortableChildren = true;
  stage.addChild(g.tilesetContainer);

  const zIndexOverlay = new P.Container();
  zIndexOverlay.label = "Z-Index Overlay";
  zIndexOverlay.zIndex = Number.MAX_SAFE_INTEGER - 5;
  zIndexOverlay.sortableChildren = true;
  g.tilesetContainer.addChild(zIndexOverlay);
  g.zIndexOverlay = zIndexOverlay;

  g.selectionOutlines = new P.Container();
  g.selectionOutlines.label = "Selection Outlines";
  g.selectionOutlines.zIndex = Number.MAX_SAFE_INTEGER - 10;
  g.tilesetContainer.addChild(g.selectionOutlines);

  g.rectSelectOutline = new P.Container();
  g.rectSelectOutline.label = "Rectangle Select Outline";
  g.rectSelectOutline.zIndex = Number.MAX_SAFE_INTEGER - 20;
  g.tilesetContainer.addChild(g.rectSelectOutline);

  g.rectSelect = new P.Graphics();
  g.rectSelectOutline.addChild(g.rectSelect);

  g.groupSelContainer = new P.Container();
  g.groupSelContainer.label = "Group Selection Container";
  g.groupSelContainer.zIndex = Number.MAX_SAFE_INTEGER - 30;
  g.tilesetContainer.addChild(g.groupSelContainer);

  g.boundsContainer = new P.Graphics();
  g.boundsContainer.eventMode = "none";
  g.boundsContainer.zIndex = 10;
  stage.addChild(g.boundsContainer);
  g.boundsMask = new P.Graphics();
  g.boundsContainer.setMask({ mask: g.boundsMask, inverse: true });
  g.tilesetContainer.addChild(g.boundsMask);
  drawBounds();

  const allGroupsOverlay = new P.Container();
  allGroupsOverlay.label = "All Groups Overlay";
  allGroupsOverlay.zIndex = Number.MAX_SAFE_INTEGER - 40;
  g.tilesetContainer.addChild(allGroupsOverlay);
  g.allGroupsOverlay = allGroupsOverlay;

  const gfx = new P.Graphics();
  gfx.visible = false;
  gfx.rect(0, 0, 16, 16).fill({ color: 0x00ff00, alpha: 0.3 });
  g.groupSelContainer.addChild(gfx);
  g.groupSelGraphics = gfx;

  g.scanPos = new P.Container();
  g.scanPos.label = "Scan Position";
  g.scanPos.zIndex = 200;
  g.scanPos.visible = false;
  g.tilesetContainer.addChild(g.scanPos);
  const scanGfx = new P.Graphics();
  scanGfx.rect(0, 0, 16, 16).fill({ color: 0x00ff00, alpha: 0.75 });
  g.scanPos.addChild(scanGfx);

  // Route events directly to the stage to avoid per-move hit testing of children
  // (reduces pointermove overhead) and disable child event handling
  stage.eventMode = "static";
  // Make sure the stage captures pointer events across the whole viewport
  // and update its hitArea to the current screen when needed
  stage.hitArea = app.screen;

  // Overlay container for grid lines (kept separate so clearing tileset doesn't remove grid)
  g.gridContainer = new P.Container();
  g.gridContainer.label = "Grid Container";

  // Build checkerboard background
  const checkerboard = makeCheckerboard({
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
  const panner = setupPanControls({
    panContainer: g.tilesetContainer,
    onPanningStart: () => {
      store.dispatch(actions.pushMode("pan"));
    },
    onPanningEnd: (panPos) => {
      store.dispatch(actions.setPan(panPos));
      store.dispatch(actions.popMode());
    },
  });

  const toolDispatcher = new ToolDispatcher(app);
  toolDispatcher.registerTool(panner);

  const cd = new ClickDragger<Mode>({
    app,
    container: stage,
    coordsRelativeTo: g.tilesetContainer,
    checkPointerOver: (localPos: Vector2): string[] => {
      const hits = spatialIndex.getObjects({
        pos: localPos,
      });
      return hits.map((h) => h.id);
    },
  });

  setupGrouper({ cd, spatialIndex });
  setupSelector({ cd, spatialIndex });
  setupFrameSelector({ cd, spatialIndex });
  const zIndexTool = setupZIndexer();
  toolDispatcher.registerTool(zIndexTool);
  const colliderTool = setupCollider();
  toolDispatcher.registerTool(colliderTool);
  setupGrid();

  toolDispatcher.registerTool(cd);

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
    drawBounds();

    store.dispatch(
      actions.setCanvasSize({ width: rect.width, height: rect.height }),
    );
  }
  window.addEventListener("resize", redrawLayout);
  onVisible(canvas, redrawLayout);

  gApp.tilesetEditorApp = app;
  return app;
}

subState([(state) => state.tilesetEditor.grid.visible], (visible) => {
  g.grid.visible = visible;
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
