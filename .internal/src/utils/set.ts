export function setsEqual<T>(a: Set<T>, b: Set<T>) {
  return a.size === b.size && [...a].every((v) => b.has(v));
}
