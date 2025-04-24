import { ViteDevServer } from "vite";
import { sharedState } from "./shared";

const repoDir = process.cwd();

// Triggers a game iframe reload when level assets change
export default function levelWatcher() {
  return {
    name: "level-watcher",
    configureServer(server: ViteDevServer) {
      server.watcher.on("change", (path) => {
        console.log("Changed:", path);

        let gameReload = false;
        // If it's in the repo's /level directory, reload the game
        if (path.startsWith(`${repoDir}/level/`)) {
          gameReload = true;

          // Ignore *.tiled-session files
          if (path.endsWith(".tiled-session")) {
            gameReload = false;
          }

          // Ignore dialogue.ts file, so there isn't a reload loop, because the
          // dynamic AS compiler will produce a new dialogue.ts file, which will
          // trigger a reload.
          if (path.endsWith("dialogue.ts")) {
            gameReload = false;
          }
        }

        // If it's in the /assemblyscript directory, reload the game
        if (path.startsWith(`${repoDir}/assemblyscript/@gl/`)) {
          gameReload = true;
        }

        // If it's in the spindler directory, reload the game
        if (path.startsWith(`${repoDir}/spindler/`)) {
          gameReload = true;
        }

        // If it's a __pycache__ directory, ignore it
        if (path.includes("__pycache__")) {
          gameReload = false;
        }

        if (path.endsWith("engine_version.txt")) {
          gameReload = true;
        }

        if (gameReload) {
          sharedState.assemblyscriptTainted = true;
          console.log(`Triggering reload: ${path}`);
          server.ws.send("gl:level-reload");
        }
      });
    },
  };
}
