import { LatestTilesetDoc } from "@/persist/tileset/schema";
import { decode, encode } from "cbor2";
import { registerEncoder } from "cbor2/encoder";
import express from "express";
import formidable from "formidable";
import * as fs from "fs";
import { resolve } from "path";
import { gunzipSync, gzipSync } from "zlib";
import { tilesetSourceHeader } from "../../constants/headers";
import { LoadTilesetsResponse } from "../../types/api/tileset";
import { atomicWriteFileSync } from "../../utils/file";

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

// Sanitize a requested tileset ID so it can be safely used as a filename stem.
// Allowed characters: a-z A-Z 0-9 . _ - (mirrors previous inline regex)
function sanitizeId(raw: unknown): string {
  return (typeof raw === "string" ? raw : "").replace(/[^a-zA-Z0-9._-]/g, "");
}

function readDir(path: string): string[] {
  const entries = fs.readdirSync(path, { withFileTypes: true });
  const ids = entries
    .filter((e) => e.isFile() && e.name.endsWith(".cbor.gz"))
    .map((e) => e.name.replace(/\.cbor\.gz$/i, ""));
  return ids;
}

function pathForId(
  id: string,
  restricted?: boolean
): { cbor: string; png: string } | null {
  // Check level directory (with or without restricted subdirectory)
  const levelCborPath = resolve(levelTsDir, `${id}.cbor.gz`);
  const levelPngPath = restricted
    ? resolve(levelTsDir, "restricted", `${id}.png`)
    : resolve(levelTsDir, `${id}.png`);
  if (fs.existsSync(levelCborPath)) {
    return { cbor: levelCborPath, png: levelPngPath };
  }

  // Check system directory (with or without restricted subdirectory)
  const systemCborPath = resolve(systemTsDir, `${id}.cbor.gz`);
  const systemPngPath = restricted
    ? resolve(systemTsDir, "restricted", `${id}.png`)
    : resolve(systemTsDir, `${id}.png`);
  if (fs.existsSync(systemCborPath)) {
    return { cbor: systemCborPath, png: systemPngPath };
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

// GET "/:id" — serve the CBOR metadata combined with PNG image data
router.get("/:id.cbor.gz", (req, res) => {
  try {
    const id = sanitizeId((req.params as any)["id"]);
    if (!id) {
      res.status(400).send("Invalid id in URL");
      return;
    }
    console.log(`Serving tileset ${id}`);

    // First try to read the CBOR to check if restricted property is set
    const initialPaths = pathForId(id, false);
    if (!initialPaths || !fs.existsSync(initialPaths.cbor)) {
      res.sendStatus(404);
      return;
    }

    try {
      // Read and decompress the CBOR metadata to check restricted flag
      let cborGz = fs.readFileSync(initialPaths.cbor);
      const cborData = gunzipSync(cborGz);
      const doc = decode(cborData) as TilesetDoc;

      // Now get the correct paths based on restricted property
      const paths = pathForId(id, doc.tileset.restricted);
      if (!paths) {
        res.sendStatus(404);
        return;
      }

      if (doc.imageData === undefined) {
        console.log("Loading image data from PNG file");

        if (!fs.existsSync(paths.png)) {
          res.status(404).send("Tileset image data missing");
          return;
        }
        // Read the PNG image data (fs.readFileSync returns Buffer, convert to Uint8Array)
        const imageBuffer = fs.readFileSync(paths.png);

        // Combine metadata with image data (convert Buffer to Uint8Array for consistency)
        doc.imageData = new Uint8Array(imageBuffer);

        // Re-encode and send the combined data
        const combined = encode(doc);
        cborGz = gzipSync(combined);
      }

      res.setHeader("Content-Type", "application/cbor");
      res.setHeader("Content-Encoding", "gzip");
      res.setHeader("Vary", "Accept-Encoding");
      res.setHeader(
        tilesetSourceHeader,
        paths.cbor.startsWith(levelTsDir) ? "level" : "system"
      );
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

    const paths = pathForId(id);
    if (paths) {
      if (fs.existsSync(paths.cbor)) fs.unlinkSync(paths.cbor);
      if (fs.existsSync(paths.png)) fs.unlinkSync(paths.png);
    }

    res.sendStatus(204);
  } catch (error) {
    console.error("Error deleting tileset:", error);
    res.sendStatus(500);
  }
});

router.put("/:id.cbor.gz", (req, res) => {
  const form = formidable({
    multiples: false,
    maxFileSize: 10 * 1024 * 1024,
  });
  form.parse(req, (err, _fields, files) => {
    try {
      if (err) {
        console.error("Form parse error:", err);
        res.status(400).send("Invalid form data");
        return;
      }

      // Use id from URL to build output filename <id>.cbor
      const id = sanitizeId((req.params as any)["id"]);
      if (!id) {
        res.status(400).send("Invalid id in URL");
        return;
      }

      // Expect a single file under the explicit field name 'tileset'
      const pickFirst = (v: any) => (Array.isArray(v) ? v[0] : v);
      const incoming: any = pickFirst((files as any)["tileset"]);
      if (!incoming || !incoming.filepath) {
        res.status(400).send("Missing 'tileset' file in form data");
        return;
      }

      // Read and decode the incoming CBOR data
      const buf = fs.readFileSync(incoming.filepath);
      const doc = decode(buf) as TilesetDoc;

      // Extract imageData from the document
      const imageData = doc.imageData;
      delete doc.imageData;

      // Determine output paths
      let paths = pathForId(id, doc.tileset.restricted);
      if (!paths) {
        fs.mkdirSync(levelTsDir, { recursive: true });
        if (doc.tileset.restricted) {
          fs.mkdirSync(resolve(levelTsDir, "restricted"), { recursive: true });
        }
        paths = {
          cbor: resolve(levelTsDir, `${id}.cbor.gz`),
          png: doc.tileset.restricted
            ? resolve(levelTsDir, "restricted", `${id}.png`)
            : resolve(levelTsDir, `${id}.png`),
        };
      }

      // Save the metadata (without imageData) as CBOR
      const metadataEncoded = encode(doc);
      const metadataGz = gzipSync(metadataEncoded);
      atomicWriteFileSync(paths.cbor, metadataGz);

      // Save the image data as a separate PNG file
      if (imageData && imageData.length > 0) {
        atomicWriteFileSync(paths.png, Buffer.from(imageData));
      }

      res.sendStatus(204);
    } catch (error) {
      console.error("Error saving upload:", error);
      res.sendStatus(500);
    }
  });
});
