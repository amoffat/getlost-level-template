import { Rect } from "@/types/rect";

export type Shape = Rect;

/**
 * Configuration options for the coverage algorithm.
 */
interface CoverageOptions {
  /** Target coverage ratio (0-1). Algorithm stops when this coverage is achieved. Default: 0.9 */
  targetCoverage?: number;
  /** Penalty multiplier for skinny shapes. Higher values bias against skinny shapes. Default: 0.5 */
  aspectRatioPenalty?: number;
  /** Minimum shape dimension to consider. Default: 2 */
  minDimension?: number;
}

/**
 * Represents a 2D matrix of boolean values indicating pixel coverage.
 */
class CoverageMatrix {
  private data: Uint8Array;
  private transparent: Uint8Array; // Tracks original transparency state
  private width: number;
  private height: number;
  private totalNonTransparent: number;
  private currentCovered: number;

  constructor(imageData: ImageData) {
    this.width = imageData.width;
    this.height = imageData.height;
    this.data = new Uint8Array(this.width * this.height);
    this.transparent = new Uint8Array(this.width * this.height);
    this.totalNonTransparent = 0;
    this.currentCovered = 0;

    // Initialize coverage matrix from image alpha channel
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = y * this.width + x;
        const alphaIndex = idx * 4 + 3;
        const isNonTransparent = imageData.data[alphaIndex] > 0;
        if (isNonTransparent) {
          this.totalNonTransparent++;
          this.data[idx] = 1; // 1 = uncovered non-transparent pixel
          this.transparent[idx] = 0; // Not transparent
        } else {
          this.transparent[idx] = 1; // Transparent
        }
      }
    }
  }

  /** Get the value at position (x, y). 0 = transparent/covered, 1 = uncovered non-transparent */
  get(x: number, y: number): number {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
    return this.data[y * this.width + x];
  }

  /** Check if a pixel is originally transparent. Returns true for out-of-bounds. */
  isTransparent(x: number, y: number): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return true;
    return this.transparent[y * this.width + x] === 1;
  }

  /** Set the value at position (x, y) */
  private set(x: number, y: number, value: number): void {
    this.data[y * this.width + x] = value;
  }

  /** Mark a rectangle as covered and return the number of newly covered pixels */
  markRectCovered(rect: Rect): number {
    let newlyCovered = 0;
    for (let y = rect.y; y < rect.y + rect.height; y++) {
      for (let x = rect.x; x < rect.x + rect.width; x++) {
        if (this.get(x, y) === 1) {
          this.set(x, y, 0);
          newlyCovered++;
        }
      }
    }
    this.currentCovered += newlyCovered;
    return newlyCovered;
  }

  /** Mark a shape as covered and return the number of newly covered pixels */
  markCovered(shape: Shape): number {
    return this.markRectCovered(shape);
  }

  /** Get the current coverage ratio (0-1) */
  getCoverageRatio(): number {
    if (this.totalNonTransparent === 0) return 1.0;
    return this.currentCovered / this.totalNonTransparent;
  }

  /** Count uncovered non-transparent pixels in a rectangle */
  countUncoveredRect(rect: Rect): number {
    let count = 0;
    for (let y = rect.y; y < rect.y + rect.height; y++) {
      for (let x = rect.x; x < rect.x + rect.width; x++) {
        if (this.get(x, y) === 1) count++;
      }
    }
    return count;
  }

  /** Count uncovered non-transparent pixels in a shape */
  countUncovered(shape: Shape): number {
    return this.countUncoveredRect(shape);
  }

  getWidth(): number {
    return this.width;
  }
  getHeight(): number {
    return this.height;
  }
}

/**
 * Calculate a score for a rectangle based on coverage and aspect ratio.
 * Higher scores are better.
 *
 * @param rect The rectangle to score
 * @param uncoveredPixels Number of uncovered pixels in this rectangle
 * @param aspectRatioPenalty Penalty factor for aspect ratio (0-1)
 * @returns Score value (higher is better)
 */
function scoreRectangle(
  rect: Rect,
  uncoveredPixels: number,
  aspectRatioPenalty: number
): number {
  if (uncoveredPixels === 0) return 0;

  // Base score is the number of uncovered pixels
  let score = uncoveredPixels;

  // Apply aspect ratio penalty to discourage skinny rectangles
  const aspectRatio = Math.max(
    rect.width / rect.height,
    rect.height / rect.width
  );
  const aspectPenalty = 1.0 - aspectRatioPenalty * Math.log(aspectRatio);
  score *= Math.max(0.1, aspectPenalty); // Don't let it go below 0.1

  return score;
}

