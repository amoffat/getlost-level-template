import react from "@vitejs/plugin-react";
import { defineConfig, ViteDevServer } from "vite";
import compileWasmPlugin from "./src/plugins/assemblyscript";
import levelPlugin from "./src/plugins/level";
import { isAllowedOrigin } from "./src/plugins/utils";

// I would like to put these in `server.headers`, but it doesn't appear to work.
function addHeadersPlugin() {
  return {
    name: "vite-plugin-add-headers",
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        const isAllowed = isAllowedOrigin(req.headers.origin);

        // We shouldn't need to set all of these headers on non-preflight
        // (OPTIONS) requests, but for some reason, when the browser asks for
        // the WASM file, it wants these headers set.
        if (isAllowed) {
          res.setHeader("Access-Control-Allow-Origin", req.headers.origin!);
        }
        res.setHeader("Access-Control-Allow-Methods", "*");
        res.setHeader("Access-Control-Allow-Headers", "*");
        res.setHeader("Access-Control-Allow-Private-Network", "true");

        res.setHeader("cross-origin-resource-policy", "cross-origin");
        res.setHeader("cross-origin-opener-policy", "same-origin");
        res.setHeader("cross-origin-embedder-policy", "require-corp");

        if (req.method === "OPTIONS") {
          res.statusCode = 200;
          res.end();
          return;
        }

        next(); // Pass the request to the next middleware/plugin
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [addHeadersPlugin(), react(), compileWasmPlugin(), levelPlugin()],
    define: {
      DEVCONTAINER: process.env.DEVCONTAINER,
    },
  };
});
