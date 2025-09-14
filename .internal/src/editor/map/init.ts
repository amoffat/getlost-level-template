import * as P from "pixi.js";
import { subscribeToSelector } from "../../utils/redux";
import { groupStroke } from "../common/strokes";
import { setupWheelZoom } from "../common/zoom";
import { makeBackground } from "../tileset/bg";
import { globals as g } from "./globals";

const tilesetCache = new Map<string, P.Texture>();

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

  g.gridSnap = 16;
  stage.interactive = true;

  // Background container with checkerboard pattern (conventional transparent-bg look)
  g.backgroundContainer = new P.Container();
  stage.addChild(g.backgroundContainer);

  g.mapContainer = new P.Container();
  stage.addChild(g.mapContainer);

  // Build checkerboard background
  makeBackground(g.backgroundContainer);

  g.placableContainer = new P.Container();
  g.mapContainer.addChild(g.placableContainer);
  g.mapContainer.sortableChildren = true;

  // Listen for animate update
  app.ticker.add(() => {});

  const mouseToPos = (e: P.FederatedPointerEvent) => {
    const pos = g.mapContainer.toLocal(e.global);
    return {
      x: Math.floor(pos.x / g.gridSnap) * g.gridSnap,
      y: Math.floor(pos.y / g.gridSnap) * g.gridSnap,
    };
  };

  stage.on("pointermove", (e) => {
    e.preventDefault();

    if (g.placableSprite) {
      const pos = mouseToPos(e);
      g.placableContainer.position = pos;
    }
  });

  stage.on("pointerdown", (e) => {
    e.preventDefault();
    if (g.placableSprite) {
      const sprite = new P.Sprite(g.placableSprite.texture);
      const pos = mouseToPos(e);
      sprite.position = pos;
      g.mapContainer.addChild(sprite);
    }
  });

  setupWheelZoom({ stage, container: g.mapContainer });

  canvas.addEventListener("mouseover", () => {
    canvas.focus();
  });
  canvas.addEventListener("mouseout", () => {
    canvas.blur();
  });
  return app;
}

subscribeToSelector(
  (state) => state.mapEditor.place,
  (place) => {
    if (!place) return;

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

subscribeToSelector(
  (state) => state.tilesetEditor.activeTileset,
  async (tileset) => {
    if (!tileset) return;
    if (tilesetCache.has(tileset.id)) return;

    const tex = await P.Assets.load<P.Texture>({
      src: tileset.objectUrl,
      parser: "loadTextures",
    });
    tex.source.scaleMode = "nearest";
    tilesetCache.set(tileset.id, tex);
  }
);
