import { selectors as mapSelectors } from "@/slices/map";
import { RootState, store } from "@/store/store";
import { SpatialIndex } from "@/types/spatial";
import { ZoomPan } from "@/types/zoompan";
import { Vector } from "@/vec";
import * as P from "pixi.js";
import { onVisible } from "../../utils/visible";
import { makeBackground } from "./bg";
import { getCursorForMode } from "./cursor";
import { ClickDragger } from "./drag";
import { trackKeyPresses } from "./keypress";
import { setupPanControls } from "./pan";
import { ReduxReconciler } from "./reconciler";
import { setupWheelZoom } from "./zoom";

type MovementMode = "select" | "move" | "pan";

export class Editor {
  app: P.Application;
  stage: P.Container;
  mapContainer: P.Container;
  backgroundContainer: P.Container;
  placableContainer: P.Container;
  placableOutline: P.Container;
  selectionOutlines: P.Container;
  rectSelectOutline: P.Container;
  layerContainers: Record<string, P.Container>;
  spatialIndex: SpatialIndex;
  clickDragger: ClickDragger;

  constructor({
    app,
    stage,
    mapContainer,
    backgroundContainer,
    placableContainer,
    placableOutline,
    selectionOutlines,
    rectSelectOutline,
    layerContainers,
    spatialIndex,
    clickDragger,
  }: {
    app: P.Application;
    stage: P.Container;
    mapContainer: P.Container;
    backgroundContainer: P.Container;
    placableContainer: P.Container;
    placableOutline: P.Container;
    selectionOutlines: P.Container;
    rectSelectOutline: P.Container;
    layerContainers: Record<string, P.Container>;
    spatialIndex: SpatialIndex;
    clickDragger: ClickDragger;
  }) {
    this.app = app;
    this.stage = stage;
    this.mapContainer = mapContainer;
    this.backgroundContainer = backgroundContainer;
    this.placableContainer = placableContainer;
    this.placableOutline = placableOutline;
    this.selectionOutlines = selectionOutlines;
    this.rectSelectOutline = rectSelectOutline;
    this.layerContainers = layerContainers;
    this.spatialIndex = spatialIndex;
    this.clickDragger = clickDragger;
  }
}

export async function init<Mode extends MovementMode>({
  containerId,
  layers,
  getMode,
  pushMode,
  popMode,
  setZoomPan,
  onRedraw,
  keyHandlers,
  reconciler,
}: {
  containerId: string;
  layers: string[];
  getMode: (state: RootState) => Mode;
  pushMode: (mode: Mode) => void;
  popMode: () => void;
  setZoomPan: (zoomPan: ZoomPan) => void;
  onRedraw: () => void;
  keyHandlers?: Record<string, (pressed: boolean) => void>;
  reconciler: ReduxReconciler;
}): Promise<Editor> {
  // Create a new application
  const app = new P.Application();

  // Initialize the application
  await app.init({ backgroundAlpha: 0 });
  const stage = app.stage;

  // Tweak canvas interaction to avoid browser scroll/selection during drag
  const canvas = app.canvas;
  canvas.tabIndex = 0; // Make canvas focusable to receive keyboard events
  canvas.style.touchAction = "none";
  canvas.style.userSelect = "none";
  canvas.style.cursor = "default";

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
  const backgroundContainer = new P.Container();
  stage.addChild(backgroundContainer);

  const mapContainer = new P.Container();
  mapContainer.interactive = true;
  stage.addChild(mapContainer);

  stage.on("pointermove", (e) => {
    const state = store.getState();
    const mode = getMode(state);
    let cursor = getCursorForMode(mode);

    const localPos = e.getLocalPosition(mapContainer);

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
    container: backgroundContainer,
    width: app.screen.width,
    height: app.screen.height,
  });

  // Our selection outline must be on top of everything
  const placableOutline = new P.Container();
  placableOutline.zIndex = Infinity;
  mapContainer.addChild(placableOutline);

  // This stores the tileset object that we're about to place with the mouse
  const placableContainer = new P.Container();
  mapContainer.addChild(placableContainer);
  mapContainer.sortableChildren = true;

  // This stores the outlines of selected objects
  const selectionOutlines = new P.Container();
  selectionOutlines.eventMode = "none";
  selectionOutlines.interactiveChildren = false;
  selectionOutlines.zIndex = Infinity - 1;
  mapContainer.addChild(selectionOutlines);

  const rectSelectOutline = new P.Container();
  rectSelectOutline.zIndex = Infinity - 2;
  mapContainer.addChild(rectSelectOutline);

  const layerContainers: Record<string, P.Container> = {};
  for (const layerName of layers) {
    const layer = new P.Container();
    layerContainers[layerName] = layer;
    mapContainer.addChild(layer);
  }

  reconciler.attachCanvas({ layerContainers, spatialIndex });

  const clickDragger = new ClickDragger({
    app,
    container: stage,
    coordsRelativeTo: mapContainer,
    checkPointerOver: (localPos: Vector): string[] => {
      const hits = spatialIndex.getObjects({
        pos: localPos,
      });
      return hits.map((h) => h.id);
    },
  });

  setupWheelZoom({
    canvas,
    stage,
    container: mapContainer,
    onZoomChange: (zp) => {
      setZoomPan(zp);
    },
  });
  setupPanControls({
    stage,
    panContainer: mapContainer,
    onPanningStart: () => {
      const mode = getMode(store.getState());
      if (mode !== "pan") {
        pushMode("pan" as Mode);
      }
    },
    onPanningEnd: (_panPos) => {
      popMode();
    },
  });

  canvas.addEventListener("mouseover", () => {
    canvas.focus();
  });
  canvas.addEventListener("mouseout", () => {
    canvas.blur();
  });

  trackKeyPresses({
    element: canvas,
    pressedKeys: {},
    handlers: keyHandlers,
  });

  function redrawLayout() {
    const parent = document.getElementById(containerId)!;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    checkerboard.width = rect.width;
    checkerboard.height = rect.height;

    onRedraw();
  }
  window.addEventListener("resize", redrawLayout);
  onVisible(canvas, redrawLayout);

  return new Editor({
    app,
    stage,
    mapContainer,
    backgroundContainer,
    placableContainer,
    placableOutline,
    selectionOutlines,
    rectSelectOutline,
    layerContainers,
    spatialIndex,
    clickDragger,
  });
}
