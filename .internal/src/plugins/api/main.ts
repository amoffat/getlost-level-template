import express from "express";
import type { Plugin } from "vite";
import { router as backgroundRouter } from "./background";
import { router as execRouter } from "./exec";
import { router as filesRouter } from "./files";
import { router as gitRouter } from "./git";
import {
  router as localeRouter,
  systemRouter as systemLocaleRouter,
} from "./locale";
import { router as mapRouter } from "./map";
import { router as pathgraphRouter } from "./pathgraph";
import { router as scriptRouter } from "./script";
import { router as speakerImageRouter } from "./speakerImage";
import { router as storyRouter } from "./story";
import { router as tilesetRouter } from "./tileset";

const app = express();
const rootRouter = express.Router({ mergeParams: true });
const levelRouter = express.Router({ mergeParams: true });
const apiRouter = express.Router({ mergeParams: true });

export default function expressApi(): Plugin {
  return {
    name: "express-api",
    apply: "serve",
    configureServer(server) {
      app.use(express.json({ limit: "5mb" }));

      app.use("/", rootRouter);
      rootRouter.use("/level", levelRouter);
      rootRouter.use("/api", apiRouter);

      levelRouter.use("/pathgraph.gz", pathgraphRouter);
      levelRouter.use("/tilesets", tilesetRouter);
      levelRouter.use("/backgrounds", backgroundRouter);
      levelRouter.use("/speakers", speakerImageRouter);
      levelRouter.use("/map.cbor.gz", mapRouter);
      levelRouter.use("/story.cbor.gz", storyRouter);
      levelRouter.use("/main.js", scriptRouter);

      rootRouter.use("/locales/system", systemLocaleRouter);
      levelRouter.use("/locales", localeRouter);

      rootRouter.use("/files", filesRouter);

      apiRouter.use("/git", gitRouter);
      apiRouter.use("/exec", execRouter);

      server.middlewares.use("/", app);
    },
  };
}
