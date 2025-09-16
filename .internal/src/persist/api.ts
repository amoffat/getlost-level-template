import { Tileset } from "@/types/tileset";
import { encode } from "cbor2";

interface LoadTilesetsResponse {
  ids: string[];
}

export async function loadTilesets(): Promise<string[]> {
  const res = await fetch("/api/tilesets", {
    method: "GET",
    headers: { "content-type": "application/json", accept: "application/json" },
  });
  if (!res.ok) throw new Error(`openProject failed: ${res.status}`);
  return ((await res.json()) as LoadTilesetsResponse).ids;
}

export async function loadTileset(id: string): Promise<Tileset> {
  const res = await fetch(`/api/tilesets/${encodeURIComponent(id)}`, {
    method: "GET",
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`loadTileset failed: ${res.status}`);
  return res.json();
}

export async function saveTileset(ts: Tileset) {
  const imageData = new Uint8Array(
    await (await fetch(ts.objectUrl)).arrayBuffer()
  );
  const payload = encode({
    imageData,
  });
  // Send as multipart/form-data so the server's formidable parser can handle it
  const form = new FormData();
  // Wrap the CBOR payload in a Blob and name the file deterministically; server
  // ignores name Copy to a standalone ArrayBuffer to satisfy TS's BlobPart
  // typing
  const ab = new ArrayBuffer(payload.byteLength);
  new Uint8Array(ab).set(payload);
  const file = new Blob([ab], { type: "application/cbor" });
  // Use explicit field name that the server expects
  form.append("tileset", file, `${ts.id}.cbor`);

  const res = await fetch(`/api/tilesets/${encodeURIComponent(ts.id)}`, {
    method: "PUT",
    body: form,
  });
  if (!res.ok) throw new Error(`saveMeta failed: ${res.status}`);
}
