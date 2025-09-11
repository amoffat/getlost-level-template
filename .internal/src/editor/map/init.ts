import * as P from "pixi.js";
import { makeBackground } from "../tileset/bg";
import { globals as g } from "./globals";

export async function init(parent: HTMLElement): Promise<P.Application> {
  // Create a new application
  const app = new P.Application();

  // Initialize the application
  await app.init({ backgroundAlpha: 0, resizeTo: parent });
  const stage = app.stage;

  // Background container with checkerboard pattern (conventional transparent-bg look)
  g.backgroundContainer = new P.Container();
  stage.addChild(g.backgroundContainer);

  // Build checkerboard background
  makeBackground(g.backgroundContainer);

  // Listen for animate update
  app.ticker.add(() => {});

  return app;
}
