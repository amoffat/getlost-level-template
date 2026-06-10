export function shallowEquals<T>(
  a: T[] | undefined,
  b: T[] | undefined,
): boolean {
  if (a === undefined) return b === undefined;
  if (b === undefined) return a === undefined;

  if (a === b) {
    return true;
  }
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}
