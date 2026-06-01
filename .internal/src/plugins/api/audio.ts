import { execFile } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { resolve } from "path";
import { promisify } from "util";
import { type PutOutputEntry, createAudioRouter } from "./utils/assetRouter";

const execFileAsync = promisify(execFile);

const internalDir = process.cwd();
const repoDir = resolve(internalDir, "..");
const levelDir = resolve(repoDir, "level");
const soundsDir = resolve(levelDir, "sounds");

const OGG_CODEC_ARGS = ["-c:a", "libopus", "-b:a", "160k"];

// TODO This can go away once we're comfortable that most ios users are on 18.4+
const M4A_CODEC_ARGS = ["-c:a", "aac", "-b:a", "160k"];

/**
 * Transcode `inputBuf` (a file with extension `inputExt`) to `outputExt` using
 * ffmpeg, returning the output as a Buffer.  Temp files are cleaned up on both
 * success and failure.
 */
async function convertAudio(
  inputBuf: Buffer,
  inputExt: string,
  outputExt: string,
): Promise<Buffer> {
  const tmpDir = os.tmpdir();
  const id = crypto.randomUUID();
  const inputPath = path.join(tmpDir, `gl-audio-${id}${inputExt}`);
  const outputPath = path.join(tmpDir, `gl-audio-${id}${outputExt}`);

  try {
    fs.writeFileSync(inputPath, inputBuf);
    const codecArgs = outputExt === ".ogg" ? OGG_CODEC_ARGS : M4A_CODEC_ARGS;
    await execFileAsync("ffmpeg", [
      "-v",
      "error",
      "-y",
      "-i",
      inputPath,
      ...codecArgs,
      outputPath,
    ]);
    return fs.readFileSync(outputPath);
  } finally {
    for (const p of [inputPath, outputPath]) {
      try {
        fs.unlinkSync(p);
      } catch {
        /* already gone */
      }
    }
  }
}

export const router = createAudioRouter({
  dir: soundsDir,
  fieldName: "audio",
  maxFileSize: 100 * 1024 * 1024,
  allowRestricted: true,
  onPut: async ({ ext, buf }): Promise<PutOutputEntry[]> => {
    if (ext === ".ogg") {
      const m4aBuf = await convertAudio(buf, ".ogg", ".m4a");
      return [
        { ext: ".ogg", buf },
        { ext: ".m4a", buf: m4aBuf },
      ];
    }

    if (ext === ".m4a") {
      const oggBuf = await convertAudio(buf, ".m4a", ".ogg");
      return [
        { ext: ".ogg", buf: oggBuf },
        { ext: ".m4a", buf },
      ];
    }

    // .wav / .mp3 — convert to both target formats in parallel
    const [oggBuf, m4aBuf] = await Promise.all([
      convertAudio(buf, ext, ".ogg"),
      convertAudio(buf, ext, ".m4a"),
    ]);
    return [
      { ext: ".ogg", buf: oggBuf },
      { ext: ".m4a", buf: m4aBuf },
    ];
  },
});
