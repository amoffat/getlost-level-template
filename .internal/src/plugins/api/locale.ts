import express from "express";
import * as fs from "fs";
import { resolve } from "path";

const internalDir = process.cwd();
const repoDir = resolve(internalDir, "..");
const levelDir = resolve(repoDir, "level");
const localeDir = resolve(levelDir, "locales");

export const router = express.Router({ mergeParams: true });

// Serve the locale file if it exists
router.get("/:locale/:file.jsonl", (req, res) => {
  try {
    const { locale, file } = req.params;
    const filePath = resolve(localeDir, locale, `${file}.jsonl`);

    if (!fs.existsSync(filePath)) {
      res.sendStatus(404);
      return;
    }

    res.sendFile(
      filePath,
      {
        headers: {
          "Content-Type": "application/jsonl",
        },
      },
      (err) => {
        if (err) {
          console.error("Error sending locale file:", err);
          if (!res.headersSent) res.sendStatus(500);
        }
      }
    );
  } catch (error) {
    console.error("Error handling locale get:", error);
    res.sendStatus(500);
  }
});
