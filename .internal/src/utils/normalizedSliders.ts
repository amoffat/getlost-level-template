/**
 * Utility for managing multiple sliders that contribute to a total 1.0 probability.
 * Each slider is normalized so that when all sliders are equal, each displays 0.5.
 *
 * This provides a more intuitive UI where:
 * - 0.5 on a slider means "equal probability to all others"
 * - > 0.5 means "more probable than average"
 * - < 0.5 means "less probable than average"
 *
 * The underlying weights always sum to 1.0 and are automatically rebalanced
 * when any slider changes.
 */

// Types
export type Weights = number[]; // length === number of items; values sum to 1

// Helpers
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * Normalize an array of weights so they sum to 1.0.
 * If sum is 0 or negative, returns equal weights for all items.
 */
export function normalizeWeights(weights: Weights): Weights {
  const n = weights.length;
  if (n === 0) return [];
  const sum = weights.reduce((a, b) => a + (b ?? 0), 0);
  if (sum <= 0) {
    const even = 1 / n;
    return Array(n).fill(even);
  }
  return weights.map((w) => (w ?? 0) / sum);
}

/**
 * Rebalance weights after changing one item's weight.
 * The target weight is clamped to [0, 1], and all other weights are
 * scaled proportionally to make the total sum to 1.0.
 *
 * @param current - Current weight array
 * @param idx - Index of the weight being changed
 * @param target - Target weight value (will be clamped to [0, 1])
 * @returns New weight array with sum === 1.0
 */
export function rebalanceAfterChange(
  current: Weights,
  idx: number,
  target: number
): Weights {
  const n = current.length;
  if (n <= 1) return n === 1 ? [1] : [];
  const t = clamp01(target);
  const result: Weights = current.slice();
  result[idx] = t;
  let sumOthers = 0;
  for (let i = 0; i < n; i++) if (i !== idx) sumOthers += result[i] ?? 0;
  const remaining = 1 - t;
  if (remaining <= 0) {
    for (let i = 0; i < n; i++) if (i !== idx) result[i] = 0;
    return result;
  }
  if (sumOthers <= 0) {
    const per = remaining / (n - 1);
    for (let i = 0; i < n; i++) if (i !== idx) result[i] = per;
    return result;
  }
  const scale = remaining / sumOthers;
  for (let i = 0; i < n; i++)
    if (i !== idx) result[i] = (result[i] ?? 0) * scale;
  return result;
}

/**
 * Calculate gamma for power curve transformation.
 * This ensures that 0.5^gamma = 1/n, so equal weights display as 0.5.
 */
export function gammaForCount(n: number): number {
  if (n <= 1) return 1;
  return Math.log(n) / Math.log(2);
}

/**
 * Map a weight value (0..1) to a UI value (0..1) using power curve.
 * When all weights are equal (1/n), this maps to 0.5 on the slider.
 *
 * @param weight - The actual weight value (0..1)
 * @param count - Total number of items
 * @returns UI value for the slider (0..1)
 */
export function mapWeightToUi(weight: number, count: number): number {
  const g = gammaForCount(count);
  return count <= 1 ? 0.5 : Math.pow(clamp01(weight), 1 / g);
}

/**
 * Map a UI slider value (0..1) back to a weight value (0..1).
 * This is the inverse of mapWeightToUi.
 *
 * @param uiValue - The slider value (0..1)
 * @param count - Total number of items
 * @returns Weight value (0..1)
 */
export function mapUiToWeight(uiValue: number, count: number): number {
  const g = gammaForCount(count);
  return count <= 1 ? uiValue : Math.pow(clamp01(uiValue), g);
}

/**
 * Create a scale function for Mantine Slider component.
 * This function converts UI values to actual weight values.
 *
 * @param count - Total number of items
 * @returns Scale function suitable for Mantine Slider's `scale` prop
 */
export function createSliderScaleFn(count: number): (v: number) => number {
  return (v: number) => mapUiToWeight(v, count);
}

/**
 * Initialize weights array from an existing array, preserving values
 * and filling new slots with fair share, then normalizing.
 *
 * @param prev - Previous weights array
 * @param nextLength - Desired length of new array
 * @returns Normalized weights array of length nextLength
 */
export function resizeWeights(prev: Weights, nextLength: number): Weights {
  if (nextLength === prev.length) return prev;
  if (nextLength === 0) return [];
  const next: Weights = Array(nextLength).fill(0);
  const m = Math.min(prev.length, nextLength);
  for (let i = 0; i < m; i++) next[i] = prev[i];
  if (nextLength > prev.length) {
    const tentative = 1 / Math.max(1, nextLength);
    for (let i = prev.length; i < nextLength; i++) next[i] = tentative;
  }
  return normalizeWeights(next);
}

/**
 * Remove a weight at a specific index and normalize the remaining weights.
 *
 * @param weights - Current weights array
 * @param idx - Index to remove
 * @returns New normalized weights array with the item removed
 */
export function removeWeight(weights: Weights, idx: number): Weights {
  const next: Weights = weights.slice();
  next.splice(idx, 1);
  return normalizeWeights(next);
}

/**
 * Reorder weights by moving an item from one index to another.
 *
 * @param weights - Current weights array
 * @param from - Source index
 * @param to - Destination index
 * @returns New weights array with item moved
 */
export function reorderWeights(
  weights: Weights,
  from: number,
  to: number
): Weights {
  const next = weights.slice();
  if (from < 0 || to < 0 || from >= next.length || to >= next.length) {
    return weights;
  }
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
