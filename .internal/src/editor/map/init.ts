import * as constants from "@/constants";
import { setReconciler } from "@/slices/map";
import { actions, selectors } from "@/slices/mapEditor";
import { store } from "@/store/store";
import { SpatialIndex } from "@/types/spatial";
import * as P from "pixi.js";
import { subscribeToSelector } from "../../utils/redux";
import { onVisible } from "../../utils/visible";
import { makeBackground } from "../common/bg";
import { getCursorForMode } from "../common/cursor";
import { ClickDragger } from "../common/drag";
import { setupPanControls } from "../common/pan";
import { setupWheelZoom } from "../common/zoom";
import { drawBounds } from "./bounds";
import { globals as g } from "./globals";
import { setupKeys } from "./keys";
import { initLayerVisibility } from "./layers";
import { ReduxReconciler } from "./reconciler";
import { setupMagicPainter } from "./tools/magicPaint";
import { setupMover } from "./tools/move";
import { setupPlacer } from "./tools/place";
import { setupSelector } from "./tools/select";

export async function init(): Promise<P.Application> {
  // Create a new application
  const app = new P.Application();
  g.app = app;

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

  g.gridSnap = 16;
  stage.interactive = true;

  // Background container with checkerboard pattern (conventional transparent-bg look)
  g.backgroundContainer = new P.Container();
  stage.addChild(g.backgroundContainer);

  g.mapContainer = new P.Container();
  stage.addChild(g.mapContainer);

  g.mapContainer.interactive = true;

  stage.on("pointermove", (e) => {
    const el = e.target;
    const mode = selectors.selectMode(store.getState());
    let cursor = getCursorForMode(mode);

    // Only objects in the map container are clickable
    const isOverObject = el && el !== g.mapContainer && el !== stage;

    if (isOverObject && mode === "select") {
      cursor = "pointer";
    }
    canvas.style.cursor = cursor;
  });

  // Build checkerboard background
  const checkerboard = makeBackground({
    container: g.backgroundContainer,
    width: app.screen.width,
    height: app.screen.height,
  });

  // Our selection outline must be on top of everything
  g.placableOutline = new P.Container();
  g.placableOutline.zIndex = Infinity;
  g.mapContainer.addChild(g.placableOutline);

  // This stores the tileset object that we're about to place with the mouse
  g.placableContainer = new P.Container();
  g.mapContainer.addChild(g.placableContainer);
  g.mapContainer.sortableChildren = true;

  // This stores the outlines of selected objects
  g.selectionOutlines = new P.Container();
  g.selectionOutlines.eventMode = "none";
  g.selectionOutlines.interactiveChildren = false;
  g.selectionOutlines.zIndex = Infinity - 1;
  g.mapContainer.addChild(g.selectionOutlines);

  g.rectSelectOutline = new P.Container();
  g.rectSelectOutline.zIndex = Infinity - 2;
  g.mapContainer.addChild(g.rectSelectOutline);

  g.boundsContainer = new P.Graphics();
  stage.addChild(g.boundsContainer);
  g.boundsMask = new P.Graphics();
  g.boundsContainer.setMask({ mask: g.boundsMask, inverse: true });
  g.mapContainer.addChild(g.boundsMask);
  drawBounds();

  g.layerContainers.ground = new P.Container();
  g.layerContainers.ground.sortableChildren = false;
  g.mapContainer.addChild(g.layerContainers.ground);
  g.layerContainers.world = new P.Container();
  g.mapContainer.addChild(g.layerContainers.world);

  g.metaContainer = new P.Container();
  g.mapContainer.addChild(g.metaContainer);

  const spatialIndex = new SpatialIndex();
  const reconciler = new ReduxReconciler({
    layerContainers: g.layerContainers,
    tilesetCache: g.tilesetCache,
    spatialIndex,
  });
  setReconciler(reconciler);

  const cd = new ClickDragger({
    app,
    container: stage,
    coordsRelativeTo: g.mapContainer,
  });

  setupSelector(cd, spatialIndex);
  g.mover = setupMover(cd);
  setupPlacer({ cd, spatialIndex });
  setupMagicPainter({ cd, spatialIndex });
  setupWheelZoom({
    canvas,
    stage,
    container: g.mapContainer,
    onZoomChange: (zp) => {
      store.dispatch(actions.setZoomPan(zp));
    },
  });
  setupPanControls({
    stage,
    panContainer: g.mapContainer,
    onPanningStart: () => {
      const mode = selectors.selectMode(store.getState());
      if (mode !== "pan") {
        store.dispatch(actions.pushMode("pan"));
      }
    },
    onPanningEnd: (_panPos) => {
      store.dispatch(actions.popMode());
    },
  });

  initLayerVisibility();

  canvas.addEventListener("mouseover", () => {
    canvas.focus();
  });
  canvas.addEventListener("mouseout", () => {
    canvas.blur();
  });

  setupKeys(canvas);

  function redrawLayout() {
    const parent = document.getElementById(constants.mapEditorContainerId)!;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    checkerboard.width = rect.width;
    checkerboard.height = rect.height;
    drawBounds();
  }
  window.addEventListener("resize", redrawLayout);
  onVisible(canvas, redrawLayout);

  g.initialized = true;
  return app;
}

subscribeToSelector([selectors.selectMode], (mode) => {
  const canvas = g.app.canvas;
  canvas.style.cursor = getCursorForMode(mode);
  if (mode === "duplicate") {
    g.mover.startDuplicateMove();
  }
});
