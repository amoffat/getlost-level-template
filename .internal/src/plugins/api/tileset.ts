import express from "express";
import formidable from "formidable";
import * as fs from "fs";
import { resolve } from "path";
import { gzipSync } from "zlib";
import { tilesetSourceHeader } from "../../constants/headers";
import { LoadTilesetsResponse } from "../../types/api/tileset";
import { atomicWriteFileSync } from "../../utils/file";

const internalDir = process.cwd();
const repoDir = resolve(internalDir, "..");
const levelDir = resolve(repoDir, "level");
const levelTexDir = resolve(levelDir, "textures");
const systemTexDir = resolve(internalDir, "assets", "textures");

export const router = express.Router({ mergeParams: true });

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

function pathForId(id: string): string | null {
  const levelPath = resolve(levelTexDir, `${id}.cbor.gz`);
  if (fs.existsSync(levelPath)) return levelPath;

  const systemPath = resolve(systemTexDir, `${id}.cbor.gz`);
  if (fs.existsSync(systemPath)) return systemPath;

  return null;
}

// GET "/" — list all tileset IDs (derived from *.cbor.gz files)
router.get("/", (_req, res) => {
  try {
    const levelTsIds = readDir(levelTexDir);
    const systemTsIds = readDir(systemTexDir);
    const resp: LoadTilesetsResponse = {
      ids: [...levelTsIds, ...systemTsIds],
    };
    res.json(resp);
  } catch (error) {
    console.error("Error listing tilesets:", error);
    res.sendStatus(500);
  }
});

// GET "/:id" — serve the specific CBOR file
router.get("/:id", (req, res) => {
  try {
    const id = sanitizeId((req.params as any)["id"]);
    if (!id) {
      res.status(400).send("Invalid id in URL");
      return;
    }

    const gzPath = pathForId(id);
    if (!gzPath) {
      res.sendStatus(404);
      return;
    }

    try {
      const data = fs.readFileSync(gzPath);
      res.setHeader("Content-Type", "application/cbor");
      res.setHeader("Content-Encoding", "gzip");
      res.setHeader("Vary", "Accept-Encoding");
      res.setHeader(
        tilesetSourceHeader,
        gzPath.startsWith(levelTexDir) ? "level" : "system"
      );
      res.send(data);
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

router.delete("/:id", (req, res) => {
  try {
    const id = sanitizeId((req.params as any)["id"]);
    if (!id) {
      res.status(400).send("Invalid id in URL");
      return;
    }

    const gzPath = pathForId(id);
    if (gzPath) fs.unlinkSync(gzPath);

    res.sendStatus(204);
  } catch (error) {
    console.error("Error deleting tileset:", error);
    res.sendStatus(500);
  }
});

router.put("/:id", (req, res) => {
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

      // Use pathForId to determine where to write the file
      // If the file exists, overwrite it; otherwise write to level textures
      let outPath = pathForId(id);
      if (!outPath) {
        fs.mkdirSync(levelTexDir, { recursive: true });
        outPath = resolve(levelTexDir, `${id}.cbor.gz`);
      }

      const buf = fs.readFileSync(incoming.filepath);
      const gz = gzipSync(buf);
      atomicWriteFileSync(outPath, gz);

      res.sendStatus(204);
    } catch (error) {
      console.error("Error saving upload:", error);
      res.sendStatus(500);
    }
  });
});
