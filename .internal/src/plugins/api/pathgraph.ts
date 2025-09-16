import express from "express";
import * as fflate from "fflate";
import { unlinkSync, writeFileSync } from "fs";
import { resolve } from "path";

const internalDir = process.cwd();
const repoDir = resolve(internalDir, "..");
const levelDir = resolve(repoDir, "level");
const graphFile = resolve(levelDir, "pathgraph.gz");

export const router = express.Router({ mergeParams: true });

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
