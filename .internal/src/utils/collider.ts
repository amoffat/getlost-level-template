import { Rect } from "@/types/rect";

/**
 * Configuration options for the coverage algorithm.
 */
interface CoverageOptions {
  /** Target coverage ratio (0-1). Algorithm stops when this coverage is achieved. Default: 0.9 */
  targetCoverage?: number;
  /** Penalty multiplier for skinny rectangles. Higher values bias against skinny rectangles. Default: 0.5 */
  aspectRatioPenalty?: number;
  /** Minimum rectangle dimension to consider. Default: 2 */
  minDimension?: number;
}

/**
 * Represents a 2D matrix of boolean values indicating pixel coverage.
 */
class CoverageMatrix {
  private data: Uint8Array;
  private width: number;
  private height: number;
  private totalNonTransparent: number;
  private currentCovered: number;

  constructor(imageData: ImageData) {
    this.width = imageData.width;
    this.height = imageData.height;
    this.data = new Uint8Array(this.width * this.height);
    this.totalNonTransparent = 0;
    this.currentCovered = 0;

    // Initialize coverage matrix from image alpha channel
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const alphaIndex = (y * this.width + x) * 4 + 3;
        const isNonTransparent = imageData.data[alphaIndex] > 0;
        if (isNonTransparent) {
          this.totalNonTransparent++;
          this.set(x, y, 1); // 1 = uncovered non-transparent pixel
        }
      }
    }
  }

  /** Get the value at position (x, y). 0 = transparent/covered, 1 = uncovered non-transparent */
  get(x: number, y: number): number {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
    return this.data[y * this.width + x];
  }

  /** Set the value at position (x, y) */
  private set(x: number, y: number, value: number): void {
    this.data[y * this.width + x] = value;
  }

  /** Mark a rectangle as covered and return the number of newly covered pixels */
  markCovered(rect: Rect): number {
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

  /** Get the current coverage ratio (0-1) */
  getCoverageRatio(): number {
    if (this.totalNonTransparent === 0) return 1.0;
    return this.currentCovered / this.totalNonTransparent;
  }

  /** Count uncovered non-transparent pixels in a rectangle */
  countUncovered(rect: Rect): number {
    let count = 0;
    for (let y = rect.y; y < rect.y + rect.height; y++) {
      for (let x = rect.x; x < rect.x + rect.width; x++) {
        if (this.get(x, y) === 1) count++;
      }
    }
    return count;
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
 * @returns The best rectangle found, or null if none exist
 */
function findNextBestRectangle(
  matrix: CoverageMatrix,
  minDimension: number,
  aspectRatioPenalty: number
): Rect | null {
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

  // Return the highest scoring rectangle
  return scoredRects.length > 0 ? scoredRects[0].rect : null;
}

/**
 * Determines a list of rectangles that best cover the non-transparent pixels in an ImageData.
 *
 * Uses a greedy algorithm that iteratively finds and adds rectangles until the target coverage
 * is achieved. The algorithm biases against skinny rectangles and allows overlapping rectangles.
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
 * Time complexity: O(n * w * h) where n is the number of rectangles generated
 * Space complexity: O(w * h) for the coverage matrix
 *
 * @param image The ImageData to analyze
 * @param options Configuration options for the algorithm
 * @returns Array of rectangles covering the non-transparent pixels
 */
export function determineCoverage(
  image: ImageData,
  options: CoverageOptions = {}
): Rect[] {
  const {
    targetCoverage = 0.98,
    aspectRatioPenalty = 0.5,
    minDimension = 2,
  } = options;

  // Handle edge cases
  if (image.width === 0 || image.height === 0) return [];
  const coverage = Math.min(Math.max(targetCoverage, 0), 1);

  const matrix = new CoverageMatrix(image);
  const rectangles: Rect[] = [];

  // If there are no non-transparent pixels, return empty array
  if (matrix.getCoverageRatio() >= 1.0) return [];

  // Greedy algorithm: repeatedly find and add the best rectangle
  let iterations = 0;
  const maxIterations = 1000; // Prevent infinite loops

  while (matrix.getCoverageRatio() < coverage && iterations < maxIterations) {
    const rect = findNextBestRectangle(
      matrix,
      minDimension,
      aspectRatioPenalty
    );

    if (!rect) break; // No more rectangles can be found

    matrix.markCovered(rect);
    rectangles.push(rect);
    iterations++;
  }

  return rectangles;
}
