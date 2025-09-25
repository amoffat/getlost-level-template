import { selectors } from "@/slices/tilesetEditor";
import debounce from "debounce";
import * as P from "pixi.js";
import { actions } from "../../slices/tilesetEditor";
import { store } from "../../store/store";
import { subscribeToSelector } from "../../utils/redux";
import { onVisible } from "../../utils/visible";
import { makeBackground } from "../common/bg";
import { drawGrid } from "../common/grid";
import { setupPanControls } from "../common/pan";
import { setupWheelZoom } from "../common/zoom";
import { globals as g } from "./globals";
import { drawGridMask } from "./grid";
import { setupGrouper } from "./group";

export async function init(parent: HTMLElement): Promise<P.Application> {
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
  stage.hitArea = app.screen;

  // Overlay container for grid lines (kept separate so clearing tileset doesn't remove grid)
  g.gridContainer = new P.Container();

  // Build checkerboard background
  const checkerboard = makeBackground({
    container: g.backgroundContainer,
    width: app.screen.width,
    height: app.screen.height,
  });

  g.app.ticker.add(() => {
    //
  });

  setupWheelZoom({
    canvas,
    stage,
    container: g.tilesetContainer,
    // Debounce, because redux state changes can lag if we're scrolling fast
    onZoomChange: debounce((zoomPan) => {
      store.dispatch(actions.setZoom(zoomPan.zoom));
      store.dispatch(actions.setPan(zoomPan.pan));
    }, 100),
  });
  setupPanControls({
    stage,
    panContainer: g.tilesetContainer,
    onPanningStart: () => {
      store.dispatch(actions.pushMode("pan"));
    },
    onPanningEnd: (panPos) => {
      store.dispatch(actions.setPan(panPos));
      store.dispatch(actions.pushMode(null));
    },
  });
  setupGrouper();

  canvas.addEventListener("mouseover", () => {
    canvas.focus();
  });
  canvas.addEventListener("mouseout", () => {
    canvas.blur();
  });

  function redrawLayout() {
    const rect = parent.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    checkerboard.width = rect.width;
    checkerboard.height = rect.height;
  }
  window.addEventListener("resize", redrawLayout);
  onVisible(canvas, redrawLayout);

  return app;
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
    const coverSize = {
      x: g.currentTileset!.width,
      y: g.currentTileset!.height,
    };
    g.grid = drawGrid({
      gridSize: size,
      oldGrid: g.grid,
      gridContainer: g.tilesetContainer,
      coverSize,
    });
    const groups = selectors.activeTilesetGroups(store.getState());
    drawGridMask(groups);
  }
);

subscribeToSelector(selectors.selectMode, (mode) => {
  const canvas = g.app.canvas;
  if (mode === "group") {
    canvas.style.cursor = "crosshair";
  } else if (mode === "pan") {
    canvas.style.cursor = "grabbing";
  } else if (mode === null) {
    canvas.style.cursor = "grab";
  } else if (mode === "add") {
    canvas.style.cursor = "crosshair";
  }
});

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
