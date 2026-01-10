export function closeEnough(a: number, b: number, epsilon = 0.00001): boolean {
  return Math.abs(a - b) < epsilon;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

type RemapFunction = (value: number) => number;

/**
 * Remaps a value in [0, 1] to a logarithmic scale and back.
 *
 * @param k How steep to make the curve
 * @returns The remapped value
 */
export function makeLogRemap(k: number = 9): [RemapFunction, RemapFunction] {
  const map = (value: number) => Math.log(value * k + 1) / Math.log(k + 1);
  const invMap = (smoothValue: number) =>
    (Math.pow(k + 1, smoothValue) - 1) / k;
  return [map, invMap];
}
