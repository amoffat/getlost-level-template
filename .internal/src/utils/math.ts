export function closeEnough(a: number, b: number, epsilon = 0.00001): boolean {
  return Math.abs(a - b) < epsilon;
}
