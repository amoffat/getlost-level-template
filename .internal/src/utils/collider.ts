import { Ellipse } from "@/types/ellipse";
import { isRect, Rect } from "@/types/rect";

export type Shape = Rect | Ellipse;

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
  /** Maximum allowed overage ratio (0-1) for ellipses. Ellipses with overage above this threshold will not be chosen. Default: 0.05 */
  maxEllipseOverage?: number;
  /** Whether to allow ellipse shapes in the output. If false, only rectangles will be returned. Default: false */
  allowEllipses?: boolean;
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

  /** Mark an ellipse as covered and return the number of newly covered pixels */
  markEllipseCovered(ellipse: Ellipse): number {
    let newlyCovered = 0;
    const { x: cx, y: cy, radiusX, radiusY } = ellipse;

    // Iterate over the bounding box of the ellipse
    const minX = Math.floor(cx - radiusX);
    const maxX = Math.ceil(cx + radiusX);
    const minY = Math.floor(cy - radiusY);
    const maxY = Math.ceil(cy + radiusY);

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        // Check if point is inside ellipse using the standard ellipse equation
        const dx = x - cx;
        const dy = y - cy;
        if (
          (dx * dx) / (radiusX * radiusX) + (dy * dy) / (radiusY * radiusY) <=
          1
        ) {
          if (this.get(x, y) === 1) {
            this.set(x, y, 0);
            newlyCovered++;
          }
        }
      }
    }
    this.currentCovered += newlyCovered;
    return newlyCovered;
  }

  /** Mark a shape as covered and return the number of newly covered pixels */
  markCovered(shape: Shape): number {
    if (isRect(shape)) {
      return this.markRectCovered(shape);
    } else {
      return this.markEllipseCovered(shape);
    }
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

  /** Count uncovered non-transparent pixels in an ellipse */
  countUncoveredEllipse(ellipse: Ellipse): number {
    let count = 0;
    const { x: cx, y: cy, radiusX, radiusY } = ellipse;

    // Iterate over the bounding box of the ellipse
    const minX = Math.floor(cx - radiusX);
    const maxX = Math.ceil(cx + radiusX);
    const minY = Math.floor(cy - radiusY);
    const maxY = Math.ceil(cy + radiusY);

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        // Check if point is inside ellipse
        const dx = x - cx;
        const dy = y - cy;
        if (
          (dx * dx) / (radiusX * radiusX) + (dy * dy) / (radiusY * radiusY) <=
          1
        ) {
          if (this.get(x, y) === 1) count++;
        }
      }
    }
    return count;
  }

  /** Count uncovered non-transparent pixels in a shape */
  countUncovered(shape: Shape): number {
    if (isRect(shape)) {
      return this.countUncoveredRect(shape);
    } else {
      return this.countUncoveredEllipse(shape);
    }
  }

  /**
   * Count transparent pixels (overage) that would be covered by an ellipse.
   * Returns both in-bounds transparent pixels and out-of-bounds pixels separately.
   *
   * @returns Object with inBounds (transparent pixels within image) and outOfBounds (pixels outside image)
   */
  countOverageEllipse(ellipse: Ellipse): {
    inBounds: number;
    outOfBounds: number;
  } {
    let inBounds = 0;
    let outOfBounds = 0;
    const { x: cx, y: cy, radiusX, radiusY } = ellipse;

    // Iterate over the bounding box of the ellipse
    const minX = Math.floor(cx - radiusX);
    const maxX = Math.ceil(cx + radiusX);
    const minY = Math.floor(cy - radiusY);
    const maxY = Math.ceil(cy + radiusY);

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        // Check if point is inside ellipse
        const dx = x - cx;
        const dy = y - cy;
        if (
          (dx * dx) / (radiusX * radiusX) + (dy * dy) / (radiusY * radiusY) <=
          1
        ) {
          // Check if out of bounds
          if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            outOfBounds++;
          } else if (this.transparent[y * this.width + x] === 1) {
            // In-bounds transparent pixel
            inBounds++;
          }
        }
      }
    }
    return { inBounds, outOfBounds };
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
 * Calculate a score for an ellipse based on coverage, aspect ratio, and orientation.
 * Higher scores are better. Biases towards horizontal ellipses.
 *
 * @param ellipse The ellipse to score
 * @param uncoveredPixels Number of uncovered pixels in this ellipse
 * @param aspectRatioPenalty Penalty factor for aspect ratio (0-1)
 * @returns Score value (higher is better)
 */
