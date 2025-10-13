import * as fs from "fs";
import { dirname, resolve } from "path";

/**
 * Write a file atomically and durably:
 * - write bytes to a temp file in the same directory
 * - fsync the temp file
 * - rename temp -> target (POSIX atomic within same dir)
 * - fsync the directory (best-effort) to persist the rename
 *
 * If any step throws, attempts to remove the temp file and rethrows.
 */
export function atomicWriteFileSync(targetPath: string, data: Buffer | string) {
  const dir = dirname(targetPath);
  const tmp = resolve(dir, `.${Date.now()}.${process.pid}.tmp`);

  fs.mkdirSync(dir, { recursive: true });

  let fd: number | undefined;
  try {
    fd = fs.openSync(tmp, "w");
    if (typeof data === "string") {
      fs.writeFileSync(fd, data, "utf8");
    } else {
      fs.writeFileSync(fd, data);
    }
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = undefined;

    fs.renameSync(tmp, targetPath);

    // Best-effort directory fsync to ensure rename durability on certain FS
    try {
      const dirfd = fs.openSync(dir, "r");
      try {
        fs.fsyncSync(dirfd);
      } finally {
        fs.closeSync(dirfd);
      }
    } catch {
      // ignore if not supported
    }
  } catch (err) {
    // Close fd if still open
    if (fd !== undefined) {
      try {
        fs.closeSync(fd);
      } catch {
        // ignore close errors
      }
    }
    // Attempt cleanup of temp
    try {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    } catch {
      // ignore cleanup errors
    }
    throw err;
  }
}
