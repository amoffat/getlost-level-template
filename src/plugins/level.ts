import { promises as fs } from "fs";
import path from "path";
import { Plugin } from "vite";
import { isAllowedOrigin } from "./utils";

export default function levelPlugin(): Plugin {
  const cwd = process.cwd();
  const levelDir = path.join(cwd, "level");

  return {
    name: "vite-plugin-level-middleware",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.headers.host) {
          return next();
        }

        const requestUrl = new URL(req.url, `http://${req.headers.host}`);
        const decodedPath = decodeURIComponent(requestUrl.pathname);

        // Check that the decodedPath is within the allowed paths
        if (!decodedPath.startsWith("/level")) {
          return next();
        }

        const isAllowed = isAllowedOrigin(req.headers.origin);

        if (!isAllowed) {
          res.writeHead(403, {
            "Content-Type": "text/plain",
            "Access-Control-Allow-Origin": "*",
          });
          res.end("Forbidden");
          return;
        }

        // Check if the request starts with /tiled
        if (req.method === "OPTIONS") {
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Access-Control-Allow-Methods", "*");
          res.setHeader("Access-Control-Allow-Headers", "*");
          res.setHeader("Access-Control-Allow-Private-Network", "true");
          res.setHeader("cross-origin-resource-policy", "cross-origin");
          res.statusCode = 200;
          res.end();
          return;
        }

        const subPath = decodedPath.replace(/^\/level\//, "");
        const filePath = path.resolve(levelDir, subPath);

        // Ensure the resolved file path is within the base directory
        if (!filePath.startsWith(levelDir)) {
          console.error("Access denied:", filePath);
          res.statusCode = 403;
          res.end("Access denied");
          return;
        }

        try {
          const fileContent = await fs.readFile(filePath);

          // Set CORS headers to allow all origins
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Access-Control-Allow-Methods", "*");
          res.setHeader("Access-Control-Allow-Headers", "*");
          res.setHeader("Access-Control-Allow-Private-Network", "true");
          res.setHeader("cross-origin-resource-policy", "cross-origin");

          res.statusCode = 200;
          res.end(fileContent);
        } catch (err) {
          console.error("Error reading file:", err);
          res.statusCode = 404;
          res.end("File not found");
        }
      });
    },
  };
}
