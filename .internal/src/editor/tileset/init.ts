import * as P from "pixi.js";
import { setMode } from "../../slices/tilesetEditor";
import { store } from "../../store";
import { subscribeToSelector } from "../../utils/redux";
import * as constants from "./constants";

let app: P.Application;
let canvas: HTMLCanvasElement;
let tilesetContainer: P.Container;
let gridContainer: P.Container;
let backgroundContainer: P.Container;
let grid: P.Graphics;
let currentTileset: P.Sprite;

// Panning state
let isPanning = false;
let panStartGlobal = { x: 0, y: 0 };
let panStartContainer = { x: 0, y: 0 };

export async function init(parent: HTMLElement) {
  // Create a new application
  app = new P.Application();

  // Initialize the application
  await app.init({ backgroundAlpha: 0, resizeTo: parent });

  // Tweak canvas interaction to avoid browser scroll/selection during drag
  canvas = app.canvas;
  canvas.style.touchAction = "none";
  canvas.style.userSelect = "none";
  canvas.style.cursor = "default";

  // Background container with checkerboard pattern (conventional transparent-bg look)
  backgroundContainer = new P.Container();
  app.stage.addChild(backgroundContainer);

  // Foreground container for the tileset sprite
  tilesetContainer = new P.Container();
  app.stage.addChild(tilesetContainer);

  // Route events directly to the stage to avoid per-move hit testing of children
  // (reduces pointermove overhead) and disable child event handling
  app.stage.eventMode = "static";
  // Make sure the stage captures pointer events across the whole viewport
  // and update its hitArea to the current screen when needed
  app.stage.hitArea = app.screen;

  // Overlay container for grid lines (kept separate so clearing tileset doesn't remove grid)
  gridContainer = new P.Container();
  app.stage.addChild(gridContainer);

  // Build checkerboard background
  const checkerboard = makeBackground();
  backgroundContainer.addChild(checkerboard);

  // Keep layout responsive to available size
  app.ticker.add(() => {
    // Resize checkerboard to fill the stage
  });

  // Enable mouse wheel zooming on the tileset container
  setupWheelZoom();

  // Enable click-drag panning
  setupPanControls();

  setupKeyControls();

  return app;
}

export async function loadTileset(source: File) {
  // Clear any previous content
  tilesetContainer.removeChildren();
  tilesetContainer.setSize(0);
  tilesetContainer.position.set(0);

  const bitmap = await createImageBitmap(source);
  const texture = P.Texture.from(bitmap);
  texture.source.scaleMode = "nearest";

  const sprite = new P.Sprite(texture);
  sprite.x = 0;
  sprite.y = 0;
  sprite.roundPixels = true;

  currentTileset = sprite;

  tilesetContainer.addChild(sprite);
  grid = drawGrid(16);

  return sprite;
}

