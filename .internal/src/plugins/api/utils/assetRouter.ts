import express, { Request, Response } from "express";
import formidable from "formidable";
import * as fs from "fs";
import { resolve } from "path";
import { atomicWriteFileSync } from "../../../utils/file";

// ---------------------------------------------------------------------------
// Shared utilities
// ---------------------------------------------------------------------------

/** Sanitize an asset ID so it can be safely used as a filename stem. */
export function sanitizeId(raw: unknown): string {
  return (typeof raw === "string" ? raw : "").replace(/[^a-zA-Z0-9._-]/g, "");
}

export interface FormUploadResult {
  buf: Buffer;
  fields: formidable.Fields;
}

export interface FormUploadError {
  status: number;
  message: string;
}

/**
 * Parse a multipart form upload and return the file buffer and fields.
 * Rejects with a `FormUploadError` on validation failures.
 */
export function parseFormUpload(
  req: Request,
  fieldName: string,
  maxFileSize: number,
): Promise<FormUploadResult> {
  return new Promise((resolve_p, reject) => {
    const form = formidable({ multiples: false, maxFileSize });
    form.parse(req, (err, fields, files) => {
      if (err) {
        const e: FormUploadError = {
          status: 400,
          message: "Invalid form data",
        };
        return reject(e);
      }
      const pickFirst = (v: unknown) => (Array.isArray(v) ? v[0] : v);
      const incoming = pickFirst((files as Record<string, unknown>)[fieldName]) as
        | { filepath?: string }
        | undefined;
      if (!incoming?.filepath) {
        const e: FormUploadError = {
          status: 400,
          message: `Missing '${fieldName}' file in form data`,
        };
        return reject(e);
      }
      const buf = fs.readFileSync(incoming.filepath);
      resolve_p({ buf, fields });
    });
  });
}

// ---------------------------------------------------------------------------
// PNG router factory
// ---------------------------------------------------------------------------

export interface PngRouterConfig {
  /** Absolute path to the directory where PNG files are stored. */
  dir: string;
  /** Form field name expected in multipart uploads. */
  fieldName: string;
  /** Maximum upload size in bytes. */
  maxFileSize: number;
  /**
   * When true, enables restricted-flag support:
   *   - Files may be stored as `{id}.restricted.png` instead of `{id}.png`
   *   - The `<fieldName>.restricted` form field (value "1") controls the naming
   *   - A GET "/" listing route is added
   *   - GET and DELETE handle both naming variants
   */
  restricted?: boolean;
}

/**
 * Create an Express router for a PNG asset store.
 *
 * Routes (always present):
 *   GET    /:id.png  — serve the PNG file
 *   PUT    /:id.png  — upload or replace the PNG file
 *   DELETE /:id.png  — remove the PNG file
 *
 * Additional routes when `restricted: true`:
 *   GET    /         — list all asset IDs
 */
export function createPngRouter(config: PngRouterConfig) {
  const { dir, fieldName, maxFileSize, restricted = false } = config;
  const router = express.Router({ mergeParams: true });

  /** Resolve the on-disk path. With restricted support, checks the restricted
   *  variant first; otherwise looks for the plain PNG only. */
  function pathForId(id: string): string | null {
    if (restricted) {
      const restrictedPath = resolve(dir, `${id}.restricted.png`);
      if (fs.existsSync(restrictedPath)) return restrictedPath;
    }
    const main = resolve(dir, `${id}.png`);
    if (fs.existsSync(main)) return main;
    return null;
  }

  if (restricted) {
    router.get("/", (_req: Request, res: Response) => {
      try {
        const ids = new Set<string>();
        if (fs.existsSync(dir)) {
          for (const f of fs.readdirSync(dir)) {
            if (f.endsWith(".restricted.png")) {
              ids.add(f.slice(0, -".restricted.png".length));
            } else if (f.endsWith(".png")) {
              ids.add(f.slice(0, -".png".length));
            }
          }
        }
        res.json({ ids: Array.from(ids) });
      } catch (error) {
        console.error(`Error listing ${fieldName}s:`, error);
        res.sendStatus(500);
      }
    });
  }

  router.get("/:id.png", (req: Request, res: Response) => {
    try {
      const id = sanitizeId(req.params.id);
      const filePath = pathForId(id);
      if (!filePath) {
        res.sendStatus(404);
        return;
      }
      res.sendFile(filePath, { headers: { "Content-Type": "image/png" } }, (err) => {
        if (err) {
          console.error(`Error sending ${fieldName} image:`, err);
          if (!res.headersSent) res.sendStatus(500);
        }
      });
    } catch (error) {
      console.error(`Error serving ${fieldName} image:`, error);
      res.sendStatus(500);
    }
  });

  router.put("/:id.png", (req: Request, res: Response) => {
    const id = sanitizeId(req.params.id);
    if (!id) {
      res.status(400).send("Invalid id in URL");
      return;
    }
    parseFormUpload(req, fieldName, maxFileSize)
      .then(({ buf, fields }) => {
        try {
          if (restricted) {
            const isRestricted = fields[`${fieldName}.restricted`]?.[0] === "1";
            // Remove the opposite naming variant if it exists (handles restricted toggle)
            const oldPath = isRestricted
              ? resolve(dir, `${id}.png`)
              : resolve(dir, `${id}.restricted.png`);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            const filename = isRestricted ? `${id}.restricted.png` : `${id}.png`;
            atomicWriteFileSync(resolve(dir, filename), buf);
          } else {
            atomicWriteFileSync(resolve(dir, `${id}.png`), buf);
          }
          res.sendStatus(204);
        } catch (error) {
          console.error(`Error saving ${fieldName} image:`, error);
          res.sendStatus(500);
        }
      })
      .catch((e: FormUploadError) => {
        console.error(`Form parse error (${fieldName}):`, e.message);
        res.status(e.status).send(e.message);
      });
  });

  router.delete("/:id.png", (req: Request, res: Response) => {
    try {
      const id = sanitizeId(req.params.id);
      const mainPath = resolve(dir, `${id}.png`);
      if (fs.existsSync(mainPath)) fs.unlinkSync(mainPath);
      if (restricted) {
        const restrictedPath = resolve(dir, `${id}.restricted.png`);
        if (fs.existsSync(restrictedPath)) fs.unlinkSync(restrictedPath);
      }
      res.sendStatus(204);
    } catch (error) {
      console.error(`Error deleting ${fieldName} image:`, error);
      res.sendStatus(500);
    }
  });

  return router;
}
