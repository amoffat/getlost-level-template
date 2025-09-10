import * as P from "pixi.js";
import { subscribeToSelector } from "../../utils/redux";
import { makeBackground } from "./bg";
import { globals as g } from "./globals";
import { drawGrid } from "./grid";
import { setupGrouper } from "./group";
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
  g.tilesetContainer.interactive = true;
  g.app.stage.addChild(g.tilesetContainer);

  g.groupSelContainer = new P.Container();
  g.groupSelContainer.zIndex = 100;
  g.tilesetContainer.addChild(g.groupSelContainer);

  // Route events directly to the stage to avoid per-move hit testing of children
  // (reduces pointermove overhead) and disable child event handling
  g.app.stage.interactive = true;
  // Make sure the stage captures pointer events across the whole viewport
  // and update its hitArea to the current screen when needed
  g.app.stage.hitArea = g.app.screen;

  // Overlay container for grid lines (kept separate so clearing tileset doesn't remove grid)
  g.gridContainer = new P.Container();

  // Build checkerboard background
  const checkerboard = makeBackground();
  g.backgroundContainer.addChild(checkerboard);

  g.app.ticker.add(() => {
    //
  });

  setupWheelZoom();
  setupPanControls();
  setupGrouper();

  return g.app;
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
