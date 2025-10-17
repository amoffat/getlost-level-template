import express from "express";
import type { Plugin } from "vite";
import { router as mapRouter } from "./map";
import { router as pathgraphRouter } from "./pathgraph";
import { router as storyRouter } from "./story";
import { router as tilesetRouter } from "./tileset";

const app = express();

export default function expressApi(): Plugin {
  return {
    name: "express-api",
    apply: "serve",
    configureServer(server) {
      app.use(express.json({ limit: "5mb" }));

      app.use("/pathgraph", pathgraphRouter);
      app.use("/tilesets", tilesetRouter);
      app.use("/map", mapRouter);
      app.use("/story", storyRouter);

      // Mount under /api
      server.middlewares.use("/api", app);
    },
  };
}
