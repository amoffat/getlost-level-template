export interface MergeFramesResult {
  frames: number; // number of frames merged
  blob: Blob; // output PNG blob (default canvas encoding)
  dataURL: string; // data URL for immediate preview
  width: number; // total strip width
  height: number; // frame height (all identical)
  frameWidth: number; // width of each frame (identical assumption)
  names: string[]; // file names in provided order
}

/**
 * Merge multiple frame images (e.g., sprite frames) horizontally into a single strip.
 * Returns both a Blob and Data URL plus metadata.
 */
export async function mergeFrames(files: File[]): Promise<MergeFramesResult> {
  if (!files || files.length === 0) {
    throw new Error("mergeFrames: no files provided");
  }

  // Decode images in parallel using createImageBitmap (order preserved)
  const loaded = await Promise.all(
    files.map(async (file) => {
      const bitmap = await createImageBitmap(file);
      return { bitmap, file };
    })
  );

  // Assert identical dimensions
  const { width: frameWidth, height } = loaded[0].bitmap;
  for (let i = 1; i < loaded.length; i++) {
    const im = loaded[i].bitmap;
    if (im.width !== frameWidth || im.height !== height) {
      throw new Error(
        `mergeFrames: frame size mismatch at index ${i} (expected ${frameWidth}x${height}, got ${im.width}x${im.height})`
      );
    }
  }

  const totalWidth = frameWidth * loaded.length;
  const canvas = document.createElement("canvas");
  canvas.width = totalWidth;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("mergeFrames: could not get 2d context");
  ctx.clearRect(0, 0, totalWidth, height); // transparent background

  let x = 0;
  for (const { bitmap } of loaded) {
    ctx.drawImage(bitmap, x, 0);
    x += frameWidth;
  }

  // Release bitmap resources explicitly (optional cleanup)
  for (const { bitmap } of loaded) {
    if ("close" in bitmap) (bitmap as ImageBitmap).close();
  }

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) =>
      b ? resolve(b) : reject(new Error("mergeFrames: toBlob returned null"))
    );
  });
  const dataURL = canvas.toDataURL();

  return {
    frames: loaded.length,
    blob,
    dataURL,
    width: totalWidth,
    height,
    frameWidth,
    names: loaded.map(({ file }) => file.name),
  };
}
