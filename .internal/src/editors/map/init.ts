import debounce from "debounce";
import * as constants from "@/constants";
import { globals as gApp } from "@/globals";
import { actions, mapSelectors, selectors } from "@/slices/mapEditor";
import { store } from "@/store/store";
import { Mode } from "@/types/editor";
import { MapLayerName } from "@/types/layer";
import { MapObj } from "@/types/map";
import { SpatialIndex } from "@/types/spatial";
import { subState } from "@/utils/redux";
import { onVisible } from "@/utils/visible";
import { Vector2 } from "@/vec";
import { DropShadowFilter } from "pixi-filters";
import * as P from "pixi.js";
import { makeCheckerboard } from "../common/bg";
import { ClickDragger } from "../common/drag";
import { setupPanControls } from "../common/pan";
import { ToolDispatcher } from "../common/tooldispatch";
import { setupWheelZoom } from "../common/zoom";
import { drawBounds } from "./bounds";
import { globals as g } from "./globals";
import { setupKeys } from "./keys";
import { initLayerVisibility } from "./layers";
import { setupParallaxTicker } from "./parallax";
import { setupAutotiler } from "./tools/autotiler";
import { setupBoundsDragger } from "./tools/bounds";
import { setupZonePaintTool } from "./tools/zone";
import { setupFill } from "./tools/fill";
import { setupMover } from "./tools/move";
import { setupPlacer } from "./tools/place";
import { setupResizer, setupSelector } from "./tools/select";

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

  stage.eventMode = "static";

  const spatialIndex = new SpatialIndex<MapObj>({
    selectById: (state, id) =>
      mapSelectors.selectById(state.mapEditor.objects, id),
    filterLayer: ({ state, layer }) => {
      const ms = state.mapEditor;
      const layerMatches = layer === ms.layers.active;
      return !ms.layers.lockInactive || layerMatches;
    },
  });
  g.spatialIndex = spatialIndex;

  // Background container with checkerboard pattern (conventional transparent-bg look)
  g.backgroundContainer = new P.Container();
  stage.addChild(g.backgroundContainer);

  g.mapContainer = new P.Container();
  stage.addChild(g.mapContainer);

  g.mapContainer.eventMode = "static";

  stage.on("pointermove", (e) => {
    const localPos = e.getLocalPosition(g.mapContainer);
    g.mousePos = { x: localPos.x, y: localPos.y };
  });

  // Build checkerboard background
  const checkerboard = makeCheckerboard({
    container: g.backgroundContainer,
    width: app.screen.width,
    height: app.screen.height,
  });

  // Our selection outline must be on top of everything
  g.placableOutline = new P.Container();
  g.placableOutline.zIndex = Number.MAX_SAFE_INTEGER;
  g.mapContainer.addChild(g.placableOutline);

  // This stores the tileset object that we're about to place with the mouse
  g.placableContainer = new P.Container();
  g.mapContainer.addChild(g.placableContainer);
  g.placableContainer.zIndex = Number.MAX_SAFE_INTEGER - 1;
  g.mapContainer.sortableChildren = true;

  // This stores the outlines of selected objects
  g.selectionOutlines = new P.Container();
  g.selectionOutlines.eventMode = "none";
  g.selectionOutlines.interactiveChildren = false;
  g.selectionOutlines.zIndex = Number.MAX_SAFE_INTEGER - 1;
  g.mapContainer.addChild(g.selectionOutlines);

  g.rectSelectOutline = new P.Container();
  g.rectSelectOutline.zIndex = Number.MAX_SAFE_INTEGER - 2;
  g.mapContainer.addChild(g.rectSelectOutline);
  g.rectSelect = new P.Graphics();
  g.rectSelectOutline.addChild(g.rectSelect);

  g.boundsContainer = new P.Graphics();
  stage.addChild(g.boundsContainer);
  g.boundsMask = new P.Graphics();
  g.boundsContainer.setMask({ mask: g.boundsMask, inverse: true });
  g.mapContainer.addChild(g.boundsMask);
  drawBounds();

  // Background layer is added first so it renders behind all other layers
  const backgroundLayer = new P.Container();
  g.layerContainers[MapLayerName.Background] = backgroundLayer;
  g.mapContainer.addChild(backgroundLayer);

  const groundLayer = new P.Container();
  groundLayer.sortableChildren = true;
  g.layerContainers[MapLayerName.Ground] = groundLayer;
  g.mapContainer.addChild(groundLayer);

  const worldLayer = new P.Container();
  g.layerContainers[MapLayerName.Exterior] = worldLayer;
  g.mapContainer.addChild(worldLayer);

  const colliderLayer = new P.Container();
  g.layerContainers[MapLayerName.Sensors] = colliderLayer;
  g.mapContainer.addChild(colliderLayer);

  const placesLayer = new P.Container();
  placesLayer.filters = [new DropShadowFilter({ offset: { x: 0, y: 0 } })];
  g.layerContainers[MapLayerName.Special] = placesLayer;
  g.mapContainer.addChild(placesLayer);

  gApp.mapEditorReconciler.attachCanvas({
    layerContainers: g.layerContainers,
    spatialIndex,
  });

  setupKeys(canvas);

  const toolDispatcher = new ToolDispatcher(app);

  // Register the zone paint tool BEFORE ClickDragger so it gets first
  // priority on pointer events. ClickDragger.onPointerDown always returns true,
  // so any tool that needs to intercept events must be registered first.
  const zonePaintTool = setupZonePaintTool();
  toolDispatcher.registerTool(zonePaintTool);

  const cd = new ClickDragger<Mode>({
    app,
    container: stage,
    coordsRelativeTo: g.mapContainer,
    checkPointerOver: (localPos: Vector2): string[] => {
      const hits = spatialIndex.getObjects({
        pos: localPos,
      });
      return hits.map((h) => h.id);
    },
  });
  toolDispatcher.registerTool(cd);

  setupFill({ cd });
  setupResizer(cd);
  setupSelector({ cd, spatialIndex });
  g.mover = setupMover(cd);
  setupPlacer({ cd, spatialIndex });
  setupAutotiler({ cd, spatialIndex });
  setupBoundsDragger(cd);
  setupWheelZoom({
    canvas,
    stage,
    container: g.mapContainer,
    // Debounce, because redux state changes can lag if we're scrolling fast
    onZoomChange: debounce((zp) => {
      store.dispatch(actions.setZoomPan(zp));
    }, 50),
  });
  const panner = setupPanControls({
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
  toolDispatcher.registerTool(panner);

  initLayerVisibility();
  setupParallaxTicker(app);

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

  let firstRedraw = true;
  onVisible(canvas, () => {
    if (firstRedraw) {
      // Center the map container on the stage with zoom at 1
      const stageWidth = app.screen.width;
      const stageHeight = app.screen.height;

      const stageCenterX = stageWidth / 2;
      const stageCenterY = stageHeight / 2;

      panner.setPosition({ x: stageCenterX, y: stageCenterY }, true);
    }
    redrawLayout();
    firstRedraw = false;
  });

  gApp.mapEditorApp = app;
  g.initialized = true;
  return app;
}

subState([selectors.selectMode], (mode) => {
  if (mode === "duplicate") {
    g.mover.startDuplicateMove();
  }
});
