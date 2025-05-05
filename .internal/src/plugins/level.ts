import { promises as fs } from "fs";
import path from "path";
import { Plugin } from "vite";

export default function levelPlugin(): Plugin {
  const cwd = process.cwd();
  const repoDir = path.resolve(cwd, "..");
  const levelDir = path.join(repoDir, "level");

  return {
    name: "vite-plugin-level-middleware",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url) {
          return next();
        }

        const requestUrl = new URL(req.url, `http://localhost`);
        const decodedPath = decodeURIComponent(requestUrl.pathname);

        // Check that the decodedPath is within the allowed paths
        if (!decodedPath.startsWith("/level")) {
          return next();
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
