import { v5 } from "uuid";
import { Rect } from "../types/rect";

const GL_NS = "21296fbd-0328-4b58-9424-bc73b5f0e2f7";

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function genGroupId({
  coords,
  tsId,
}: {
  coords: Rect;
  tsId: string;
}): Promise<string> {
  return v5(
    `${tsId}:${coords.ul.x},${coords.ul.y},${coords.br.x},${coords.br.y}`,
    GL_NS
  );
}

export async function genTilesetId(source: File): Promise<string> {
  const data = await source.arrayBuffer();
  const hash = await window.crypto.subtle.digest("SHA-1", data);
  return v5(new Uint8Array(hash), GL_NS);
}
