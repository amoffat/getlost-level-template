import express, { Request, Response } from "express";
import { fileTypeFromBuffer } from "file-type";
import formidable from "formidable";
import * as fs from "fs";
import { resolve } from "path";
import { atomicWriteFileSync } from "../../../utils/file";

// ---------------------------------------------------------------------------
// Async job infrastructure
// ---------------------------------------------------------------------------

type JobState =
  | { status: "pending" }
  | { status: "progress" }
  | { status: "done" }
  | { status: "error"; message: string };

interface JobRecord {
  state: JobState;
  /** Callbacks notified exactly once when the job settles. */
  listeners: Array<(state: JobState) => void>;
  /** Timer that evicts this record from the map after a TTL. */
  cleanupTimer: ReturnType<typeof setTimeout> | null;
}

/** True if `val` is a native Promise or any thenable. */
function isPromise<T>(val: T | Promise<T>): val is Promise<T> {
  return val != null && typeof (val as Promise<unknown>).then === "function";
}

const JOB_TTL_MS = 5 * 60 * 1000;

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
      const incoming = pickFirst(
        (files as Record<string, unknown>)[fieldName],
      ) as { filepath?: string } | undefined;
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
// Generic asset router factory
// ---------------------------------------------------------------------------

/** A single output entry produced by a {@link PutPostProcessor}. */
export interface PutOutputEntry {
  /** On-disk extension for this output file, including the leading dot. */
  ext: string;
  /** File contents to write. */
  buf: Buffer;
}

/**
 * Optional post-processing callback invoked on PUT after the upload is parsed
 * but before anything is written to disk.
 *
 * @param input.ext         - File extension from the request URL (e.g. `".wav"`)
 * @param input.contentType - MIME type detected from the buffer's magic bytes
 * @param input.buf         - Raw uploaded bytes
 *
 * @returns An array of output entries to write.  Each entry requires both
 *   `ext` and `buf`, allowing the callback to produce multiple backend files
 *   from a single upload (e.g. transcoding one source into several formats).
 *   All entries share the same stem derived from the request URL.
 */
export type PutPostProcessor = (input: {
  ext: string;
  contentType: string;
  buf: Buffer;
}) => PutOutputEntry[] | Promise<PutOutputEntry[]>;

export interface AssetRouterConfig {
  /** Absolute path to the directory where asset files are stored. */
  dir: string;
  /** Form field name expected in multipart uploads. */
  fieldName: string;
  /** Maximum upload size in bytes. */
  maxFileSize: number;
  /**
   * Allowed file extensions, including the leading dot (e.g. `[".png"]` or
   * `[".ogg", ".mp3", ".wav", ".m4a"]`).
   */
  extensions: string[];
  /**
   * Map from extension to MIME type for Content-Type headers on GET responses
   * (e.g. `{ ".png": "image/png", ".ogg": "audio/ogg" }`).
   */
  mimeTypes: Record<string, string>;
  /**
   * When true, enables restricted-flag support:
   *   - Files may be stored as `{stem}.restricted{ext}` instead of `{stem}{ext}`
   *   - The `<fieldName>.restricted` form field (value "1") controls the naming
   *   - A GET "/" listing route is added
   *   - GET and DELETE handle both naming variants
   */
  allowRestricted?: boolean;
  /**
   * Optional post-processing callback invoked on every PUT after the upload
   * buffer is available but before the file is written to disk.  See
   * {@link PutPostProcessor} for the full contract.
   */
  onPut?: PutPostProcessor;
}

/**
 * Create an Express router for a generic asset store.
 *
 * Routes (always present):
 *   GET    /:filename  — serve the asset file (extension validated against config)
 *   PUT    /:filename  — upload or replace the asset file
 *   DELETE /:filename  — remove the asset file
 *
 * Additional routes when `restricted: true`:
 *   GET    /           — list all asset filenames
 */
