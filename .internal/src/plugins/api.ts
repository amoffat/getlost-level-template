import * as fflate from "fflate";
import { writeFileSync } from "fs";
import { resolve } from "path";
import type { Plugin } from "vite";

import express from "express";

const internalDir = process.cwd();
const repoDir = resolve(internalDir, "..");
const levelDir = resolve(repoDir, "level");
const graphFile = resolve(levelDir, "pathgraph.gz");

export default function expressApi(): Plugin {
  return {
    name: "express-api",
    apply: "serve",
    configureServer(server) {
      const app = express();
      app.use(express.json({ limit: "5mb" }));

      app.post(
        "/save-path-graph",
        express.raw({ type: "application/octet-stream", limit: "10mb" }),
        (req, res) => {
          const u8 = new Uint8Array(req.body);
          const compressed = fflate.compressSync(u8);
          writeFileSync(graphFile, compressed);
          res.sendStatus(204);
        }
      );

      // Mount under /api
      server.middlewares.use("/api", app);
    },
  };
}