function makeBackground(): P.Container {
  const size = 16; // size of each square
  const canvas = document.createElement("canvas");
  canvas.width = size * 2;
  canvas.height = size * 2;
  const ctx = canvas.getContext("2d")!;

  // Colors for the checker pattern
  const c1 = "#bfbfbf"; // light gray
  const c2 = "#8f8f8f"; // darker gray

  // Draw 2x2 checkerboard
  ctx.fillStyle = c1;
  ctx.fillRect(0, 0, size * 2, size * 2);
  ctx.fillStyle = c2;
  ctx.fillRect(0, 0, size, size);
  ctx.fillRect(size, size, size, size);

  const tex = P.Texture.from(canvas);

  const checkerboard = new P.TilingSprite({
    texture: tex,
    width: app.screen.width,
    height: app.screen.height,
  });
  backgroundContainer.addChild(checkerboard);
  backgroundContainer.filters = [new P.BlurFilter({ strength: 3 })];
  return checkerboard;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function setupWheelZoom() {
  // Use Pixi's federated wheel events on the stage
  app.stage.on("wheel", (e: P.FederatedWheelEvent) => {
    // Prevent page scroll to make zoom feel native
    // e.preventDefault();

    // Determine zoom direction and amount using convenience deltaY
    const zoomFactor = e.deltaY < 0 ? 1.1 : 1 / 1.1;

    // Pointer position in global (world) coords provided by Pixi
    const global = e.global; // { x, y }

    // Convert the pointer position to the container's local coords BEFORE scaling
    const beforeLocal = tilesetContainer.toLocal(global);

    // Apply clamped uniform scaling
    const current = tilesetContainer.scale.x || 1;
    const next = clamp(
      current * zoomFactor,
      constants.MIN_ZOOM,
      constants.MAX_ZOOM
    );
    tilesetContainer.scale.set(next);

    // Compute where that same local point is AFTER scaling in global coords
    const afterGlobal = tilesetContainer.toGlobal(beforeLocal);

    // Translate so the zoom centers around the pointer
    tilesetContainer.position.x += global.x - afterGlobal.x;
    tilesetContainer.position.y += global.y - afterGlobal.y;
  });
}

function setupKeyControls() {
  window.addEventListener("keydown", (e) => {
    if (e.repeat) return;

    console.log("Key down:", e.key);
    if (e.key === "g") {
      store.dispatch(setMode("group"));
    }
  });

  window.addEventListener("keyup", (e) => {
    if (e.key === "g") {
      store.dispatch(setMode(null));
    }
  });
}

function setupPanControls() {
  app.stage.on("pointerdown", (e: P.FederatedPointerEvent) => {
    // Only start panning on primary button (left click)
    if (e.button !== 0) return;
    e.preventDefault();
    panStartGlobal = { x: e.global.x, y: e.global.y };
    panStartContainer = {
      x: tilesetContainer.position.x,
      y: tilesetContainer.position.y,
    };
    store.dispatch(setMode("pan"));
  });

  app.stage.on("pointermove", (e: P.FederatedPointerEvent) => {
    if (!isPanning) return;
    e.preventDefault();
    const dx = e.global.x - panStartGlobal.x;
    const dy = e.global.y - panStartGlobal.y;
    tilesetContainer.position.set(
      panStartContainer.x + dx,
      panStartContainer.y + dy
    );
  });

  const endPan = (e: P.FederatedPointerEvent) => {
    if (!isPanning) return;
    e.preventDefault();
    store.dispatch(setMode(null));
  };

  app.stage.on("pointerup", endPan);
  app.stage.on("pointerupoutside", endPan);
  app.stage.on("pointercancel", endPan);
}

function drawGrid(gridSize: number): P.Graphics {
  const container = tilesetContainer;

  const g = new P.Graphics();
  // Capture dimensions before adding the graphics to avoid affecting container bounds
  const w = Math.ceil(currentTileset.width);
  const h = Math.ceil(currentTileset.height);

  // Vertical grid lines
  for (let x = 0; x < w; x += gridSize) {
    g.moveTo(x, 0);
    g.lineTo(x, h);
  }
  // Ensure the rightmost boundary line is drawn
  g.moveTo(w, 0);
  g.lineTo(w, h);

  // Horizontal grid lines
  for (let y = 0; y < h; y += gridSize) {
    g.moveTo(0, y);
    g.lineTo(w, y);
  }
  // Ensure the bottom boundary line is drawn
  g.moveTo(0, h);
  g.lineTo(w, h);
  const gridStroke: P.StrokeInput = {
    color: 0x000000,
    width: 1,
    alpha: 0.3,
    pixelLine: true,
  };
  g.stroke(gridStroke);
  container.addChild(g);

  return g;
}

subscribeToSelector(
  (state) => state.tilesetEditor.grid.visible,
  (visible) => {
    grid.visible = visible;
  }
);

subscribeToSelector(
  (state) => state.tilesetEditor.grid.size,
  (size) => {
    grid.removeFromParent();
    grid = drawGrid(size);
  }
);

subscribeToSelector(
  (state) => state.tilesetEditor.mode,
  (mode) => {
    if (mode === "group") {
      console.log("Group mode activated");
      canvas.style.cursor = "crosshair";
    } else if (mode === "pan") {
      isPanning = true;
      canvas.style.cursor = "grabbing";
    } else if (mode === null) {
      console.log("Exited mode");
      isPanning = false;
      canvas.style.cursor = "default";
    }
  }
);
