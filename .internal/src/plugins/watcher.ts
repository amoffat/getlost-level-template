import chokidar from "chokidar";
import path from "path";
import { ViteDevServer } from "vite";

const cwd = process.cwd();
const repoDir = path.resolve(cwd, "..");
const internalDir = path.resolve(repoDir, ".internal");

// Triggers a game iframe reload when level assets change
export default function levelWatcher() {
  return {
    name: "level-watcher",
    configureServer(server: ViteDevServer) {
      console.log("Level watcher plugin loaded", { internalDir, repoDir });

      // We are manually setting up our watcher, because if we use
      // server.watcher, it won't let us watch files outside of the project
      // root. And since we've tucked away our framework into a .internal
      // directory, our level files are outside of the project root.
      const watcher = chokidar
        .watch("..", {
          ignored: [/node_modules/, /.git/, /.mypy_cache/, /__pycache__/],
        })
        .on("change", (changed) => {
          changed = path.resolve(internalDir, changed);
          console.log("Changed:", changed);

          let gameReload = false;
          // If it's in the repo's /level directory, reload the game
          if (changed.startsWith(`${repoDir}/level/`)) {
            gameReload = true;

            // Ignore dialogue.ts file, so there isn't a reload loop, because the
            // dynamic AS compiler will produce a new dialogue.ts file, which will
            // trigger a reload.
            if (changed.endsWith("dialogue.ts")) {
              gameReload = false;
            }

            if (changed.includes("/locales/")) {
              gameReload = false;
            }
          }

          // If it's in the /assemblyscript directory, reload the game
          if (changed.startsWith(`${internalDir}/@gl/`)) {
            gameReload = true;
          }

          // If it's in the spindler directory, reload the game
          if (changed.startsWith(`${internalDir}/spindler/`)) {
            gameReload = true;
          }

          // If it's a __pycache__ directory, ignore it
          if (changed.includes("__pycache__")) {
            gameReload = false;
          }

          if (changed.endsWith("engine_version.txt")) {
            gameReload = true;
          }

          if (changed.endsWith(".cbor")) {
            gameReload = true;
          }

          if (changed.includes("syncthing")) {
            gameReload = false;
          }

          if (gameReload) {
            console.log(`Triggering reload: ${changed}`);
            server.ws.send("gl:level-reload");
            server.ws.send("gl:log", {
              msg: `Reload triggered: ${changed}`,
              className: "info",
            });
          }
        });

      server.httpServer?.on("close", () => {
        console.log("Closing watcher");
        watcher.close();
      });
    },
  };
}
