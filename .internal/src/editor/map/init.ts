import { setReconciler } from "@/slices/map";
import { actions, selectors } from "@/slices/mapEditor";
import { store } from "@/store/store";
import { SpatialIndex } from "@/types/spatial";
import * as P from "pixi.js";
import { subscribeToSelector } from "../../utils/redux";
import { onVisible } from "../../utils/visible";
import { makeBackground } from "../common/bg";
import { setupPanControls } from "../common/pan";
import { setupWheelZoom } from "../common/zoom";
import { globals as g } from "./globals";
import { setupKeys } from "./keys";
import { setupPlacer } from "./place";
import { ReduxReconciler } from "./reconciler";
import { setupSelector } from "./select";

export async function init(parent: HTMLElement): Promise<P.Application> {
  console.assert(!g.initialized, "Map editor already initialized");

  // Create a new application
  const app = new P.Application();
  g.app = app;

  // Initialize the application
  await app.init({ backgroundAlpha: 0, resizeTo: parent });
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
    let cursor = "default";
    // Only objects in the map container are clickable
    if (el && el !== g.mapContainer && el !== stage) {
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
  g.selectionOutlines.zIndex = Infinity - 1;
  g.mapContainer.addChild(g.selectionOutlines);

  g.rectSelectOutline = new P.Container();
  g.rectSelectOutline.zIndex = Infinity - 2;
  g.mapContainer.addChild(g.rectSelectOutline);

  const spatialIndex = new SpatialIndex();
  const reconciler = new ReduxReconciler({
    root: g.mapContainer,
    tilesetCache: g.tilesetCache,
    spatialIndex,
  });
  setReconciler(reconciler);
  setupSelector(spatialIndex);

  // Listen for animate update
  app.ticker.add(() => {});

  setupPlacer();
  setupWheelZoom({ canvas, stage, container: g.mapContainer });
  setupPanControls({
    stage,
    panContainer: g.mapContainer,
    onPanningStart: () => {
      store.dispatch(actions.pushMode("pan"));
    },
    onPanningEnd: (panPos) => {
      store.dispatch(actions.popMode());
    },
  });

  canvas.addEventListener("mouseover", () => {
    canvas.focus();
  });
  canvas.addEventListener("mouseout", () => {
    canvas.blur();
  });

  setupKeys(canvas);

  function redrawLayout() {
    const rect = parent.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    checkerboard.width = rect.width;
    checkerboard.height = rect.height;
  }
  window.addEventListener("resize", redrawLayout);
  onVisible(canvas, redrawLayout);

  g.initialized = true;
  return app;
}

// Transfer our textures from the tileset editor to the map editor
subscribeToSelector(
  (state) => state.tilesetEditor.tilesets,
  async (tilesets, state) => {
    for (const tileset of Object.values(tilesets)) {
      const tex = await P.Assets.load<P.Texture>({
        src: tileset.objectUrl,
        parser: "loadTextures",
      });
      tex.source.scaleMode = "nearest";
      g.tilesetCache.set(tileset.id, tex);
    }
  }
);

subscribeToSelector(selectors.selectMode, (mode) => {
  const canvas = g.app.canvas;
  if (mode === "pan") {
    canvas.style.cursor = "grabbing";
  } else if (mode === "place") {
    canvas.style.cursor = "crosshair";
  } else if (mode === null) {
    canvas.style.cursor = "default";
  }
});
