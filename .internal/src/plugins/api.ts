import * as fflate from "fflate";
import { unlinkSync, writeFileSync } from "fs";
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
        "/pathgraph",
        express.raw({ type: "application/octet-stream", limit: "10mb" }),
        (req, res) => {
          const u8 = new Uint8Array(req.body);
          const compressed = fflate.compressSync(u8);
          writeFileSync(graphFile, compressed);
          res.sendStatus(204);
        }
      );

      app.delete("/pathgraph", (_req, res) => {
        try {
          unlinkSync(graphFile);
          res.sendStatus(204);
        } catch (error) {
          console.error("Error deleting path graph:", error);
          res.sendStatus(500);
        }
      });

      // Mount under /api
      server.middlewares.use("/api", app);
    },
  };
}
