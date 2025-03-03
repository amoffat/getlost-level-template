import react from "@vitejs/plugin-react";
import { defineConfig, ViteDevServer } from "vite";
import compileWasmPlugin from "./src/plugins/assemblyscript";
import levelPlugin from "./src/plugins/level";

// I would like to put these in `server.headers`, but it doesn't appear to work.
function addHeadersPlugin() {
  return {
    name: "vite-plugin-add-headers",
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        res.setHeader("access-control-allow-origin", "*");
        res.setHeader("access-control-allow-headers", "*");
        res.setHeader("access-control-allow-methods", "*");
        res.setHeader("cross-origin-resource-policy", "cross-origin");
        res.setHeader("cross-origin-opener-policy", "same-origin");
        res.setHeader("cross-origin-embedder-policy", "require-corp");
        next(); // Pass the request to the next middleware/plugin
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [addHeadersPlugin(), react(), compileWasmPlugin(), levelPlugin()],
  };
});
