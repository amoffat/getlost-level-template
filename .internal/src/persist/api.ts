import { Tileset } from "@/types/tileset";
import { decode, encode } from "cbor2";
import { TilesetDocV1 } from "./schema";

interface LoadTilesetsResponse {
  ids: string[];
}

export async function loadTilesets(): Promise<string[]> {
  const res = await fetch("/api/tilesets", {
    method: "GET",
    headers: { "content-type": "application/json" },
  });
  if (!res.ok) throw new Error(`openProject failed: ${res.status}`);
  return ((await res.json()) as LoadTilesetsResponse).ids;
}

export async function loadTileset(id: string): Promise<Tileset> {
  const res = await fetch(`/api/tilesets/${encodeURIComponent(id)}`, {
    method: "GET",
  });
  if (!res.ok) throw new Error(`loadTileset failed: ${res.status}`);

  const decoded = decode(await res.bytes()) as TilesetDocV1;
  const ts = decoded.tileset;
  // Recreate an object URL for the tileset image from persisted bytes
  // Copy to a standalone ArrayBuffer to satisfy TS's BlobPart typing
  const ab = new ArrayBuffer(decoded.imageData.byteLength);
  new Uint8Array(ab).set(decoded.imageData);
  ts.objectUrl = URL.createObjectURL(new Blob([ab]));
  return ts;
}

export async function saveTileset(ts: Tileset) {
  const imageData = await (await fetch(ts.objectUrl)).bytes();
  const doc: TilesetDocV1 = {
    tileset: ts,
    imageData,
    version: 1,
  };
  const payload = encode(doc);
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
