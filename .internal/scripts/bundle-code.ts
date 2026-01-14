#!/usr/bin/env node

import { writeFileSync } from "fs";
import { resolve } from "path";
import { bundleWithRollup, isCompileError } from "../src/bundler.js";

interface Args {
  outDir: string;
  metadata?: string;
  release?: boolean;
}

function parseArgs(): Args {
  const args: Args = {
    outDir: "",
  };

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];

    if (arg === "--outDir" && i + 1 < process.argv.length) {
      args.outDir = process.argv[++i];
    } else if (arg === "--metadata" && i + 1 < process.argv.length) {
      args.metadata = process.argv[++i];
    } else if (arg === "--release") {
      args.release = true;
    }
  }

  if (!args.outDir) {
    console.error("Error: --outDir is required");
    process.exit(1);
  }

  return args;
}

async function main() {
  const args = parseArgs();

  let metadata = {};
  if (args.metadata) {
    try {
      metadata = JSON.parse(args.metadata);
    } catch (e) {
      console.error("Error parsing metadata JSON:", e);
      process.exit(1);
    }
  }

  console.log("Bundling level code...");
  const start = performance.now();

  try {
    const bundledJs = await bundleWithRollup(metadata);
    const outputPath = resolve(args.outDir, "main.js");
    writeFileSync(outputPath, bundledJs, "utf-8");

    const end = performance.now();
    const time = (end - start).toFixed(2);
    console.log(`✓ Bundle compiled in ${time}ms`);
    console.log(`✓ Output: ${outputPath}`);
  } catch (e) {
    if (isCompileError(e)) {
      console.error("Compilation error:", e.message);
    } else {
      console.error("Unexpected error:", e);
    }
    process.exit(1);
  }
}

main();
