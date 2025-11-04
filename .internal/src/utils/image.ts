import { Rect } from "@/types/rect";

/**
 * Returns true if the integer extent of rect (floor ul, ceil br) lies entirely
 * within the bounds of the given ImageData. Does not evaluate degeneracy; a
 * zero- or negative-sized rect can still return true if its extents are in-bounds.
 */
export function isRectWithinImageData(image: ImageData, rect: Rect): boolean {
  const x0 = Math.floor(rect.ul.x);
  const y0 = Math.floor(rect.ul.y);
  const x1 = Math.ceil(rect.br.x);
  const y1 = Math.ceil(rect.br.y);
  return x0 >= 0 && y0 >= 0 && x1 <= image.width && y1 <= image.height;
}

export function getImageDataFromBitmap(bitmap: ImageBitmap): ImageData {
  const width = bitmap.width;
  const height = bitmap.height;
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Failed to get 2D context for OffscreenCanvas");
  ctx.drawImage(bitmap, 0, 0);
  return ctx.getImageData(0, 0, width, height);
}

export function subImageData(source: ImageData, rect: Rect): ImageData {
  const { width: sw, data: sdata } = source;
  const { ul, br } = rect;
  const w = Math.ceil(br.x) - Math.floor(ul.x);
  const h = Math.ceil(br.y) - Math.floor(ul.y);

  // Enforce strict in-bounds access
  if (!isRectWithinImageData(source, rect)) {
    throw new Error(
      `subImageData: requested rect is out of ImageData bounds (${source.width}x${source.height})`
    );
  }

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
export function isTransparent(imageData: ImageData): boolean {
  const { data } = imageData;
  // Check alpha channel of every pixel (A at index 3, step by 4)
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] !== 0) return false;
  }
  return true;
}

export function amountOpaquePixels(imageData: ImageData): number {
  const { data } = imageData;
  const total = data.length / 4;

  let opaque = 0;
  // Check alpha channel of every pixel (A at index 3, step by 4)
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] !== 0) opaque++;
  }
  return opaque / total;
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
