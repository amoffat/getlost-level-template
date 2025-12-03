export function closeEnough(a: number, b: number, epsilon = 0.00001): boolean {
  return Math.abs(a - b) < epsilon;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
