import express from "express";
import * as fflate from "fflate";
import * as fs from "fs";
import { unlinkSync, writeFileSync } from "fs";
import { resolve } from "path";

const internalDir = process.cwd();
const repoDir = resolve(internalDir, "..");
const levelDir = resolve(repoDir, "level");
const graphFile = resolve(levelDir, "pathgraph.gz");

export const router = express.Router({ mergeParams: true });

router.get("/", (_req, res) => {
  try {
    if (!fs.existsSync(graphFile)) {
      res.sendStatus(404);
      return;
    }
    res.sendFile(
      graphFile,
      {
        headers: {
          "Content-Encoding": "gzip",
          Vary: "Accept-Encoding",
        },
      },
      (err) => {
        if (err) {
          console.error("Error sending gzipped pathgraph:", err);
          if (!res.headersSent) res.sendStatus(500);
        }
      }
    );
    return;
  } catch (error) {
    console.error("Error handling pathgraph get:", error);
    res.sendStatus(500);
  }
});

router.post(
  "/",
  express.raw({ type: "application/octet-stream", limit: "10mb" }),
  (req, res) => {
    const u8 = new Uint8Array(req.body);
    const compressed = fflate.compressSync(u8);
    writeFileSync(graphFile, compressed);
    res.sendStatus(204);
  }
);

router.delete("/", (_req, res) => {
  try {
    unlinkSync(graphFile);
    res.sendStatus(204);
  } catch (error) {
    console.error("Error deleting path graph:", error);
    res.sendStatus(500);
  }
});
