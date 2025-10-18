import * as constants from "@/constants";
import { globals as gApp } from "@/globals";
import { selectors as mapSelectors } from "@/slices/map";
import { actions, selectors } from "@/slices/mapEditor";
import { store } from "@/store/store";
import { MapLayerName } from "@/types/layer";
import { SpatialIndex } from "@/types/spatial";
import { subState } from "@/utils/redux";
import { onVisible } from "@/utils/visible";
import { Vector } from "@/vec";
import { DropShadowFilter } from "pixi-filters";
import * as P from "pixi.js";
import { makeBackground } from "../common/bg";
import { getCursorForMode } from "../common/cursor";
import { ClickDragger } from "../common/drag";
import { setupPanControls } from "../common/pan";
import { setupWheelZoom } from "../common/zoom";
import { drawBounds } from "./bounds";
import { globals as g } from "./globals";
import { setupKeys } from "./keys";
import { initLayerVisibility } from "./layers";
import { setupCollider } from "./tools/collider";
import { setupGateway } from "./tools/gateway";
import { setupMagicPainter } from "./tools/magicPaint";
import { setupMover } from "./tools/move";
import { setupPlacer } from "./tools/place";
import { setupSelector } from "./tools/select";

export async function init(): Promise<P.Application> {
  // Create a new application
  const app = new P.Application();
  g.app = app;

  // Initialize the application
  await app.init({
    backgroundAlpha: 0,
    resolution: 1, // Handle high DPI screens
    autoDensity: true, // Automatically adjust for high resolution
  });
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

  stage.interactive = true;

  const spatialIndex = new SpatialIndex({
    selectById: mapSelectors.selectById,
    filterLayer: (state, layer) => {
      const ms = state.mapEditor;
      return !ms.layers.lockInactive || layer === ms.layers.active;
    },
  });

  // Background container with checkerboard pattern (conventional transparent-bg look)
  g.backgroundContainer = new P.Container();
  stage.addChild(g.backgroundContainer);

  g.mapContainer = new P.Container();
  stage.addChild(g.mapContainer);

  g.mapContainer.interactive = true;

  stage.on("pointermove", (e) => {
    const state = store.getState();
    const mode = selectors.selectMode(state);
    let cursor = getCursorForMode(mode);

    const localPos = e.getLocalPosition(g.mapContainer);

    const hits = spatialIndex.getObjects({
      pos: localPos,
    });
    const isOverObject = hits.length > 0;

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

  const groundLayer = new P.Container();
  groundLayer.sortableChildren = false;
  g.layerContainers[MapLayerName.Ground] = groundLayer;
  g.mapContainer.addChild(groundLayer);

  const worldLayer = new P.Container();
  g.layerContainers[MapLayerName.World] = worldLayer;
  g.mapContainer.addChild(worldLayer);

  const colliderLayer = new P.Container();
  g.layerContainers[MapLayerName.Colliders] = colliderLayer;
  g.mapContainer.addChild(colliderLayer);

  const placesLayer = new P.Container();
  placesLayer.filters = [new DropShadowFilter({ offset: { x: 0, y: 0 } })];
  g.layerContainers[MapLayerName.Places] = placesLayer;
  g.mapContainer.addChild(placesLayer);

  gApp.mapEditorReconciler.attachCanvas({
    layerContainers: g.layerContainers,
    spatialIndex,
  });

  const keyPresses = setupKeys(canvas);

  const cd = new ClickDragger({
    app,
    container: stage,
    coordsRelativeTo: g.mapContainer,
    checkPointerOver: (localPos: Vector): string[] => {
      const hits = spatialIndex.getObjects({
        pos: localPos,
      });
      return hits.map((h) => h.id);
    },
    getGridSnap: () => {
      if (!keyPresses["Control"]) return null;
      const state = store.getState();
      return state.mapEditor.grid.size;
    },
  });

  setupCollider({ cd, spatialIndex });
  setupSelector({ cd, spatialIndex });
  g.mover = setupMover(cd);
  setupPlacer({ cd, spatialIndex });
  setupMagicPainter({ cd, spatialIndex });
  setupGateway({ cd, spatialIndex });
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

subState([selectors.selectMode], (mode) => {
  const canvas = g.app.canvas;
  canvas.style.cursor = getCursorForMode(mode);
  if (mode === "duplicate") {
    g.mover.startDuplicateMove();
  }
});
