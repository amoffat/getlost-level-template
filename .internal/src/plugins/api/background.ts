import express from "express";
import formidable from "formidable";
import * as fs from "fs";
import { resolve } from "path";
import { atomicWriteFileSync } from "../../utils/file";

const internalDir = process.cwd();
const repoDir = resolve(internalDir, "..");
const levelDir = resolve(repoDir, "level");
const backgroundDir = resolve(levelDir, "backgrounds");

export const router = express.Router({ mergeParams: true });

// Sanitize an image ID so it can be safely used as a filename stem.
function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9._-]/g, "");
}

/**
 * Resolve the on-disk path for a background image ID.
 * Checks the restricted naming ({id}.restricted.png) first, then plain ({id}.png).
 * Returns null if neither exists.
 */
function pathForId(id: string): string | null {
  const restrictedPath = resolve(backgroundDir, `${id}.restricted.png`);
  if (fs.existsSync(restrictedPath)) return restrictedPath;
  const mainPath = resolve(backgroundDir, `${id}.png`);
  if (fs.existsSync(mainPath)) return mainPath;
  return null;
}

// GET "/" — list all background image IDs
router.get("/", (_req, res) => {
  try {
    const ids = new Set<string>();
    if (fs.existsSync(backgroundDir)) {
      for (const f of fs.readdirSync(backgroundDir)) {
        if (f.endsWith(".restricted.png")) {
          ids.add(f.slice(0, -".restricted.png".length));
        } else if (f.endsWith(".png")) {
          ids.add(f.slice(0, -".png".length));
        }
      }
    }
    res.json({ ids: Array.from(ids) });
  } catch (error) {
    console.error("Error listing backgrounds:", error);
    res.sendStatus(500);
  }
});

// PUT "/:id.png" — upload or replace a single background image (multipart/form-data)
// File field name: "background". Per-asset restricted flag: "background.restricted" = "1".
router.put("/:id.png", (req, res) => {
  const form = formidable({
    multiples: false,
    maxFileSize: 20 * 1024 * 1024,
  });
  form.parse(req, (err, fields, files) => {
    try {
      if (err) {
        console.error("Form parse error:", err);
        res.status(400).send("Invalid form data");
        return;
      }

      const id = sanitizeId(req.params.id);
      if (!id) {
        res.status(400).send("Invalid id in URL");
        return;
      }

      const pickFirst = (v: any) => (Array.isArray(v) ? v[0] : v);
      const incoming: any = pickFirst((files as any)["background"]);
      if (!incoming || !incoming.filepath) {
        res.status(400).send("Missing 'background' file in form data");
        return;
      }

      const isRestricted = fields["background.restricted"]?.[0] === "1";

      fs.mkdirSync(backgroundDir, { recursive: true });

      // Remove the opposite naming variant if it exists (handles restricted toggle)
      const oldPath = isRestricted
        ? resolve(backgroundDir, `${id}.png`)
        : resolve(backgroundDir, `${id}.restricted.png`);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);

      const filename = isRestricted ? `${id}.restricted.png` : `${id}.png`;
      const buf = fs.readFileSync(incoming.filepath);
      atomicWriteFileSync(resolve(backgroundDir, filename), buf);

      res.sendStatus(204);
    } catch (error) {
      console.error("Error saving background image:", error);
      res.sendStatus(500);
    }
  });
});

// GET "/:id.png" — serve a single background image
router.get("/:id.png", (req, res) => {
  try {
    const id = sanitizeId(req.params.id);
    const filePath = pathForId(id);
    if (!filePath) {
      res.sendStatus(404);
      return;
    }
    res.sendFile(filePath, { headers: { "Content-Type": "image/png" } }, (err) => {
      if (err) {
        console.error("Error sending background image:", err);
        if (!res.headersSent) res.sendStatus(500);
      }
    });
  } catch (error) {
    console.error("Error serving background image:", error);
    res.sendStatus(500);
  }
});

// DELETE "/:id.png" — remove a background image (either naming variant)
router.delete("/:id.png", (req, res) => {
  try {
    const id = sanitizeId(req.params.id);
    const mainPath = resolve(backgroundDir, `${id}.png`);
    if (fs.existsSync(mainPath)) fs.unlinkSync(mainPath);
    const restrictedPath = resolve(backgroundDir, `${id}.restricted.png`);
    if (fs.existsSync(restrictedPath)) fs.unlinkSync(restrictedPath);
    res.sendStatus(204);
  } catch (error) {
    console.error("Error deleting background image:", error);
    res.sendStatus(500);
  }
});