function scoreEllipse(
  ellipse: Ellipse,
  uncoveredPixels: number,
  aspectRatioPenalty: number
): number {
  if (uncoveredPixels === 0) return 0;

  // Base score is the number of uncovered pixels
  let score = uncoveredPixels;

  // Apply aspect ratio penalty to discourage skinny ellipses
  const aspectRatio = Math.max(
    ellipse.radiusX / ellipse.radiusY,
    ellipse.radiusY / ellipse.radiusX
  );
  const aspectPenalty = 1.0 - aspectRatioPenalty * Math.log(aspectRatio);
  score *= Math.max(0.1, aspectPenalty); // Don't let it go below 0.1

  // Orientation bias boundaries (easier to tweak)
  const CIRCULAR_MIN = 0.8; // Below this is vertical
  const CIRCULAR_MAX = 1.0; // Above this starts horizontal bonus
  const HORIZONTAL_SWEET_SPOT_MAX = 3.0; // Above this is too skinny
  const CIRCULAR_PENALTY = 0.7;
  const HORIZONTAL_BONUS_MAX = 0.5;
  const TOO_SKINNY_HORIZONTAL_MULTIPLIER = 0.5;
  const VERTICAL_PENALTY_MULTIPLIER = 0.8;
  const VERTICAL_PENALTY_MIN = 1.2;

  // Apply orientation bias: favor moderately horizontal ellipses, penalize vertical, circular, and too-skinny horizontal
  const horizontalness = ellipse.radiusX / ellipse.radiusY;

  if (horizontalness > HORIZONTAL_SWEET_SPOT_MAX) {
    // Too skinny horizontally - apply strong penalty
    const penalty = 1.0 / (horizontalness * TOO_SKINNY_HORIZONTAL_MULTIPLIER);
    score *= penalty;
  } else if (
    horizontalness > CIRCULAR_MAX &&
    horizontalness <= HORIZONTAL_SWEET_SPOT_MAX
  ) {
    // Moderately horizontal ellipse (radiusX > radiusY) - apply bonus
    // Sweet spot is around 1.5-2.5x, with diminishing returns beyond that
    const range = HORIZONTAL_SWEET_SPOT_MAX - CIRCULAR_MAX;
    const normalizedRatio = (horizontalness - CIRCULAR_MAX) / range; // Map to 0-1
    const bonus =
      1.0 + HORIZONTAL_BONUS_MAX * Math.sin(normalizedRatio * Math.PI); // Peak bonus at middle of range
    score *= bonus;
  } else if (horizontalness < CIRCULAR_MIN) {
    // Vertical ellipse (radiusY > radiusX) - apply penalty
    // More vertical = higher penalty
    const verticalness = ellipse.radiusY / ellipse.radiusX;
    const penalty =
      1.0 /
      Math.max(
        VERTICAL_PENALTY_MIN,
        verticalness * VERTICAL_PENALTY_MULTIPLIER
      );
    score *= penalty;
  } else {
    // Nearly circular (CIRCULAR_MIN <= horizontalness <= CIRCULAR_MAX) - apply moderate penalty
    score *= CIRCULAR_PENALTY;
  }

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
 * Create an ellipse that circumscribes a rectangle.
 * The ellipse will be centered on the rectangle and sized so that all four
 * corners of the rectangle lie on the ellipse boundary.
 *
 * For a rectangle with half-dimensions a (width/2) and b (height/2),
 * the circumscribed ellipse has radii: radiusX = a * sqrt(2), radiusY = b * sqrt(2)
 * This ensures the corners at (±a, ±b) satisfy the ellipse equation.
 *
 * @param rect The rectangle to circumscribe
 * @returns An ellipse that circumscribes the rectangle
 */
function ellipseFromRect(rect: Rect): Ellipse {
  const halfWidth = rect.width / 2;
  const halfHeight = rect.height / 2;
  // Scale by sqrt(2) so the ellipse passes through the rectangle's corners
  const sqrt2 = Math.SQRT2;
  return {
    x: rect.x + halfWidth,
    y: rect.y + halfHeight,
    radiusX: halfWidth * sqrt2,
    radiusY: halfHeight * sqrt2,
  };
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
 * Find the best ellipse candidate based on the best rectangle.
 * Creates a circumscribed ellipse from the rectangle and scores it.
 *
 * @param matrix The coverage matrix
 * @param minDimension Minimum dimension for shapes
 * @param aspectRatioPenalty Penalty for skinny shapes
 * @returns The best ellipse found with its score, or null if none exist
 */
function findNextBestEllipse(
  matrix: CoverageMatrix,
  minDimension: number,
  aspectRatioPenalty: number
): { ellipse: Ellipse; score: number } | null {
  // Find all maximal rectangles using histogram approach
  const maximalRects = findMaximalRectangles(matrix);

  if (maximalRects.length === 0) return null;

  // Score ellipses circumscribed around each rectangle
  const scoredEllipses: Array<{ ellipse: Ellipse; score: number }> = [];

  for (const rect of maximalRects) {
    // Filter by minimum dimension (using diameter = 2 * radius)
    if (rect.width < minDimension || rect.height < minDimension) continue;

    const ellipse = ellipseFromRect(rect);

    // Count uncovered pixels in the ellipse
    const uncovered = matrix.countUncoveredEllipse(ellipse);
    if (uncovered === 0) continue;

    // Calculate score
    const score = scoreEllipse(ellipse, uncovered, aspectRatioPenalty);
    scoredEllipses.push({ ellipse, score });
  }

  // Sort by score descending
  scoredEllipses.sort((a, b) => b.score - a.score);

  return scoredEllipses.length > 0 ? scoredEllipses[0] : null;
}

/**
 * Calculate the "fit quality" of a shape - how well it matches the uncovered region.
 * This is the ratio of uncovered pixels to total shape area.
 * Higher values mean the shape fits better (less wasted area).
 *
 * @param uncoveredPixels Number of uncovered pixels the shape covers
 * @param shapeArea Total area of the shape
 * @returns Fit quality ratio (0-1)
 */
function calculateFitQuality(
  uncoveredPixels: number,
  shapeArea: number
): number {
  if (shapeArea === 0) return 0;
  return uncoveredPixels / shapeArea;
}

/**
 * Find the next best shape (rectangle or ellipse) to add to the coverage.
 * Compares the best rectangle and ellipse candidates and returns whichever fits better.
 *
 * The comparison uses a combined metric that considers:
 * 1. The shape's score (coverage + aspect ratio penalty)
 * 2. The fit quality (how well the shape matches the uncovered region)
 * 3. Overage constraint: ellipses are rejected if they cover too many transparent pixels
 *    Out-of-bounds overages are weighted 5x heavier than in-bounds transparent overages
 *
 * @param matrix The coverage matrix
 * @param minDimension Minimum dimension for shapes
 * @param aspectRatioPenalty Penalty for skinny shapes
 * @param maxEllipseOverage Maximum allowed overage ratio for ellipses (0-1)
 * @param allowEllipses Whether to consider ellipse shapes
 * @returns The best shape found, or null if none exist
 */
function findNextBestShape(
  matrix: CoverageMatrix,
  minDimension: number,
  aspectRatioPenalty: number,
  maxEllipseOverage: number,
  allowEllipses: boolean
): Shape | null {
  const bestRect = findNextBestRectangle(
    matrix,
    minDimension,
    aspectRatioPenalty
  );
  const bestEllipse = allowEllipses
    ? findNextBestEllipse(matrix, minDimension, aspectRatioPenalty)
    : null;

  // If neither found, return null
  if (!bestRect && !bestEllipse) return null;

  // If only rectangle found, return it
  if (!bestEllipse) return bestRect!.rect;

  // If only ellipse found, check its overage before returning
  if (!bestRect) {
    const ellipseUncovered = matrix.countUncoveredEllipse(bestEllipse.ellipse);
    const overageData = matrix.countOverageEllipse(bestEllipse.ellipse);
    // Weight out-of-bounds overages 5x heavier than in-bounds transparent pixels
    const weightedOverage = overageData.inBounds + overageData.outOfBounds * 5;
    const totalEllipsePixels = ellipseUncovered + weightedOverage;
    const overageRatio =
      totalEllipsePixels > 0 ? weightedOverage / totalEllipsePixels : 0;
    // If ellipse has too much overage, return null (can't use it)
    if (overageRatio > maxEllipseOverage) return null;
    return bestEllipse.ellipse;
  }

  // Both found - check ellipse overage first
  const ellipseUncovered = matrix.countUncoveredEllipse(bestEllipse.ellipse);
  const overageData = matrix.countOverageEllipse(bestEllipse.ellipse);
  // Weight out-of-bounds overages 5x heavier than in-bounds transparent pixels
  const weightedOverage = overageData.inBounds + overageData.outOfBounds * 5;
  const totalEllipsePixels = ellipseUncovered + weightedOverage;
  const overageRatio =
    totalEllipsePixels > 0 ? weightedOverage / totalEllipsePixels : 0;

  // If ellipse has too much overage, just use the rectangle
  if (overageRatio > maxEllipseOverage) {
    return bestRect.rect;
  }

  // Both found and ellipse passes overage check - compare them
  // Calculate fit quality for each shape
  const rectArea = bestRect.rect.width * bestRect.rect.height;
  const rectUncovered = matrix.countUncoveredRect(bestRect.rect);
  const rectFitQuality = calculateFitQuality(rectUncovered, rectArea);

  const ellipseArea =
    Math.PI * bestEllipse.ellipse.radiusX * bestEllipse.ellipse.radiusY;
  const ellipseFitQuality = calculateFitQuality(ellipseUncovered, ellipseArea);

  // Use a combined metric: score weighted by fit quality
  // This prefers shapes that both cover many pixels AND fit well
  const rectCombinedScore = bestRect.score * (0.5 + 0.5 * rectFitQuality);
  const ellipseCombinedScore =
    bestEllipse.score * (0.5 + 0.5 * ellipseFitQuality);

  // Return the shape with the higher combined score
  return ellipseCombinedScore > rectCombinedScore
    ? bestEllipse.ellipse
    : bestRect.rect;
}

/**
 * Determines a list of shapes (rectangles and ellipses) that best cover the non-transparent pixels in an ImageData.
 *
 * Uses a greedy algorithm that iteratively finds and adds shapes until the target coverage
 * is achieved. The algorithm biases against skinny shapes and allows overlapping shapes.
 * For each iteration, both a rectangle and an ellipse candidate are considered, and the
 * one that fits better (based on coverage, aspect ratio, and fit quality) is chosen.
 *
 * Algorithm overview:
 * 1. Create a coverage matrix tracking which pixels are covered
 * 2. While target coverage not reached:
 *    a. Build histograms row by row to find maximal rectangles
 *    b. For each maximal rectangle, also consider an inscribed ellipse
 *    c. Score both shapes based on uncovered pixels, aspect ratio, and fit quality
 *    d. Select the highest-scoring shape (rect or ellipse)
 *    e. Mark those pixels as covered
 * 3. Return the list of shapes
 *
 * The histogram approach finds maximal rectangles efficiently by:
 * - Building a histogram for each row where heights represent consecutive uncovered pixels
 * - Using a stack-based algorithm to find the largest rectangle in each histogram
 * - This avoids exhaustive search of all possible rectangles
 *
 * Ellipse selection is based on:
 * - Creating inscribed ellipses from maximal rectangles
 * - Comparing fit quality (ratio of covered pixels to shape area)
 * - Ellipses are preferred when they fit the uncovered region better than rectangles
 *
 * Time complexity: O(n * w * h) where n is the number of shapes generated
 * Space complexity: O(w * h) for the coverage matrix
 *
 * @param image The ImageData to analyze
 * @param options Configuration options for the algorithm
 * @returns Array of shapes (rectangles and ellipses) covering the non-transparent pixels
 */
export function determineCoverage(
  image: ImageData,
  options: CoverageOptions = {}
): Shape[] {
  const {
    targetCoverage = 0.95,
    aspectRatioPenalty = 0.5,
    minDimension = 2,
    maxEllipseOverage = 0.12,
    allowEllipses = false,
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
    const shape = findNextBestShape(
      matrix,
      minDimension,
      aspectRatioPenalty,
      maxEllipseOverage,
      allowEllipses
    );

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
