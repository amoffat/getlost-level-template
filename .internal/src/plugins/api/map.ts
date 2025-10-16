import express from "express";
import * as fs from "fs";
import { resolve } from "path";
import { gzipSync } from "zlib";
import { atomicWriteFileSync } from "../../utils/file";

const internalDir = process.cwd();
const repoDir = resolve(internalDir, "..");
const levelDir = resolve(repoDir, "level");
const mapFileGz = resolve(levelDir, "map.cbor.gz");

export const router = express.Router({ mergeParams: true });

// GET "/" — serve the map file if it exists
router.get("/", (_req, res) => {
  try {
    if (!fs.existsSync(mapFileGz)) {
      res.sendStatus(404);
      return;
    }
    res.sendFile(
      mapFileGz,
      {
        headers: {
          "Content-Type": "application/cbor",
          "Content-Encoding": "gzip",
          Vary: "Accept-Encoding",
        },
      },
      (err) => {
        if (err) {
          console.error("Error sending gzipped map:", err);
          if (!res.headersSent) res.sendStatus(500);
        }
      }
    );
    return;
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
      // Persist gzipped CBOR
      const gz = gzipSync(buf);
      atomicWriteFileSync(mapFileGz, gz);

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
    if (fs.existsSync(mapFileGz)) fs.unlinkSync(mapFileGz);
    res.sendStatus(204);
  } catch (error) {
    console.error("Error deleting map:", error);
    res.sendStatus(500);
  }
});
