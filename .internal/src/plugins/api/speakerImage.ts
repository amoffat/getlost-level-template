import { resolve } from "path";
import { createPngRouter } from "./utils/assetRouter";

const internalDir = process.cwd();
const repoDir = resolve(internalDir, "..");
const levelDir = resolve(repoDir, "level");
const speakerDir = resolve(levelDir, "speakers");

export const router = createPngRouter({
  dir: speakerDir,
  fieldName: "speaker",
  maxFileSize: 20 * 1024 * 1024,
});
