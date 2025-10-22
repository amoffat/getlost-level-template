import { converter } from "culori";
import { OklabColor } from "../types/color";
const toOKLab = converter("oklab");

/**
 * Compute the average OKLab color over all pixels in an ImageData.
 *
 * Behavior:
 * - Converts each pixel from sRGB to OKLab using culori.
 * - Averages in OKLab space.
 * - Weights each pixel by its alpha (a/255). If all pixels are fully transparent
 *   (sum of alpha weights is 0), falls back to an unweighted average.
 */
export function averageOklab(image: ImageData): OklabColor {
  const { data } = image;
  const n = data.length;
  if (n === 0) return { l: 0, a: 0, b: 0 };

  let sumLw = 0;
  let sumAw = 0;
  let sumBw = 0;
  let wSum = 0;

  // Also accumulate an unweighted sum to fall back on if wSum == 0
  let sumLu = 0;
  let sumAu = 0;
  let sumBu = 0;
  let count = 0;

  for (let i = 0; i < n; i += 4) {
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;
    const a = data[i + 3] / 255; // weight contribution by alpha

    const lab = toOKLab({ mode: "rgb", r, g, b }) as {
      l: number;
      a: number;
      b: number;
    } | null;
    if (!lab) continue;

    // Weighted sums
    sumLw += lab.l * a;
    sumAw += lab.a * a;
    sumBw += lab.b * a;
    wSum += a;

    // Unweighted sums
    sumLu += lab.l;
    sumAu += lab.a;
    sumBu += lab.b;
    count++;
  }

  if (wSum > 0) {
    return { l: sumLw / wSum, a: sumAw / wSum, b: sumBw / wSum };
  }
  if (count > 0) {
    return { l: sumLu / count, a: sumAu / count, b: sumBu / count };
  }
  return { l: 0, a: 0, b: 0 };
}
