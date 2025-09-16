import express from "express";
import formidable from "formidable";
import * as fs from "fs";
import { resolve } from "path";

const internalDir = process.cwd();
const repoDir = resolve(internalDir, "..");
const levelDir = resolve(repoDir, "level");
const texturesDir = resolve(levelDir, "textures");

export const router = express.Router({ mergeParams: true });

// GET "/" — list all tileset IDs (derived from *.cbor files in level/textures)
router.get("/", (_req, res) => {
  try {
    if (!fs.existsSync(texturesDir)) {
      res.json({ ids: [] });
      return;
    }
    const entries = fs.readdirSync(texturesDir, { withFileTypes: true });
    const ids = entries
      .filter((e) => e.isFile() && e.name.endsWith(".cbor"))
      .map((e) => e.name.replace(/\.cbor$/i, ""));
    res.json({ ids });
  } catch (error) {
    console.error("Error listing tilesets:", error);
    res.sendStatus(500);
  }
});

// GET "/:id" — serve the specific CBOR file
router.get("/:id", (req, res) => {
  try {
    const idRaw = (req.params as any)["id"] as string | undefined;
    const id = (idRaw || "").replace(/[^a-zA-Z0-9._-]/g, "");
    if (!id) {
      res.status(400).send("Invalid id in URL");
      return;
    }

    const outPath = resolve(texturesDir, `${id}.cbor`);
    if (!fs.existsSync(outPath)) {
      res.sendStatus(404);
      return;
    }

    res.type("application/cbor").sendFile(outPath, (err) => {
      if (err) {
        console.error("Error sending tileset:", err);
        if (!res.headersSent) res.sendStatus(500);
      }
    });
  } catch (error) {
    console.error("Error handling tileset get:", error);
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
      const idRaw = (req.params as any)["id"] as string | undefined;
      const id = (idRaw || "").replace(/[^a-zA-Z0-9._-]/g, "");
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

      // Ignore multipart filename. Always write to <id>.cbor
      const outPath = resolve(texturesDir, `${id}.cbor`);

      const buf = fs.readFileSync(incoming.filepath);
      fs.writeFileSync(outPath, buf);

      res.sendStatus(204);
    } catch (error) {
      console.error("Error saving upload:", error);
      res.sendStatus(500);
    }
  });
});
