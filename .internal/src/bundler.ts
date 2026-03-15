import alias from "@rollup/plugin-alias";
import commonjs from "@rollup/plugin-commonjs";
import pluginResolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import path from "node:path";
import { resolve } from "path";
import { OutputOptions, Plugin, rollup, RollupOptions } from "rollup";

const internalDir = process.cwd();
const repoDir = resolve(internalDir, "..");
const levelDir = resolve(repoDir, "level");

interface BundleOptions {
  minify?: boolean;
}

/**
 * Configuration for symbols that should be force-exported
 */
interface ForceExportConfig {
  /** Array of symbol names to export, optionally with aliases */
  symbolNames: (string | { name: string; alias: string })[];
  /** The file to import from, relative to the level/src directory (e.g., "./player") */
  importPath: string;
}

/**
 * Rollup plugin that forces specific symbols to be imported and exported,
 * even if they're not used in the code being bundled.
 */
function forceExportPlugin(exports: ForceExportConfig[]): Plugin {
  if (exports.length === 0) {
    return { name: "force-export-noop" };
  }

  return {
    name: "force-export",
    transform(code, id) {
      // Only inject into the main entry file
      if (id.includes("level/src/main.ts")) {
        // Normalize exports to handle both string and object formats
        const normalizedExports = exports.flatMap((exp) => {
          return exp.symbolNames.map((symbol) => {
            const name = typeof symbol === "string" ? symbol : symbol.name;
            const alias = typeof symbol === "string" ? symbol : symbol.alias;
            return {
              name,
              alias,
              importPath: exp.importPath,
            };
          });
        });

        // Generate import statements with aliased names to avoid conflicts
        const imports = normalizedExports
          .map(
            (exp) =>
              `import { ${exp.name} as __forceExport_${exp.alias}__ } from "${exp.importPath}";`,
          )
          .join("\n");

        // Generate a statement that prevents tree-shaking by referencing the symbols
        const references = normalizedExports
          .map((exp) => `  ${exp.alias}: __forceExport_${exp.alias}__`)
          .join(",\n");

        // Inject at the top of the file
        const injectedCode = `${imports}

let player;
let states;
let story;

// Force-exported symbols - prevents tree-shaking
export const __internal__ = {
  ${references}
};

export function __internal__init(states) {
  player = new __internal__.Player();
  story = new __internal__.StoryStateMachine(states);
  for (const name of __internal__.getAllChars()) {
    new __internal__.Character(name);
  }
}

${code}`;
        return {
          code: injectedCode,
          map: null,
        };
      }
      return null;
    },
  };
}

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

export function createRollupConfig(
  forceExports: ForceExportConfig[] = [],
  options?: BundleOptions,
): RollupOptions {
  const plugins = [
    forceExportPlugin(forceExports),
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
  ];

  if (options?.minify) {
    plugins.push(
      terser({
        maxWorkers: 4,
      }),
    );
  }

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
    plugins,
  };
}

export async function bundleWithRollup(
  metadata: BundleMetadata,
  options?: BundleOptions,
): Promise<string> {
  // These are symbols that we want to have access to inside the engine, for
  // example, through QuickJS's FFI. This is the only way to guarantee that they
  // are included in the final bundle and are therefore accessible.
  const forceExports: ForceExportConfig[] = [
    { symbolNames: ["Player"], importPath: "@gl/utils/player" },
    { symbolNames: ["StoryStateMachine"], importPath: "@gl/utils/state" },
    { symbolNames: ["Character", "chars"], importPath: "@gl/utils/character" },
    { symbolNames: ["globalTicker"], importPath: "@gl/ticker" },
    {
      symbolNames: [{ name: "getAll", alias: "getAllChars" }],
      importPath: "@gl/api/w2h/char",
    },
  ];
  const rollupConfig = createRollupConfig(forceExports, options);

  // Create a rollup bundle
  const bundle = await rollup(rollupConfig);

  try {
    // Generate the output
    const { output } = await bundle.generate(
      rollupConfig.output as OutputOptions,
    );

    // Return the generated code (first chunk)
    if (output.length === 0) {
      throw new Error("No output generated from Rollup");
    }

    const code = output[0].code;

    // Inject metadata as a global object at the beginning of the bundle
    const metadataComment = `// ${JSON.stringify(metadata, null, 0)}\n\n`;
    return metadataComment + code;
  } finally {
    bundle.close();
  }
}
