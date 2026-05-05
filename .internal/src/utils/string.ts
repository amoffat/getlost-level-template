export function capitalize(s: string): string {
  return s.at(0)?.toLocaleUpperCase() + s.slice(1);
}
