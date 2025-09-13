import * as P from "pixi.js";
import { actions } from "../../slices/tilesetEditor";
import { store } from "../../store";
import { subscribeToSelector } from "../../utils/redux";
import { setupWheelZoom } from "../common/zoom";
import { makeBackground } from "./bg";
import { globals as g } from "./globals";
import { drawGrid } from "./grid";
import { setupGrouper } from "./group";
import { setupPanControls } from "./pan";
export { loadTileset } from "./loader";

export async function init(parent: HTMLElement): Promise<P.Application> {
  // Create a new application
  g.app = new P.Application();

  // Initialize the application
  await g.app.init({ backgroundAlpha: 0, resizeTo: parent });
  const stage = g.app.stage;

  // Tweak canvas interaction to avoid browser scroll/selection during drag
  const canvas = g.app.canvas;
  canvas.tabIndex = 0; // Make canvas focusable to receive keyboard events
  canvas.style.touchAction = "none";
  canvas.style.userSelect = "none";
  canvas.style.cursor = "default";
  g.canvas = canvas;

  // Background container with checkerboard pattern (conventional transparent-bg look)
  g.backgroundContainer = new P.Container();
  stage.addChild(g.backgroundContainer);

  // Foreground container for the tileset sprite
  g.tilesetContainer = new P.Container();
  g.tilesetContainer.interactive = true;
  stage.addChild(g.tilesetContainer);

  g.groupSelContainer = new P.Container();
  g.groupSelContainer.zIndex = 100;
  g.tilesetContainer.addChild(g.groupSelContainer);

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
  stage.hitArea = g.app.screen;

  // Overlay container for grid lines (kept separate so clearing tileset doesn't remove grid)
  g.gridContainer = new P.Container();

  // Build checkerboard background
  makeBackground(g.backgroundContainer);

  g.app.ticker.add(() => {
    //
  });

  setupWheelZoom({ stage, container: g.tilesetContainer });
  setupPanControls({
    stage,
    onPanningStart: () => {
      store.dispatch(actions.setMode("pan"));
    },
    onPanningEnd: () => {
      store.dispatch(actions.setMode(null));
    },
  });
  setupGrouper();

  canvas.addEventListener("mouseover", () => {
    canvas.focus();
  });
  canvas.addEventListener("mouseout", () => {
    canvas.blur();
  });
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
      canvas.style.cursor = "crosshair";
    } else if (mode === "pan") {
      canvas.style.cursor = "grabbing";
    } else if (mode === null) {
      canvas.style.cursor = "default";
    }
  }
);

subscribeToSelector(
  (state) => state.tilesetEditor.scanPos,
  (scanPos) => {
    if (scanPos === null) {
      g.scanPos.visible = false;
    } else {
      g.scanPos.visible = true;
      g.scanPos.position.set(scanPos.ul.x, scanPos.ul.y);
      g.scanPos.width = scanPos.br.x - scanPos.ul.x;
      g.scanPos.height = scanPos.br.y - scanPos.ul.y;
    }
  }
);
