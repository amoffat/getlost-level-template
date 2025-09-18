import { actions, selectors } from "@/slices/mapEditor";
import { store } from "@/store/store";
import * as P from "pixi.js";
import { subscribeToSelector } from "../../utils/redux";
import { onVisible } from "../../utils/visible";
import { setupPanControls } from "../common/pan";
import { groupStroke } from "../common/strokes";
import { setupWheelZoom } from "../common/zoom";
import { makeBackground } from "../tileset/bg";
import { globals as g } from "./globals";
import { setupPlacer } from "./place";

const tilesetCache = new Map<string, P.Texture>();
let initialized = false;

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

  g.gridSnap = 16;
  stage.interactive = true;

  // Background container with checkerboard pattern (conventional transparent-bg look)
  g.backgroundContainer = new P.Container();
  stage.addChild(g.backgroundContainer);

  g.mapContainer = new P.Container();
  stage.addChild(g.mapContainer);

  // Build checkerboard background
  const checkerboard = makeBackground(g.backgroundContainer);

  g.placableContainer = new P.Container();
  g.mapContainer.addChild(g.placableContainer);
  g.mapContainer.sortableChildren = true;

  // Listen for animate update
  app.ticker.add(() => {});

  setupPlacer();
  setupWheelZoom({ stage, container: g.mapContainer });
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

  function redrawLayout() {
    const rect = parent.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    checkerboard.width = rect.width;
    checkerboard.height = rect.height;
  }
  window.addEventListener("resize", redrawLayout);
  onVisible(canvas, redrawLayout);

  initialized = true;
  return app;
}

subscribeToSelector(
  (state) => state.mapEditor.place,
  (place) => {
    if (!place) return;
    if (!initialized) return;

    g.gridSnap = place.gridSize;
    const rect = place.pos;

    const frame = new P.Rectangle(
      rect.ul.x,
      rect.ul.y,
      rect.br.x - rect.ul.x,
      rect.br.y - rect.ul.y
    );
    const tsTex = tilesetCache.get(place.tilesetId);
    if (!tsTex) return;
    const texture = new P.Texture({ source: tsTex.source, frame });
    const sprite = new P.Sprite(texture);
    g.placableContainer.removeChildren();
    g.placableContainer.addChild(sprite);
    g.placableSprite = sprite;

    const mask = new P.Graphics();
    mask
      .rect(0, 0, frame.width, frame.height)
      .fill({ color: 0x00ff00, alpha: 1 });
    g.placableContainer.addChild(mask);

    const gfx = new P.Graphics();
    gfx.rect(0, 0, frame.width, frame.height).stroke(groupStroke);
    g.placableContainer.addChild(gfx);
    gfx.setMask({
      mask,
      inverse: true,
    });
  }
);

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
      tilesetCache.set(tileset.id, tex);
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
