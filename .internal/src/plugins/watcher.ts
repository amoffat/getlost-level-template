import chokidar from "chokidar";
import path from "path";
import { ViteDevServer } from "vite";

const cwd = process.cwd();
const repoDir = path.resolve(cwd, "..");
const internalDir = path.resolve(repoDir, ".internal");

interface DispatchPath {
  name: string;
  matches(changed: string): boolean;
  dispatch(server: ViteDevServer, changed: string): void;
}

// Triggers a full game iframe reload when level assets change.
const gameReloadPath: DispatchPath = {
  name: "gameReload",
  matches(changed) {
    if (changed.includes("__pycache__")) return false;
    if (changed.includes("syncthing")) return false;

    // Files in the repo's /level directory (with some exclusions)
    if (changed.startsWith(`${repoDir}/level/`)) {
      // Ignore dialogue.ts to avoid a reload loop: the dynamic AS compiler
      // produces a new dialogue.ts, which would otherwise trigger a reload.
      if (changed.endsWith("dialogue.ts")) return false;
      if (changed.includes("/locales/")) return false;
      return true;
    }

    if (changed.startsWith(`${internalDir}/@gl/`)) return true;
    if (changed.endsWith("engine_version.txt")) return true;
    if (changed.endsWith(".cbor")) return true;

    return false;
  },
  dispatch(server, changed) {
    console.log(`[gameReload] Triggering reload: ${changed}`);
    server.ws.send("gl:level-reload");
    server.ws.send("gl:log", {
      msg: `Reload triggered: ${changed}`,
      className: "info",
    });
  },
};

// Stub: will convert audio files in level/sounds when triggered.
const audioConversionPath: DispatchPath = {
  name: "audioConversion",
  matches(changed) {
    return changed.startsWith(`${repoDir}/level/sounds/`);
  },
  dispatch(_server, changed) {
    // TODO: implement audio conversion
    console.log(
      `[audioConversion] Audio file changed (conversion not yet implemented): ${changed}`,
    );
  },
};

const dispatchPaths: DispatchPath[] = [gameReloadPath, audioConversionPath];

// Triggers dispatch paths when level assets change
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

          for (const dispatchPath of dispatchPaths) {
            if (dispatchPath.matches(changed)) {
              dispatchPath.dispatch(server, changed);
            }
          }
        });

      server.httpServer?.on("close", () => {
        console.log("Closing watcher");
        watcher.close();
      });
    },
  };
}
