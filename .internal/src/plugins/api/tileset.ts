import express from "express";
import formidable from "formidable";
import * as fs from "fs";
import { resolve } from "path";
import { gzipSync } from "zlib";
import { atomicWriteFileSync } from "../../utils/file";

const internalDir = process.cwd();
const repoDir = resolve(internalDir, "..");
const levelDir = resolve(repoDir, "level");
const texturesDir = resolve(levelDir, "textures");

export const router = express.Router({ mergeParams: true });

// Sanitize a requested tileset ID so it can be safely used as a filename stem.
// Allowed characters: a-z A-Z 0-9 . _ - (mirrors previous inline regex)
function sanitizeId(raw: unknown): string {
  return (typeof raw === "string" ? raw : "").replace(/[^a-zA-Z0-9._-]/g, "");
}

// GET "/" — list all tileset IDs (derived from *.cbor.gz files)
router.get("/", (_req, res) => {
  try {
    if (!fs.existsSync(texturesDir)) {
      res.json({ ids: [] });
      return;
    }
    const entries = fs.readdirSync(texturesDir, { withFileTypes: true });
    const ids = entries
      .filter((e) => e.isFile() && e.name.endsWith(".cbor.gz"))
      .map((e) => e.name.replace(/\.cbor\.gz$/i, ""));
    res.json({ ids });
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

    const gzPath = resolve(texturesDir, `${id}.cbor.gz`);
    if (!fs.existsSync(gzPath)) {
      res.sendStatus(404);
      return;
    }
    res.sendFile(
      gzPath,
      {
        headers: {
          "Content-Type": "application/cbor",
          "Content-Encoding": "gzip",
          Vary: "Accept-Encoding",
        },
      },
      (err) => {
        if (err) {
          console.error("Error sending gzipped tileset:", err);
          if (!res.headersSent) res.sendStatus(500);
        }
      }
    );
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

    const gzPath = resolve(texturesDir, `${id}.cbor.gz`);
    if (fs.existsSync(gzPath)) fs.unlinkSync(gzPath);

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

      fs.mkdirSync(texturesDir, { recursive: true });

      // Expect a single file under the explicit field name 'tileset'
      const pickFirst = (v: any) => (Array.isArray(v) ? v[0] : v);
      const incoming: any = pickFirst((files as any)["tileset"]);
      if (!incoming || !incoming.filepath) {
        res.status(400).send("Missing 'tileset' file in form data");
        return;
      }

      // Ignore multipart filename. Always write to <id>.cbor.gz
      const outPath = resolve(texturesDir, `${id}.cbor.gz`);

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
