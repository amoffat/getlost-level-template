import { v5 as uuidv5 } from "uuid";
import { uuidNs } from "@/constants";

export async function sha1Hash(data: string | ArrayBuffer): Promise<string> {
  const buffer =
    typeof data === "string"
      ? new TextEncoder().encode(data)
      : data instanceof ArrayBuffer
        ? data
        : new Uint8Array(data);
  const hashBuffer = await window.crypto.subtle.digest("SHA-1", buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Derive a stable UUIDv5 (in the project's `uuidNs` namespace) from raw content.
 * Used for content-derived asset ids (tilesets, tiles/images, backgrounds,
 * speaker images, audio) so identical content always resolves to the same id.
 */
export function uuid5Hash(data: string | ArrayBuffer): string {
  const bytes =
    typeof data === "string"
      ? new TextEncoder().encode(data)
      : data instanceof ArrayBuffer
        ? new Uint8Array(data)
        : new Uint8Array(data);
  return uuidv5(bytes, uuidNs);
}
