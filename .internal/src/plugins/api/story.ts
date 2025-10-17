import express from "express";
import * as fs from "fs";
import { resolve } from "path";
import { gzipSync } from "zlib";
import { atomicWriteFileSync } from "../../utils/file";

const internalDir = process.cwd();
const repoDir = resolve(internalDir, "..");
const levelDir = resolve(repoDir, "level");
const storyCborGz = resolve(levelDir, "story.cbor.gz");

export const router = express.Router({ mergeParams: true });

// GET "/" — serve the gzipped CBOR story file if it exists
router.get("/", (_req, res) => {
  try {
    if (!fs.existsSync(storyCborGz)) {
      res.sendStatus(404);
      return;
    }
    res.sendFile(
      storyCborGz,
      {
        headers: {
          "Content-Type": "application/cbor",
          "Content-Encoding": "gzip",
          Vary: "Accept-Encoding",
        },
      },
      (err) => {
        if (err) {
          console.error("Error sending gzipped story:", err);
          if (!res.headersSent) res.sendStatus(500);
        }
      }
    );
  } catch (error) {
    console.error("Error handling story get:", error);
    res.sendStatus(500);
  }
});

// PUT "/" — save DOT text body
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
      const gz = gzipSync(buf);
      atomicWriteFileSync(storyCborGz, gz);
      res.sendStatus(204);
    } catch (error) {
      console.error("Error saving story:", error);
      res.sendStatus(500);
    }
  }
);
