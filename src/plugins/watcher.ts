import { ViteDevServer } from "vite";

const repoDir = process.cwd();

// Triggers a game iframe reload when level assets change
export default function levelWatcher() {
  return {
    name: "level-watcher",
    configureServer(server: ViteDevServer) {
      server.watcher.on("change", (path) => {
        // console.log("Changed:", path);

        let gameReload = false;
        // If it's in the repo's /level directory, reload the game
        if (path.startsWith(`${repoDir}/level/`)) {
          gameReload = true;

          // Ignore *.tiled-session files
          if (path.endsWith(".tiled-session")) {
            gameReload = false;
          }
        }

        // If it's in the /assemblyscript directory, reload the game
        if (path.startsWith(`${repoDir}/assemblyscript/@gl/`)) {
          gameReload = true;
        }

        if (gameReload) {
          console.log("Triggering reload");
          server.ws.send("gl:level-reload");
        }
      });
    },
  };
}
