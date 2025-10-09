import { Rect } from "@/types/rect";

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

export function getImageDataFromBitmap(bitmap: ImageBitmap): ImageData {
  const width = bitmap.width;
  const height = bitmap.height;
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get 2D context for OffscreenCanvas");
  ctx.drawImage(bitmap, 0, 0);
  return ctx.getImageData(0, 0, width, height);
}

export function subImageData(source: ImageData, rect: Rect): ImageData {
  const { width: sw, data: sdata } = source;
  const { ul, br } = rect;
  const w = Math.ceil(br.x) - Math.floor(ul.x);
  const h = Math.ceil(br.y) - Math.floor(ul.y);
  const out = new Uint8ClampedArray(w * h * 4);

  for (let row = 0; row < h; row++) {
    const srcStart = ((Math.floor(ul.y) + row) * sw + Math.floor(ul.x)) * 4;
    const srcEnd = srcStart + w * 4;
    const dstStart = row * w * 4;
    out.set(sdata.subarray(srcStart, srcEnd), dstStart);
  }

  return new ImageData(out, w, h);
}

// Returns true if every pixel within the rect has alpha == 0
export function isRectTransparent(imageData: ImageData, rect: Rect): boolean {
  const { width, data } = imageData;
  const x0 = Math.max(0, Math.floor(rect.ul.x));
  const y0 = Math.max(0, Math.floor(rect.ul.y));
  const x1 = Math.min(imageData.width, Math.ceil(rect.br.x));
  const y1 = Math.min(imageData.height, Math.ceil(rect.br.y));

  for (let y = y0; y < y1; y++) {
    let idx = (y * width + x0) * 4 + 3; // start at alpha channel for (x0, y)
    for (let x = x0; x < x1; x++) {
      if (data[idx] !== 0) return false; // found a non-transparent pixel
      idx += 4; // advance to next pixel's alpha
    }
  }
  return true;
}

/**
 * Returns true if all four edges (top, bottom, left, right) of the given rect
 * are completely opaque (alpha == 255) within the provided ImageData. The rect
 * is clipped to the ImageData bounds.
 */
export function hasSolidEdges(imageData: ImageData, rect: Rect): boolean {
  const { width, data } = imageData;
  const x0 = Math.max(0, Math.floor(rect.ul.x));
  const y0 = Math.max(0, Math.floor(rect.ul.y));
  const x1 = Math.min(imageData.width, Math.ceil(rect.br.x));
  const y1 = Math.min(imageData.height, Math.ceil(rect.br.y));

  const w = x1 - x0;
  const h = y1 - y0;
  if (w <= 0 || h <= 0) return false; // degenerate rect cannot have solid edges

  // Top edge (y = y0)
  {
    let idx = (y0 * width + x0) * 4 + 3; // alpha channel
    for (let x = x0; x < x1; x++) {
      if (data[idx] !== 255) return false;
      idx += 4;
    }
  }

  // Bottom edge (y = y1 - 1)
  {
    const y = y1 - 1;
    let idx = (y * width + x0) * 4 + 3;
    for (let x = x0; x < x1; x++) {
      if (data[idx] !== 255) return false;
      idx += 4;
    }
  }

  // Left edge (x = x0)
  for (let y = y0; y < y1; y++) {
    const idx = (y * width + x0) * 4 + 3;
    if (data[idx] !== 255) return false;
  }

  // Right edge (x = x1 - 1)
  {
    const x = x1 - 1;
    for (let y = y0; y < y1; y++) {
      const idx = (y * width + x) * 4 + 3;
      if (data[idx] !== 255) return false;
    }
  }

  return true;
}
