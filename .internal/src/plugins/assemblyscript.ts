import { readFileSync } from "fs";
import fs from "fs/promises";
import { resolve } from "path";
import { ViteDevServer } from "vite";
import { sharedState } from "./shared";
import { compileWasm } from "./wasm-compiler";

const internalDir = process.cwd();
const repoDir = resolve(internalDir, "..");
const asmLibDir = resolve(internalDir, "assemblyscript");
const shimDir = asmLibDir;
const levelDir = resolve(repoDir, "level");
const codeDir = resolve(repoDir, "level", "code");
const genDir = resolve(codeDir, "generated");
let cachedWasm: Uint8Array = new Uint8Array(0);

const packageJson = JSON.parse(
  readFileSync(resolve(internalDir, "package.json"), "utf-8")
);
const tmplVersion = packageJson.version;

function isCompileError(e: unknown): e is { message: string } {
  return e !== undefined && (e as { message: string }).message !== undefined;
}

// Dynamically compile the AssemblyScript files as they are fetched.
export default function compileWasmPlugin() {
  return {
    name: "wasm-compiler",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const engineVersion = await fs.readFile(
          resolve(process.cwd(), "..", "engine_version.txt"),
          "utf-8"
        );
        const url = new URL(
          `http://${process.env.HOST ?? "localhost"}${req.url}`
        );
        const target = url.searchParams.get("target") ?? "debug";
        const release = target === "release";

        if (url.pathname === "/main.wasm") {
          if (!sharedState.assemblyscriptTainted) {
            server.ws.send("gl:wasm-compiler", {
              msg: "Serving cached WASM",
              className: "success",
            });

            res.setHeader("Content-Type", "application/wasm");
            res.statusCode = 200;
            res.end(cachedWasm);
            return;
          }

          const start = performance.now();
          server.ws.send("gl:wasm-compiler", {
            msg: "Compiling WASM...",
            className: "success",
          });

          try {
            const levelFile = resolve(codeDir, "main.ts");
            const artifacts = await compileWasm({
              metadata: {
                engineVersion,
                tmplVersion,
                levelId: "936872190",
                repo: "amoffat/getlost-level-template",
                commit: "main",
              },
              sourceFiles: [levelFile],
              release,
              asmLibDir,
              levelDir,
              genDir,
            });

            const defsFile = resolve(shimDir, "main.d.ts");
            const jsFile = resolve(shimDir, "main.js");
            const textFile = resolve(shimDir, "main.wat");

            // Check if the current definitions file is different from the new one
            const currentDefs = await fs
              .readFile(defsFile, "utf-8")
              .catch(() => "");
            if (currentDefs !== artifacts.dts) {
              await fs.writeFile(defsFile, artifacts.dts);
            }

            // Check if the current JS shim is different from the new one
            const currentJs = await fs
              .readFile(jsFile, "utf-8")
              .catch(() => "");
            if (currentJs !== artifacts.js) {
              await fs.writeFile(jsFile, artifacts.js);
            }

            if (artifacts.text) {
              await fs.writeFile(textFile, artifacts.text);
            }

            res.setHeader("Content-Type", "application/wasm");
            res.statusCode = 200;
            res.end(artifacts.wasm);

            cachedWasm = artifacts.wasm;
            const end = performance.now();
            const time = (end - start).toFixed(2);
            server.ws.send("gl:wasm-compiler", {
              msg: `WASM compiled in ${time}ms`,
              className: "success",
            });
            sharedState.assemblyscriptTainted = false;
          } catch (e) {
            if (isCompileError(e)) {
              server.ws.send("gl:wasm-compiler", {
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
