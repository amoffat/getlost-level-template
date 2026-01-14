import alias from "@rollup/plugin-alias";
import commonjs from "@rollup/plugin-commonjs";
import pluginResolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import path from "node:path";
import { resolve } from "path";
import { OutputOptions, rollup, RollupOptions } from "rollup";

const internalDir = process.cwd();
const repoDir = resolve(internalDir, "..");
const levelDir = resolve(repoDir, "level");

export interface BundleMetadata {
  engineVersion?: string;
  tmplVersion?: string;
  levelId?: string;
  repo?: string;
  commit?: string;
}

export function isCompileError(e: unknown): e is { message: string } {
  return e !== undefined && (e as { message: string }).message !== undefined;
}

export function createRollupConfig(): RollupOptions {
  return {
    input: path.resolve(levelDir, "src/main.ts"),
    output: {
      name: "Level",
      format: "iife",
      sourcemap: false,
      inlineDynamicImports: true,
      compact: true,
      globals: (id) => {
        // Map w2h API modules to their global names provided by the host
        if (id.includes("/api/w2h/")) {
          const moduleName = id.split("/").pop();
          return `__host_${moduleName}__`;
        }
        return id;
      },
    },
    external: (id) => {
      // Treat w2h API modules as external since they're provided by the host
      return id.includes("/api/w2h/");
    },
    plugins: [
      alias({
        entries: [
          {
            find: "@gl",
            replacement: path.resolve(internalDir, "assemblyscript/@gl"),
          },
        ],
      }),
      pluginResolve({
        extensions: [".ts", ".js", ".mjs", ".json"],
        browser: false,
        preferBuiltins: false,
      }),
      typescript({
        tsconfig: path.resolve(levelDir, "tsconfig.json"),
        include: [
          path.resolve(levelDir, "src/**/*.ts"),
          path.resolve(internalDir, "assemblyscript/@gl/**/*.ts"),
        ],
        // Just in case there are type errors, still emit JS so Rollup can run:
        noEmitOnError: false,
      }),
      commonjs(),
      terser({
        maxWorkers: 4,
      }),
    ],
  };
}

export async function bundleWithRollup(
  metadata: BundleMetadata
): Promise<string> {
  const rollupConfig = createRollupConfig();

  // Create a rollup bundle
  const bundle = await rollup(rollupConfig);

  try {
    // Generate the output
    const { output } = await bundle.generate(
      rollupConfig.output as OutputOptions
    );

    // Return the generated code (first chunk)
    if (output.length === 0) {
      throw new Error("No output generated from Rollup");
    }

    // Inject metadata as a global object at the beginning of the bundle
    const metadataComment = `// ${JSON.stringify(metadata, null, 0)}\n\n`;
    return metadataComment + output[0].code;
  } finally {
    bundle.close();
  }
}
