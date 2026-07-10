import express from "express";
import { readFileSync } from "fs";
import { resolve } from "path";
import { bundleWithRollup, isCompileError } from "../../bundler";

const internalDir = process.cwd();
const repoDir = resolve(internalDir, "..");

const packageJson = JSON.parse(
  readFileSync(resolve(internalDir, "package.json"), "utf-8"),
);
const tmplVersion = packageJson.version;

export const router = express.Router({ mergeParams: true });

router.get("/", async (_req, res) => {
  const engineVersion = readFileSync(
    resolve(repoDir, "engine_version.txt"),
    "utf-8",
  ).trim();

  const metadata = {
    engineVersion,
    tmplVersion,
    // For local development
    levelId: "936872190",
    repo: "amoffat/getlost-level-template",
    commit: "main",
  };

  const start = performance.now();
  console.log("Bundling JavaScript...");

  try {
    const bundledJs = await bundleWithRollup(metadata, {
      minify: false,
      includeTests: true,
    });

    const end = performance.now();
    const time = (end - start).toFixed(2);
    console.log(`Bundle compiled in ${time}ms`);

    res.setHeader("Content-Type", "application/javascript");
    res.status(200).send(bundledJs);
  } catch (e) {
    if (isCompileError(e)) {
      console.error(e.message);
    } else {
      console.error(e);
    }
    res
      .status(500)
      .setHeader("Content-Type", "text/plain")
      .send("Failed to compile");
  }
});
