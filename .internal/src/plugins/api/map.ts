import express from "express";
import * as fs from "fs";
import { resolve } from "path";
import { atomicWriteFileSync } from "../../utils/file";

const internalDir = process.cwd();
const repoDir = resolve(internalDir, "..");
const levelDir = resolve(repoDir, "level");
const mapFile = resolve(levelDir, "map.cbor");

export const router = express.Router({ mergeParams: true });

// GET "/" — serve the map file if it exists
router.get("/", (_req, res) => {
  try {
    if (!fs.existsSync(mapFile)) {
      res.sendStatus(404);
      return;
    }
    res.type("application/cbor").sendFile(mapFile, (err) => {
      if (err) {
        console.error("Error sending map:", err);
        if (!res.headersSent) res.sendStatus(500);
      }
    });
  } catch (error) {
    console.error("Error handling map get:", error);
    res.sendStatus(500);
  }
});

// PUT "/" — save raw CBOR body
router.put(
  "/",
  express.raw({
    type: ["application/cbor", "application/octet-stream"],
    limit: "10mb",
  }),
  (req, res) => {
    try {
      fs.mkdirSync(levelDir, { recursive: true });
      const buf = Buffer.from(req.body as any);
      atomicWriteFileSync(mapFile, buf);

      res.sendStatus(204);
    } catch (error) {
      console.error("Error saving map:", error);
      res.sendStatus(500);
    }
  }
);

// DELETE "/" — remove persisted map (optional convenience)
router.delete("/", (_req, res) => {
  try {
    if (fs.existsSync(mapFile)) fs.unlinkSync(mapFile);
    res.sendStatus(204);
  } catch (error) {
    console.error("Error deleting map:", error);
    res.sendStatus(500);
  }
});
