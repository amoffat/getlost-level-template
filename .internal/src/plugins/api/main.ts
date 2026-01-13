import express from "express";
import type { Plugin } from "vite";
import { router as filesRouter } from "./files";
import { router as localeRouter } from "./locale";
import { router as mapRouter } from "./map";
import { router as pathgraphRouter } from "./pathgraph";
import { router as storyRouter } from "./story";
import { router as tilesetRouter } from "./tileset";

const app = express();
const rootRouter = express.Router({ mergeParams: true });
const levelRouter = express.Router({ mergeParams: true });

export default function expressApi(): Plugin {
  return {
    name: "express-api",
    apply: "serve",
    configureServer(server) {
      app.use(express.json({ limit: "5mb" }));

      app.use("/", rootRouter);
      rootRouter.use("/level", levelRouter);
      levelRouter.use("/pathgraph.gz", pathgraphRouter);
      levelRouter.use("/tilesets", tilesetRouter);
      levelRouter.use("/map.cbor.gz", mapRouter);
      levelRouter.use("/story", storyRouter);
      levelRouter.use("/locales", localeRouter);

      rootRouter.use("/files", filesRouter);

      server.middlewares.use("/", app);
    },
  };
}