/**
 * Find the largest rectangle in a histogram using a stack-based algorithm.
 * This is a key component of the maximal rectangle algorithm.
 *
 * @param heights Array of histogram heights
 * @returns Object containing the largest rectangle's left index, width, and height
 */
function largestRectangleInHistogram(heights: number[]): {
  left: number;
  width: number;
  height: number;
} {
  const stack: number[] = [];
  let maxArea = 0;
  let maxRect = { left: 0, width: 0, height: 0 };

  for (let i = 0; i <= heights.length; i++) {
    const h = i === heights.length ? 0 : heights[i];

    while (stack.length > 0 && h < heights[stack[stack.length - 1]]) {
      const heightIndex = stack.pop()!;
      const height = heights[heightIndex];
      const width = stack.length === 0 ? i : i - stack[stack.length - 1] - 1;
      const area = height * width;

      if (area > maxArea) {
        maxArea = area;
        const left = stack.length === 0 ? 0 : stack[stack.length - 1] + 1;
        maxRect = { left, width, height };
      }
    }

    stack.push(i);
  }

  return maxRect;
}

/**
 * Find all maximal rectangles in the coverage matrix using the histogram approach.
 * This algorithm builds histograms row by row and finds the largest rectangle in each.
 *
 * Time complexity: O(w * h) where w is width and h is height
 *
 * @param matrix The coverage matrix
 * @returns Array of all maximal rectangles found
 */
function findMaximalRectangles(matrix: CoverageMatrix): Rect[] {
  const width = matrix.getWidth();
  const height = matrix.getHeight();
  const rectangles: Rect[] = [];

  // Build histogram heights for each row
  const heights = new Array(width).fill(0);

  for (let row = 0; row < height; row++) {
    // Update histogram heights for current row
    for (let col = 0; col < width; col++) {
      if (matrix.get(col, row) === 1) {
        heights[col]++;
      } else {
        heights[col] = 0;
      }
    }

    // Find largest rectangle in this histogram
    const rect = largestRectangleInHistogram(heights);
    if (rect.width > 0 && rect.height > 0) {
      rectangles.push({
        x: rect.left,
        y: row - rect.height + 1,
        width: rect.width,
        height: rect.height,
      });
    }
  }

  return rectangles;
}

/**
 * Score and filter rectangles based on coverage, aspect ratio, and minimum dimensions.
 *
 * @param rectangles Array of candidate rectangles
 * @param matrix The coverage matrix
 * @param minDimension Minimum dimension for rectangles
 * @param aspectRatioPenalty Penalty for skinny rectangles
 * @returns Array of rectangles with their scores, sorted by score (highest first)
 */
function scoreAndFilterRectangles(
  rectangles: Rect[],
  matrix: CoverageMatrix,
  minDimension: number,
  aspectRatioPenalty: number
): Array<{ rect: Rect; score: number }> {
  const scoredRects: Array<{ rect: Rect; score: number }> = [];

  for (const rect of rectangles) {
    // Filter by minimum dimension
    if (rect.width < minDimension || rect.height < minDimension) continue;

    // Count uncovered pixels
    const uncovered = matrix.countUncovered(rect);
    if (uncovered === 0) continue;

    // Calculate score
    const score = scoreRectangle(rect, uncovered, aspectRatioPenalty);
    scoredRects.push({ rect, score });
  }

  // Sort by score descending
  scoredRects.sort((a, b) => b.score - a.score);

  return scoredRects;
}

/**
 * Find the next best rectangle to add to the coverage using the histogram approach.
 *
 * @param matrix The coverage matrix
 * @param minDimension Minimum dimension for rectangles
 * @param aspectRatioPenalty Penalty for skinny rectangles
 * @returns The best rectangle found with its score, or null if none exist
 */
function findNextBestRectangle(
  matrix: CoverageMatrix,
  minDimension: number,
  aspectRatioPenalty: number
): { rect: Rect; score: number } | null {
  // Find all maximal rectangles using histogram approach
  const maximalRects = findMaximalRectangles(matrix);

  if (maximalRects.length === 0) return null;

  // Score and filter rectangles
  const scoredRects = scoreAndFilterRectangles(
    maximalRects,
    matrix,
    minDimension,
    aspectRatioPenalty
  );

  // Return the highest scoring rectangle with its score
  return scoredRects.length > 0 ? scoredRects[0] : null;
}

/**
 * Find the next best shape (rectangle) to add to the coverage.
 *
 * @param matrix The coverage matrix
 * @param minDimension Minimum dimension for shapes
 * @param aspectRatioPenalty Penalty for skinny shapes
 * @returns The best shape found, or null if none exist
 */
