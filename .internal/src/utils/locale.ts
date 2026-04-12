import { x86 } from "murmurhash3js";

/** Returns an 8-char hex murmur hash of the given text. */
export function hashText(text: string): string {
  return (x86.hash32(text) >>> 0).toString(16).padStart(8, "0");
}

/**
 * Returns a locale key for node content or choice text, prefixed by the
 * owning ID (node ID or choice ID) so that identical text on different nodes
 * can carry independent translations.
 */
export function makeLocaleKey({
  text,
  prefix,
}: {
  text: string;
  prefix?: string;
}): string {
  if (!prefix) return hashText(text);
  return `${prefix}:${hashText(text)}`;
}