export function createAssetRouter(config: AssetRouterConfig) {
  const {
    dir,
    fieldName,
    maxFileSize,
    extensions,
    mimeTypes,
    allowRestricted = false,
    onPut,
  } = config;
  const router = express.Router({ mergeParams: true });

  // Per-router job tracking for async onPut operations.
  const jobs = new Map<string, JobRecord>();

  /**
   * Update a job, notify all waiting
   * SSE listeners, and schedule cleanup.
   */
  function sendJobState(id: string, state: JobState): void {
    const job = jobs.get(id);
    if (!job) return;
    job.state = state;
    for (const cb of job.listeners) cb(state);

    if (state.status === "done" || state.status === "error") {
      job.listeners = [];
      job.cleanupTimer = setTimeout(() => jobs.delete(id), JOB_TTL_MS);
    }
  }

  const extSet = new Set(extensions);

  /** Split a raw filename into `{ stem, ext }`. Returns null if the extension
   *  is not in the allowed set or the stem is empty after sanitisation. */
  function parseFilename(raw: string): { stem: string; ext: string } | null {
    const lastDot = raw.lastIndexOf(".");
    if (lastDot === -1) return null;
    const ext = raw.slice(lastDot).toLowerCase();
    if (!extSet.has(ext)) return null;
    const stem = sanitizeId(raw.slice(0, lastDot));
    if (!stem) return null;
    return { stem, ext };
  }

  /** Resolve the on-disk path for a given stem+ext pair. With restricted
   *  support, checks the restricted variant first. */
  function pathForStem(stem: string, ext: string): string | null {
    if (allowRestricted) {
      const restrictedPath = resolve(dir, `${stem}.restricted${ext}`);
      if (fs.existsSync(restrictedPath)) return restrictedPath;
    }
    const main = resolve(dir, `${stem}${ext}`);
    if (fs.existsSync(main)) return main;
    return null;
  }

  /**
   * Remove all on-disk files that belong to `stem`, regardless of extension or
   * restricted suffix.  This keeps the directory clean when an uploaded file's
   * extension changes (e.g. a post-processor converts `.wav` → `.ogg`).
   */
  function removeFilesForStem(stem: string): void {
    if (!fs.existsSync(dir)) return;
    const RESTRICTED = ".restricted";
    for (const f of fs.readdirSync(dir)) {
      const lastDot = f.lastIndexOf(".");
      if (lastDot === -1) continue;
      const fileStem = f.slice(0, lastDot);
      // Plain file: "{stem}.{ext}"
      if (fileStem === stem) {
        fs.unlinkSync(resolve(dir, f));
        continue;
      }
      // Restricted file: "{stem}.restricted.{ext}"
      if (
        allowRestricted &&
        fileStem.endsWith(RESTRICTED) &&
        fileStem.slice(0, -RESTRICTED.length) === stem
      ) {
        fs.unlinkSync(resolve(dir, f));
      }
    }
  }

  if (allowRestricted) {
    router.get("/", (_req: Request, res: Response) => {
      try {
        const filenames = new Set<string>();
        if (fs.existsSync(dir)) {
          for (const f of fs.readdirSync(dir)) {
            for (const ext of extensions) {
              const restrictedSuffix = `.restricted${ext}`;
              if (f.endsWith(restrictedSuffix)) {
                filenames.add(f.slice(0, -restrictedSuffix.length) + ext);
                break;
              } else if (f.endsWith(ext)) {
                filenames.add(f);
                break;
              }
            }
          }
        }
        res.json({ ids: Array.from(filenames) });
      } catch (error) {
        console.error(`Error listing ${fieldName}s:`, error);
        res.sendStatus(500);
      }
    });
  }

  // SSE endpoint for async PUT jobs.  Must be registered before /:filename so
  // that a path like "/jobs/abc-123/events" doesn't match the asset GET handler.
  // The path `/jobs/:jobid/events` matches the shape expected by `jobProgress$`.
  router.get("/jobs/:jobid/events", (req: Request, res: Response) => {
    const job = jobs.get(req.params.jobid);
    if (!job) {
      res.sendStatus(404);
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    function sendSSE(state: JobState): void {
      if (state.status === "error") {
        const data = { status: "error", message: state.message };
        res.write(`event: done\ndata: ${JSON.stringify(data)}\n\n`);
        res.end();
      } else if (state.status === "progress") {
        res.write(`event: progress\ndata: {}\n\n`);
      } else if (state.status === "done") {
        res.write(`event: done\ndata: {}\n\n`);
        res.end();
      }
    }

    if (job.state.status !== "pending") {
      sendSSE(job.state);
      jobs.delete(req.params.jobid);
      return;
    }

    // Job is still in flight — register a listener.
    const listener = (state: JobState): void => {
      sendSSE(state);
    };
    job.listeners.push(sendSSE);

    // If the client disconnects before the job finishes, remove the listener.
    req.on("close", () => {
      const idx = job.listeners.indexOf(listener);
      if (idx !== -1) job.listeners.splice(idx, 1);
    });
  });

  router.get("/:filename", (req: Request, res: Response) => {
    try {
      const parsed = parseFilename(req.params.filename);
      if (!parsed) {
        res.sendStatus(404);
        return;
      }
      const { stem, ext } = parsed;
      const filePath = pathForStem(stem, ext);
      if (!filePath) {
        res.sendStatus(404);
        return;
      }
      const contentType = mimeTypes[ext] ?? "application/octet-stream";
      res.sendFile(
        filePath,
        { headers: { "Content-Type": contentType } },
        (err) => {
          if (err) {
            console.error(`Error sending ${fieldName} asset:`, err);
            if (!res.headersSent) res.sendStatus(500);
          }
        },
      );
    } catch (error) {
      console.error(`Error serving ${fieldName} asset:`, error);
      res.sendStatus(500);
    }
  });

  router.put("/:filename", async (req: Request, res: Response) => {
    const parsed = parseFilename(req.params.filename);
    if (!parsed) {
      res.status(400).send("Invalid or disallowed file extension in URL");
      return;
    }
    const { stem, ext } = parsed;

    try {
      const { buf, fields } = await parseFormUpload(
        req,
        fieldName,
        maxFileSize,
      );

      const isRestricted =
        allowRestricted && fields[`${fieldName}.restricted`]?.[0] === "1";

      /** Write all entries for this stem (called sync or from background). */
      function writeEntries(entries: PutOutputEntry[]): void {
        removeFilesForStem(stem);
        for (const entry of entries) {
          const filename = isRestricted
            ? `${stem}.restricted${entry.ext}`
            : `${stem}${entry.ext}`;
          atomicWriteFileSync(resolve(dir, filename), entry.buf);
        }
      }

      if (!onPut) {
        // No post-processor: synchronous single-entry write.
        writeEntries([{ ext, buf }]);
        res.sendStatus(204);
        return;
      }

      // Detect magic-byte content type before invoking the callback.
      const detected = await fileTypeFromBuffer(buf);
      const contentType = detected?.mime ?? "application/octet-stream";
      const result = onPut({ ext, contentType, buf });

      if (!isPromise(result)) {
        // Synchronous post-processor: write and reply 204 immediately.
        writeEntries(result);
        res.sendStatus(204);
        return;
      }

      // Async post-processor: reply 202 right away and process in background.
      const jobId = crypto.randomUUID();
      jobs.set(jobId, {
        state: { status: "pending" },
        listeners: [],
        cleanupTimer: null,
      });
      // A relative path because we don't know where this router is being
      // attached.
      res.status(202).setHeader("Location", `jobs/${jobId}`).end();

      result
        .then((entries) => {
          writeEntries(entries);
          sendJobState(jobId, { status: "done" });
        })
        .catch((e: unknown) => {
          const message = e instanceof Error ? e.message : String(e);
          console.error(`Async onPut error for ${fieldName} (${stem}):`, e);
          sendJobState(jobId, { status: "error", message });
        });
    } catch (e) {
      const fe = e as FormUploadError;
      if (typeof fe?.status === "number" && typeof fe?.message === "string") {
        console.error(`Form parse error (${fieldName}):`, fe.message);
        res.status(fe.status).send(fe.message);
      } else {
        console.error(`Error saving ${fieldName} asset:`, e);
        res.sendStatus(500);
      }
    }
  });

  router.delete("/:filename", (req: Request, res: Response) => {
    try {
      const parsed = parseFilename(req.params.filename);
      if (!parsed) {
        res.sendStatus(404);
        return;
      }
      const { stem, ext } = parsed;
      const mainPath = resolve(dir, `${stem}${ext}`);
      if (fs.existsSync(mainPath)) fs.unlinkSync(mainPath);
      if (allowRestricted) {
        const restrictedPath = resolve(dir, `${stem}.restricted${ext}`);
        if (fs.existsSync(restrictedPath)) fs.unlinkSync(restrictedPath);
      }
      res.sendStatus(204);
    } catch (error) {
      console.error(`Error deleting ${fieldName} asset:`, error);
      res.sendStatus(500);
    }
  });

  return router;
}

// ---------------------------------------------------------------------------
// PNG router factory (specialisation of createAssetRouter)
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
 * Convenience wrapper around {@link createAssetRouter}.
 *
 * Routes (always present):
 *   GET    /:id.png  — serve the PNG file
 *   PUT    /:id.png  — upload or replace the PNG file
 *   DELETE /:id.png  — remove the PNG file
 *
 * Additional routes when `restricted: true`:
 *   GET    /         — list all asset IDs (without extension)
 */
export function createPngRouter(config: PngRouterConfig) {
  return createAssetRouter({
    dir: config.dir,
    fieldName: config.fieldName,
    maxFileSize: config.maxFileSize,
    extensions: [".png"],
    mimeTypes: { ".png": "image/png" },
    allowRestricted: config.restricted,
  });
}

// ---------------------------------------------------------------------------
// Audio router factory (specialisation of createAssetRouter)
// ---------------------------------------------------------------------------

/**
 * Create an Express router for an audio asset store supporting ogg, m4a, wav,
 * and mp3 files.
 * Convenience wrapper around {@link createAssetRouter}.
 *
 * Routes (always present):
 *   GET    /:filename  — serve the audio file
 *   PUT    /:filename  — upload or replace the audio file
 *   DELETE /:filename  — remove the audio file
 *
 * Additional routes when `restricted: true` (default):
 *   GET    /           — list all asset filenames
 */
export function createAudioRouter(
  config: Omit<AssetRouterConfig, "extensions" | "mimeTypes">,
) {
  return createAssetRouter({
    ...config,
    extensions: [".ogg", ".m4a", ".wav", ".mp3"],
    mimeTypes: {
      ".ogg": "audio/ogg",
      ".m4a": "audio/mp4",
      ".wav": "audio/wav",
      ".mp3": "audio/mpeg",
    },
  });
}