function findNextBestShape(
  matrix: CoverageMatrix,
  minDimension: number,
  aspectRatioPenalty: number
): Shape | null {
  const bestRect = findNextBestRectangle(
    matrix,
    minDimension,
    aspectRatioPenalty
  );

  return bestRect ? bestRect.rect : null;
}

/**
 * Determines a list of rectangles that best cover the non-transparent pixels in an ImageData.
 *
 * Uses a greedy algorithm that iteratively finds and adds rectangles until the target coverage
 * is achieved. The algorithm biases against skinny shapes and allows overlapping shapes.
 *
 * Algorithm overview:
 * 1. Create a coverage matrix tracking which pixels are covered
 * 2. While target coverage not reached:
 *    a. Build histograms row by row to find maximal rectangles
 *    b. Score rectangles based on uncovered pixels and aspect ratio
 *    c. Select the highest-scoring rectangle
 *    d. Mark those pixels as covered
 * 3. Return the list of rectangles
 *
 * The histogram approach finds maximal rectangles efficiently by:
 * - Building a histogram for each row where heights represent consecutive uncovered pixels
 * - Using a stack-based algorithm to find the largest rectangle in each histogram
 * - This avoids exhaustive search of all possible rectangles
 *
 * Time complexity: O(n * w * h) where n is the number of shapes generated
 * Space complexity: O(w * h) for the coverage matrix
 *
 * @param image The ImageData to analyze
 * @param options Configuration options for the algorithm
 * @returns Array of rectangles covering the non-transparent pixels
 */
export function determineCoverage(
  image: ImageData,
  options: CoverageOptions = {}
): Shape[] {
  const {
    targetCoverage = 0.95,
    aspectRatioPenalty = 0.5,
    minDimension = 2,
  } = options;

  // Handle edge cases
  if (image.width === 0 || image.height === 0) return [];
  const coverage = Math.min(Math.max(targetCoverage, 0), 1);

  const matrix = new CoverageMatrix(image);
  const shapes: Shape[] = [];

  // If there are no non-transparent pixels, return empty array
  if (matrix.getCoverageRatio() >= 1.0) return [];

  // Greedy algorithm: repeatedly find and add the best shape
  let iterations = 0;
  const maxIterations = 1000; // Prevent infinite loops

  while (matrix.getCoverageRatio() < coverage && iterations < maxIterations) {
    const shape = findNextBestShape(matrix, minDimension, aspectRatioPenalty);

    if (!shape) break; // No more shapes can be found

    matrix.markCovered(shape);
    shapes.push(shape);
    iterations++;
  }

  return shapes;
}

/**
 * Decodes a Uint8Array back into a 2D boolean array.
 */
export function decodeMask(buffer: Uint8Array): boolean[][] {
  if (!buffer || buffer.length < 8) return [];

  // Use DataView to read width and height as 32-bit integers
  const view = new DataView(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength
  );
  const width = view.getUint32(0, true); // little-endian
  const height = view.getUint32(4, true); // little-endian

  // Unpack bits into 2D array
  const mask: boolean[][] = Array(height)
    .fill(null)
    .map(() => Array(width).fill(false));

  let bitIndex = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const byteIndex = 8 + Math.floor(bitIndex / 8);
      const bitOffset = bitIndex % 8;
      mask[y][x] = (buffer[byteIndex] & (1 << bitOffset)) !== 0;
      bitIndex++;
    }
  }

  return mask;
}

/**
 * Encodes a 2D boolean array into a compact binary Uint8Array.
 * Format: width (4 bytes) + height (4 bytes) + bitmask data
 * Each byte in the bitmask represents 8 pixels (bits).
 */
export function encodeMask(mask: boolean[][]): Uint8Array {
  if (mask.length === 0) return new Uint8Array(0);

  const height = mask.length;
  const width = mask[0].length;
  const totalBits = width * height;
  const numBytes = Math.ceil(totalBits / 8);

  // Create a buffer: 4 bytes for width + 4 bytes for height + bitmask bytes
  const buffer = new Uint8Array(8 + numBytes);

  // Use DataView to write width and height as 32-bit integers
  const view = new DataView(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength
  );
  view.setUint32(0, width, true); // little-endian
  view.setUint32(4, height, true); // little-endian

  // Pack bits into bytes
  let bitIndex = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y][x]) {
        const byteIndex = 8 + Math.floor(bitIndex / 8);
        const bitOffset = bitIndex % 8;
        buffer[byteIndex] |= 1 << bitOffset;
      }
      bitIndex++;
    }
  }

  return buffer;
}
