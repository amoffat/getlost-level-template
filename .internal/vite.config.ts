import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, ViteDevServer } from "vite";
import apiPlugin from "./src/plugins/api/main";
import bundleLevelCodePlugin from "./src/plugins/bundle";
import { isAllowedOrigin } from "./src/plugins/utils";
import levelWatcher from "./src/plugins/watcher";

// I would like to put these in `server.headers`, but it doesn't appear to work.
function addHeadersPlugin() {
  return {
    name: "vite-plugin-add-headers",
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        if (isAllowedOrigin(req.headers.origin)) {
          res.setHeader("Access-Control-Allow-Private-Network", "true");
        }

        res.setHeader("Access-Control-Allow-Methods", "*");
        res.setHeader("Access-Control-Allow-Headers", "*");
        res.setHeader("Access-Control-Expose-Headers", "*");
        res.setHeader("Access-Control-Allow-Credentials", "true");

        res.setHeader("cross-origin-resource-policy", "cross-origin");
        res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
        res.setHeader("Cross-Origin-Opener-Policy", "same-origin");

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
    define: {
      // poly2tri uses `global` which doesn't exist in browsers
      global: "globalThis",
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    plugins: [
      // There's a bug in Github codespaces. Even though we have our vite port
      // set as https in the devcontainer.json, Codespaces will set the protocol
      // as http and won't let you change it. So on codespaces, we don't use
      // https, which is fine because the Dev Tunnel itself is https.
      // process.env.CODESPACES
      //   ? null
      //   : basicSsl({
      //       name: "test",
      //       domains: ["localhost"],
      //     }),
      addHeadersPlugin(),
      react(),
      bundleLevelCodePlugin(),
      levelWatcher(),
      apiPlugin(),
    ],
  };
});
