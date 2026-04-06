import express from "express";
import formidable from "formidable";
import * as fs from "fs";
import { resolve } from "path";
import { atomicWriteFileSync } from "../../utils/file";

const internalDir = process.cwd();
const repoDir = resolve(internalDir, "..");
const levelDir = resolve(repoDir, "level");
const speakerDir = resolve(levelDir, "speakers");

export const router = express.Router({ mergeParams: true });

function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9._-]/g, "");
}

// GET "/:id.png" — serve a single speaker image
router.get("/:id.png", (req, res) => {
  try {
    const id = sanitizeId(req.params.id);
    const filePath = resolve(speakerDir, `${id}.png`);
    if (!fs.existsSync(filePath)) {
      res.sendStatus(404);
      return;
    }
    res.sendFile(filePath, { headers: { "Content-Type": "image/png" } }, (err) => {
      if (err) {
        console.error("Error sending speaker image:", err);
        if (!res.headersSent) res.sendStatus(500);
      }
    });
  } catch (error) {
    console.error("Error serving speaker image:", error);
    res.sendStatus(500);
  }
});

// PUT "/:id.png" — upload or replace a single speaker image (multipart/form-data)
// File field name: "speaker".
router.put("/:id.png", (req, res) => {
  const form = formidable({
    multiples: false,
    maxFileSize: 20 * 1024 * 1024,
  });
  form.parse(req, (err, _fields, files) => {
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
      const incoming: any = pickFirst((files as any)["speaker"]);
      if (!incoming || !incoming.filepath) {
        res.status(400).send("Missing 'speaker' file in form data");
        return;
      }

      fs.mkdirSync(speakerDir, { recursive: true });
      const buf = fs.readFileSync(incoming.filepath);
      atomicWriteFileSync(resolve(speakerDir, `${id}.png`), buf);

      res.sendStatus(204);
    } catch (error) {
      console.error("Error saving speaker image:", error);
      res.sendStatus(500);
    }
  });
});

// DELETE "/:id.png" — remove a speaker image
router.delete("/:id.png", (req, res) => {
  try {
    const id = sanitizeId(req.params.id);
    const filePath = resolve(speakerDir, `${id}.png`);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.sendStatus(204);
  } catch (error) {
    console.error("Error deleting speaker image:", error);
    res.sendStatus(500);
  }
});
