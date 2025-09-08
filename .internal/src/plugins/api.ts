import * as fflate from "fflate";
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { resolve } from "path";
import type { Plugin } from "vite";

import express from "express";
import formidable from "formidable";

const internalDir = process.cwd();
const repoDir = resolve(internalDir, "..");
const levelDir = resolve(repoDir, "level");
const graphFile = resolve(levelDir, "pathgraph.gz");

export default function expressApi(): Plugin {
  return {
    name: "express-api",
    apply: "serve",
    configureServer(server) {
      const app = express();
      app.use(express.json({ limit: "5mb" }));

      app.post(
        "/pathgraph",
        express.raw({ type: "application/octet-stream", limit: "10mb" }),
        (req, res) => {
          const u8 = new Uint8Array(req.body);
          const compressed = fflate.compressSync(u8);
          writeFileSync(graphFile, compressed);
          res.sendStatus(204);
        }
      );

      app.delete("/pathgraph", (_req, res) => {
        try {
          unlinkSync(graphFile);
          res.sendStatus(204);
        } catch (error) {
          console.error("Error deleting path graph:", error);
          res.sendStatus(500);
        }
      });

      app.post("/image-upload", (req, res) => {
        const form = formidable({
          multiples: true,
          maxFileSize: 10 * 1024 * 1024,
        });
        form.parse(req, (err, _fields, files) => {
          try {
            if (err) {
              console.error("Form parse error:", err);
              res.status(400).send("Invalid form data");
              return;
            }

            const incoming = files["file"] as any; // Expect "file" field; may be a single or an array
            const fileList = Array.isArray(incoming)
              ? incoming
              : incoming
                ? [incoming]
                : [];
            if (fileList.length === 0) {
              res.status(400).send("Missing 'file' field in form data");
              return;
            }

            const texturesDir = resolve(levelDir, "textures");
            mkdirSync(texturesDir, { recursive: true });

            for (const f of fileList) {
              const original =
                (f.originalFilename as string | undefined) || "upload.bin";
              const safeName = original.replace(/[^a-zA-Z0-9._-]/g, "");
              const outPath = resolve(texturesDir, safeName);
              const buf = readFileSync(f.filepath);
              writeFileSync(outPath, buf);
            }
            res.sendStatus(204);
          } catch (error) {
            console.error("Error saving image(s):", error);
            res.sendStatus(500);
          }
        });
      });

      // Mount under /api
      server.middlewares.use("/api", app);
    },
  };
}
