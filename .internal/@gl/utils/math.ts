// Better modulo function that works with negative numbers
export function mod(a: number, b: number): number {
  return ((a % b) + b) % b;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
