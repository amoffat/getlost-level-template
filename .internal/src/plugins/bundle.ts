import { readFileSync } from "fs";
import { resolve } from "path";
import { ViteDevServer } from "vite";
import { bundleWithRollup, isCompileError } from "../bundler";

const internalDir = process.cwd();
const repoDir = resolve(internalDir, "..");

const packageJson = JSON.parse(
  readFileSync(resolve(internalDir, "package.json"), "utf-8"),
);
const tmplVersion = packageJson.version;

// Dynamically compile the level code as it is fetched.
export default function bundleLevelCodePlugin() {
  return {
    name: "bundle-level-code",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(
          `http://${process.env.HOST ?? "localhost"}${req.url}`,
        );

        if (url.pathname === "/main.js") {
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
          server.ws.send("gl:log", {
            msg: "Bundling JavaScript...",
            className: "info",
          });

          try {
            const bundledJs = await bundleWithRollup(metadata, {
              minify: false,
            });

            res.setHeader("Content-Type", "application/javascript");
            res.statusCode = 200;
            res.end(bundledJs);

            const end = performance.now();
            const time = (end - start).toFixed(2);
            server.ws.send("gl:log", {
              msg: `Bundle compiled in ${time}ms`,
              className: "success",
            });
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
