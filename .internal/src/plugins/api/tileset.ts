import { LatestTilesetDoc } from "@/persist/tileset/schema";
import { decode, encode } from "cbor2";
import { registerEncoder } from "cbor2/encoder";
import express from "express";
import * as fs from "fs";
import { resolve } from "path";
import { gunzipSync, gzipSync } from "zlib";
import {
  tilesetRestrictedHeader,
  tilesetSourceHeader,
} from "../../constants/headers";
import { LoadTilesetsResponse } from "../../types/api/tileset";
import { atomicWriteFileSync } from "../../utils/file";
import { parseFormUpload, sanitizeId } from "./utils/assetRouter";

const internalDir = process.cwd();
const repoDir = resolve(internalDir, "..");
const levelDir = resolve(repoDir, "level");
const levelTsDir = resolve(levelDir, "tilesets");
const systemTsDir = resolve(internalDir, "assets", "tilesets");

// Node.js likes to encode Uint8Array as Buffers, but we need them to stay as
// Uint8Arrays
registerEncoder(Buffer, (b) => [
  NaN,
  new Uint8Array(b.buffer, b.byteOffset, b.byteLength),
]);

export const router = express.Router({ mergeParams: true });
type TilesetDoc = Omit<LatestTilesetDoc, "imageData"> &
  Partial<Pick<LatestTilesetDoc, "imageData">>;

/**
 * List tileset IDs from a directory.
 * CBOR files are always plain {id}.cbor.gz — restricted status only affects the PNG.
 */
function readDir(dirPath: string): string[] {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(".cbor.gz"))
    .map((e) => e.name.slice(0, -".cbor.gz".length));
}

/**
 * Resolve on-disk paths for a tileset ID in a given directory.
 * The CBOR is always {id}.cbor.gz. The PNG is {id}.restricted.png if restricted,
 * otherwise {id}.png. Restricted status is detected by which PNG exists.
 * Returns null if the CBOR does not exist.
 */
function pathForIdInDir(
  dirPath: string,
  id: string,
): { cbor: string; png: string; restricted: boolean } | null {
  const cbor = resolve(dirPath, `${id}.cbor.gz`);
  if (!fs.existsSync(cbor)) return null;
  const restrictedPng = resolve(dirPath, `${id}.restricted.png`);
  if (fs.existsSync(restrictedPng)) {
    return { cbor, png: restrictedPng, restricted: true };
  }
  return { cbor, png: resolve(dirPath, `${id}.png`), restricted: false };
}

function pathForId(
  id: string,
  checkSystem = true,
): { cbor: string; png: string; restricted: boolean; dir: string } | null {
  const level = pathForIdInDir(levelTsDir, id);
  if (level) return { ...level, dir: levelTsDir };
  if (checkSystem) {
    const system = pathForIdInDir(systemTsDir, id);
    if (system) return { ...system, dir: systemTsDir };
  }
  return null;
}

// GET "/" — list all tileset IDs (derived from *.cbor.gz files)
router.get("/", (_req, res) => {
  try {
    const levelTsIds = readDir(levelTsDir);
    const systemTsIds = readDir(systemTsDir);
    const resp: LoadTilesetsResponse = {
      ids: [...levelTsIds, ...systemTsIds],
    };
    res.json(resp);
  } catch (error) {
    console.error("Error listing tilesets:", error);
    res.sendStatus(500);
  }
});

