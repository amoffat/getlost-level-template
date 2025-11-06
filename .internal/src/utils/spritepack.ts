export interface PackedSpriteMeta {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PackSpritesOptions {
  /** Padding (in pixels) inserted to the right and bottom of each sprite
   * (default 0). */
  padding?: number;
  /** Heuristic for ordering sprites before packing (default 'height'). */
  heuristic?: "height" | "area" | "max";
  idealSizeMultiple?: number; // default 1.5
}

export interface PackSpritesResult {
  objectUrl: string;
  width: number; // Final sheet width
  height: number; // Final sheet height
  sprites: PackedSpriteMeta[]; // Placement metadata
}

interface LoadedSprite {
  bitmap: ImageBitmap;
  index: number;
  area: number;
  maxDim: number;
}

/**
 * Pack a collection of arbitrarily sized sprite images into a single sprite sheet (single-pass heuristic).
 *
 * This simplified implementation favors speed over optimal squareness: it performs
 * exactly one shelf-packing pass using a target width of max(largestSpriteWidth, idealAreaSide * 1.5),
 * where idealAreaSide ≈ sqrt(totalPixelArea). This tends to yield a moderately wide
 * sheet while keeping runtime minimal.
 *
 * Steps:
 * 1. Prepare sprites with metadata (area, maxDim).
 * 2. Sort sprites by heuristic (height | area | max) descending to reduce fragmentation.
 * 3. Compute total area & ideal side length; derive target width = max(largestWidth, ideal * 1.5).
 * 4. Perform a single shelf layout (left-to-right, new row when width exceeded).
 * 5. Optionally expand dimensions to power-of-two.
 * 6. Render to canvas & return sprite metadata.
 *
 * Padding: right & bottom padding (except outermost edges) reduces sampling bleed.
 */
export async function packSprites(
  bitmaps: ImageBitmap[],
  options: PackSpritesOptions = {}
): Promise<PackSpritesResult> {
  if (!bitmaps || bitmaps.length === 0) {
    throw new Error("packSprites: no bitmaps provided");
  }

  const padding = options.padding ?? 0;
  const heuristic = options.heuristic ?? "height";

  // 1. Prepare sprites with metadata
  const loaded: LoadedSprite[] = bitmaps.map((bitmap, index) => ({
    bitmap,
    index,
    area: bitmap.width * bitmap.height,
    maxDim: Math.max(bitmap.width, bitmap.height),
  }));

  // 2. Sort by heuristic (descending)
  const sorted = [...loaded].sort((a, b) => {
    switch (heuristic) {
      case "area":
        return b.area - a.area;
      case "max":
        return b.maxDim - a.maxDim;
      case "height":
      default:
        return b.bitmap.height - a.bitmap.height;
    }
  });

  // 3. Total area & derive single target width
  const totalArea = sorted.reduce((s, sp) => s + sp.area, 0);
  const ideal = Math.ceil(Math.sqrt(totalArea));
  const largestWidth = Math.max(...sorted.map((s) => s.bitmap.width));
  const targetWidth = Math.max(
    largestWidth,
    Math.round(ideal * (options.idealSizeMultiple ?? 1.5))
  );

  // Single shelf pack
  let x = 0;
  let y = 0;
  let rowHeight = 0;
  const placements: PackedSpriteMeta[] = [];
  for (const sp of sorted) {
    const w = sp.bitmap.width;
    const h = sp.bitmap.height;
    if (x > 0 && x + w > targetWidth) {
      y += rowHeight + padding;
      x = 0;
      rowHeight = 0;
    }
    placements.push({ index: sp.index, x, y, width: w, height: h });
    x += w + padding;
    rowHeight = Math.max(rowHeight, h);
  }
  const finalWidth = targetWidth;
  const finalHeight = y + rowHeight;

  // 7. Draw to canvas
  const canvas = document.createElement("canvas");
  canvas.width = finalWidth;
  canvas.height = finalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("packSprites: could not get 2d context");
  ctx.clearRect(0, 0, finalWidth, finalHeight);

  for (const p of placements) {
    const sp = sorted.find((s) => s.index === p.index)!;
    ctx.drawImage(sp.bitmap, p.x, p.y);
  }

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) =>
      b ? resolve(b) : reject(new Error("packSprites: toBlob returned null"))
    );
  });
  const objectUrl = URL.createObjectURL(blob);

  return {
    objectUrl,
    width: finalWidth,
    height: finalHeight,
    sprites: placements,
  };
}
