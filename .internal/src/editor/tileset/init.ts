import * as P from "pixi.js";
import { setMode } from "../../slices/tilesetEditor";
import { store } from "../../store";
import { subscribeToSelector } from "../../utils/redux";
import { makeBackground } from "./bg";
import { globals as g } from "./globals";
import { drawGrid } from "./grid";
import { setupPanControls } from "./pan";
import { setupWheelZoom } from "./zoom";
export { loadTileset } from "./loader";

export async function init(parent: HTMLElement) {
  // Create a new application
  g.app = new P.Application();

  // Initialize the application
  await g.app.init({ backgroundAlpha: 0, resizeTo: parent });

  // Tweak canvas interaction to avoid browser scroll/selection during drag
  const canvas = g.app.canvas;
  canvas.style.touchAction = "none";
  canvas.style.userSelect = "none";
  canvas.style.cursor = "default";

  // Background container with checkerboard pattern (conventional transparent-bg look)
  g.backgroundContainer = new P.Container();
  g.app.stage.addChild(g.backgroundContainer);

  // Foreground container for the tileset sprite
  g.tilesetContainer = new P.Container();
  g.app.stage.addChild(g.tilesetContainer);

  // Route events directly to the stage to avoid per-move hit testing of children
  // (reduces pointermove overhead) and disable child event handling
  g.app.stage.eventMode = "static";
  // Make sure the stage captures pointer events across the whole viewport
  // and update its hitArea to the current screen when needed
  g.app.stage.hitArea = g.app.screen;

  // Overlay container for grid lines (kept separate so clearing tileset doesn't remove grid)
  g.gridContainer = new P.Container();
  g.app.stage.addChild(g.gridContainer);

  // Build checkerboard background
  const checkerboard = makeBackground();
  g.backgroundContainer.addChild(checkerboard);

  // Keep layout responsive to available size
  g.app.ticker.add(() => {
    // Resize checkerboard to fill the stage
  });

  // Enable mouse wheel zooming on the tileset container
  setupWheelZoom();

  // Enable click-drag panning
  setupPanControls();

  setupKeyControls();

  return g.app;
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

subscribeToSelector(
  (state) => state.tilesetEditor.grid.visible,
  (visible) => {
    g.grid.visible = visible;
  }
);

subscribeToSelector(
  (state) => state.tilesetEditor.grid.size,
  (size) => {
    g.grid.removeFromParent();
    g.grid = drawGrid(size);
  }
);

subscribeToSelector(
  (state) => state.tilesetEditor.mode,
  (mode) => {
    const canvas = g.app.canvas;
    if (mode === "group") {
      console.log("Group mode activated");
      canvas.style.cursor = "crosshair";
    } else if (mode === "pan") {
      canvas.style.cursor = "grabbing";
    } else if (mode === null) {
      console.log("Exited mode");
      canvas.style.cursor = "default";
    }
  }
);
