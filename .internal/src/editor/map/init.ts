import * as P from "pixi.js";
import { subscribeToSelector } from "../../utils/redux";
import { setupWheelZoom } from "../common/zoom";
import { makeBackground } from "../tileset/bg";
import { globals as g } from "./globals";

const tilesetCache = new Map<string, P.Texture>();

export async function init(parent: HTMLElement): Promise<P.Application> {
  // Create a new application
  const app = new P.Application();

  // Initialize the application
  await app.init({ backgroundAlpha: 0, resizeTo: parent });
  const stage = app.stage;

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

  stage.on("pointermove", (e) => {
    e.preventDefault();

    if (g.placableSprite) {
      const pos = g.mapContainer.toLocal(e.global);
      g.placableContainer.x = Math.floor(pos.x / g.gridSnap) * g.gridSnap;
      g.placableContainer.y = Math.floor(pos.y / g.gridSnap) * g.gridSnap;
    }
  });

  stage.on("pointerdown", (e) => {
    e.preventDefault();
    if (g.placableSprite) {
      const pos = g.mapContainer.toLocal(e.global);
      const placePosX = Math.floor(pos.x / g.gridSnap) * g.gridSnap;
      const placePosY = Math.floor(pos.y / g.gridSnap) * g.gridSnap;

      const sprite = new P.Sprite(g.placableSprite.texture);
      sprite.x = placePosX;
      sprite.y = placePosY;
      g.mapContainer.addChild(sprite);
    }
  });

  setupWheelZoom({ stage, container: g.mapContainer });

  return app;
}

subscribeToSelector(
  (state) => state.mapEditor.place,
  (place, state) => {
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
  }
);

subscribeToSelector(
  (state) => state.tilesetEditor.tileset,
  async (tileset) => {
    if (!tileset) return;

    const tex = await P.Assets.load<P.Texture>({
      src: tileset.objectUrl,
      parser: "loadTextures",
    });
    tex.source.scaleMode = "nearest";
    tilesetCache.set(tileset.id, tex);
  }
);
