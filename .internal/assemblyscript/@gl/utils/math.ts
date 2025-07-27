// Better modulo function that works with negative numbers
export function mod(a: i32, b: i32): i32 {
  return ((a % b) + b) % b;
}
