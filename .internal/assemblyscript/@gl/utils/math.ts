// Better modulo function that works with negative numbers
export function mod(a: number, b: number): number {
  return ((a % b) + b) % b;
}