// GET "/:id.cbor.gz" — serve the CBOR metadata combined with PNG image data
router.get("/:id.cbor.gz", (req, res) => {
  try {
    const id = sanitizeId((req.params as any)["id"]);
    if (!id) {
      res.status(400).send("Invalid id in URL");
      return;
    }
    console.log(`Serving tileset ${id}`);

    const paths = pathForId(id);
    if (!paths) {
      res.sendStatus(404);
      return;
    }

    try {
      let cborGz = fs.readFileSync(paths.cbor);
      const cborData = gunzipSync(cborGz);
      const doc = decode(cborData) as TilesetDoc;

      console.log(`Loading image data from PNG file ${paths.png}`);
      if (!fs.existsSync(paths.png)) {
        res.status(404).send("Tileset image data missing");
        return;
      }
      const imageBuffer = fs.readFileSync(paths.png);
      doc.imageData = new Uint8Array(imageBuffer);
      const combined = encode(doc);
      cborGz = gzipSync(combined);

      res.setHeader("Content-Type", "application/cbor");
      res.setHeader("Content-Encoding", "gzip");
      res.setHeader("Vary", "Accept-Encoding");
      res.setHeader(
        tilesetSourceHeader,
        paths.dir === levelTsDir ? "level" : "system",
      );
      if (paths.restricted) {
        res.setHeader(tilesetRestrictedHeader, "true");
      }
      res.send(cborGz);
    } catch (err) {
      console.error("Error sending gzipped tileset:", err);
      res.sendStatus(500);
    }
    return;
  } catch (error) {
    console.error("Error handling tileset get:", error);
    res.sendStatus(500);
  }
});

router.delete("/:id.cbor.gz", (req, res) => {
  try {
    const id = sanitizeId((req.params as any)["id"]);
    if (!id) {
      res.status(400).send("Invalid id in URL");
      return;
    }

    // Delete the CBOR and both PNG naming variants from the level directory
    for (const filename of [
      `${id}.cbor.gz`,
      `${id}.png`,
      `${id}.restricted.png`,
    ]) {
      const p = resolve(levelTsDir, filename);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }

    res.sendStatus(204);
  } catch (error) {
    console.error("Error deleting tileset:", error);
    res.sendStatus(500);
  }
});

// PATCH "/:id.cbor.gz" — replace only the PNG image data for an existing tileset.
// The CBOR metadata (including the immutable tileset ID) is left untouched.
router.patch("/:id.cbor.gz", async (req, res) => {
  const id = sanitizeId((req.params as any)["id"]);
  if (!id) {
    res.status(400).send("Invalid id in URL");
    return;
  }

  try {
    const parsed = await parseFormUpload(req, "image", 10 * 1024 * 1024);
    const paths = pathForId(id);
    if (!paths) {
      res.status(404).send("Tileset not found");
      return;
    }

    // Overwrite the PNG file in place (preserving restricted naming)
    atomicWriteFileSync(paths.png, parsed.buf);

    res.sendStatus(204);
  } catch (error) {
    console.error("Error replacing tileset image:", error);
    res.sendStatus(500);
  }
});

router.put("/:id.cbor.gz", (req, res) => {
  const id = sanitizeId((req.params as any)["id"]);
  if (!id) {
    res.status(400).send("Invalid id in URL");
    return;
  }

  parseFormUpload(req, "tileset", 10 * 1024 * 1024)
    .then(({ buf, fields }) => {
      try {
        // Read restricted flag from per-asset form field "tileset.restricted"
        const isRestricted = fields["tileset.restricted"]?.[0] === "1";

        // Decode the incoming CBOR data
        const doc = decode(buf) as TilesetDoc;

        // Extract imageData from the document
        const imageData = doc.imageData;
        delete doc.imageData;

        // Determine output directory: write back to whichever directory already owns this tileset.
        // Falls back to levelTsDir for new uploads.
        const existing = pathForId(id);
        const targetDir = existing?.dir ?? levelTsDir;
        fs.mkdirSync(targetDir, { recursive: true });
        const cborPath = resolve(targetDir, `${id}.cbor.gz`);
        const pngFilename = isRestricted ? `${id}.restricted.png` : `${id}.png`;
        const pngPath = resolve(targetDir, pngFilename);

        // Save the metadata (without imageData) as CBOR
        const metadataEncoded = encode(doc);
        const metadataGz = gzipSync(metadataEncoded);
        atomicWriteFileSync(cborPath, metadataGz);

        // Save the image data as a separate PNG file
        if (imageData && imageData.length > 0) {
          atomicWriteFileSync(pngPath, Buffer.from(imageData));
        }

        res.sendStatus(204);
      } catch (error) {
        console.error("Error saving upload:", error);
        res.sendStatus(500);
      }
    })
    .catch((e) => {
      console.error("Form parse error:", e.message);
      res.status(e.status).send(e.message);
    });
});
