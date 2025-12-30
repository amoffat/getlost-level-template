import alias from "@rollup/plugin-alias";
import commonjs from "@rollup/plugin-commonjs";
import pluginResolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import { readFileSync } from "fs";
import path from "node:path";
import { resolve } from "path";
import { OutputOptions, rollup, RollupOptions } from "rollup";
import { ViteDevServer } from "vite";
import { sharedState } from "./shared";

const internalDir = process.cwd();
const repoDir = resolve(internalDir, "..");
const levelDir = resolve(repoDir, "level");
let cachedJs: string = "";

const packageJson = JSON.parse(
  readFileSync(resolve(internalDir, "package.json"), "utf-8")
);
const tmplVersion = packageJson.version;

function isCompileError(e: unknown): e is { message: string } {
  return e !== undefined && (e as { message: string }).message !== undefined;
}

const rollupConfig: RollupOptions = {
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

async function bundleWithRollup(
  metadata: Record<string, string>
): Promise<string> {
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
    const metadatComment = `// ${JSON.stringify(metadata, null, 0)}\n\n`;
    return metadatComment + output[0].code;
  } finally {
    bundle.close();
  }
}

// Dynamically compile the level code as it is fetched.
export default function bundleLevelCodePlugin() {
  return {
    name: "bundle-level-code",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(
          `http://${process.env.HOST ?? "localhost"}${req.url}`
        );

        if (url.pathname === "/main.js") {
          const engineVersion = readFileSync(
            resolve(repoDir, "engine_version.txt"),
            "utf-8"
          ).trim();

          const metadata = {
            engineVersion,
            tmplVersion,
            // For local development
            levelId: "936872190",
            repo: "amoffat/getlost-level-template",
            commit: "main",
          };
          if (!sharedState.assemblyscriptTainted) {
            server.ws.send("gl:log", {
              msg: "Serving cached bundle",
              className: "success",
            });

            res.setHeader("Content-Type", "application/javascript");
            res.statusCode = 200;
            res.end(cachedJs);
            return;
          }

          const start = performance.now();
          server.ws.send("gl:log", {
            msg: "Bundling JavaScript...",
            className: "info",
          });

          try {
            const bundledJs = await bundleWithRollup(metadata);

            res.setHeader("Content-Type", "application/javascript");
            res.statusCode = 200;
            res.end(bundledJs);

            cachedJs = bundledJs;
            const end = performance.now();
            const time = (end - start).toFixed(2);
            server.ws.send("gl:log", {
              msg: `Bundle compiled in ${time}ms`,
              className: "success",
            });
            sharedState.assemblyscriptTainted = false;
          } catch (e) {
            if (isCompileError(e)) {
              server.ws.send("gl:log", {
                msg: e.message,
                className: "error",
              });
              console.error(e.message);
            } else {
              console.error(e);
            }
            res.writeHead(500, {
              "Content-Type": "text/plain",
              "Access-Control-Allow-Origin": "*",
            });
            res.end("Failed to compile");
            return;
          }
        } else {
          next();
        }
      });
    },
  };
}
