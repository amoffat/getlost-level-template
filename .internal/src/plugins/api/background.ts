import { resolve } from "path";
import { createPngRouter } from "./utils/assetRouter";

const internalDir = process.cwd();
const repoDir = resolve(internalDir, "..");
const levelDir = resolve(repoDir, "level");
const backgroundDir = resolve(levelDir, "backgrounds");

export const router = createPngRouter({
  dir: backgroundDir,
  fieldName: "background",
  maxFileSize: 20 * 1024 * 1024,
  restricted: true,
});
