import express from "express";
import * as fs from "fs";
import { normalize, relative, resolve } from "path";

const internalDir = process.cwd();
const repoDir = resolve(internalDir, "..");

export const router = express.Router({ mergeParams: true });

const READABLE = new Set<string>([
  "docs/License.md",
  "docs/StoryGuidelines.md",
  "engine_version.txt",
]);

const WRITABLE = new Set<string>(["engine_version.txt"]);

// Serve any file from the repository with path traversal protection
router.get("/{*splat}", (req, res) => {
  try {
    const requestedPath: string = (req.params as any)["splat"].join("/");

    if (!READABLE.has(requestedPath)) {
      res.status(403).send("Access denied: File not in allowlist");
      return;
    }

    // Resolve the full path
    const fullPath = resolve(repoDir, requestedPath);

    // Normalize and get relative path to ensure it's within the repository
    const normalizedPath = normalize(fullPath);
    const relativePath = relative(repoDir, normalizedPath);

    // Security check: ensure the path doesn't escape the repository
    // relative() returns a path starting with ".." if it's outside
    if (
      relativePath.startsWith("..") ||
      resolve(repoDir, relativePath) !== normalizedPath
    ) {
      res.status(403).send("Access denied: Path outside repository");
      return;
    }

    // Check if file exists
    if (!fs.existsSync(normalizedPath)) {
      res.sendStatus(404);
      return;
    }

    // Check if it's a file (not a directory)
    const stats = fs.statSync(normalizedPath);
    if (!stats.isFile()) {
      res.status(400).send("Not a file");
      return;
    }

    // Send the file
    res.sendFile(normalizedPath, (err) => {
      if (err) {
        console.error("Error sending file:", err);
        if (!res.headersSent) res.sendStatus(500);
      }
    });
  } catch (error) {
    console.error("Error handling file request:", error);
    res.sendStatus(500);
  }
});

// Write an entire file at once
router.put("/{*splat}", (req, res) => {
  try {
    const requestedPath: string = (req.params as any)["splat"].join("/");

    if (!WRITABLE.has(requestedPath)) {
      res.status(403).send("Access denied: File not in writable allowlist");
      return;
    }

    // Validate JSON body
    if (!req.body || typeof req.body.content !== "string") {
      res
        .status(400)
        .send("Bad request: Expected JSON body with 'content' field");
      return;
    }

    // Resolve the full path
    const fullPath = resolve(repoDir, requestedPath);

    // Normalize and get relative path to ensure it's within the repository
    const normalizedPath = normalize(fullPath);
    const relativePath = relative(repoDir, normalizedPath);

    // Security check: ensure the path doesn't escape the repository
    if (
      relativePath.startsWith("..") ||
      resolve(repoDir, relativePath) !== normalizedPath
    ) {
      res.status(403).send("Access denied: Path outside repository");
      return;
    }

    // Write the file
    fs.writeFileSync(normalizedPath, req.body.content, "utf8");

    res.status(200).json({ success: true, path: requestedPath });
  } catch (error) {
    console.error("Error writing file:", error);
    res.status(500).json({ error: "Failed to write file" });
  }
});
