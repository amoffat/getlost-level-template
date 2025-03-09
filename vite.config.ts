import basicSsl from "@vitejs/plugin-basic-ssl";
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
        res.setHeader("Access-Control-Allow-Credentials", "true");

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
    plugins: [
      // There's a bug in Github codespaces. Even though we have our vite port
      // set as https in the devcontainer.json, Codespaces will set the protocol
      // as http and won't let you change it. So on codespaces, we don't use
      // https, which is fine because the Dev Tunnel itself is https.
      process.env.CODESPACES
        ? null
        : basicSsl({
            name: "test",
            domains: ["localhost"],
          }),
      addHeadersPlugin(),
      react(),
      compileWasmPlugin(),
      levelPlugin(),
    ],
    define: {
      DEVCONTAINER: process.env.DEVCONTAINER,
    },
  };
});
