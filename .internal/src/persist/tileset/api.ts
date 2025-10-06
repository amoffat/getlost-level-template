import { log } from "@/log";
import { Tileset } from "@/types/tileset";
import { decode, encode } from "cbor2";
import { getMigrations } from "./migrations";
import { BaseTilesetDoc, LatestTilesetDoc, latestVersion } from "./schema";

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

  // Apply all applicable migrations to bring the doc up to the latest version
  const migrations = await getMigrations();
  const latestVersion = migrations.reduce((max, m) => Math.max(max, m.to), 0);

  const baseDecoded = decode<BaseTilesetDoc>(await res.bytes());
  const startVersion = baseDecoded.version;
  let migrated = false;

  for (const migration of migrations) {
    if (migration.from >= startVersion && migration.to <= latestVersion) {
      log.info(`Applying migration: ${migration.from} -> ${migration.to}`);
      await migration.migrate(baseDecoded);
      baseDecoded.version = migration.to;
      migrated = true;
    }
  }

  const decoded = baseDecoded as LatestTilesetDoc;
  const ts = decoded.tileset;

  // Recreate an object URL for the tileset image from persisted bytes
  // Copy to a standalone ArrayBuffer to satisfy TS's BlobPart typing
  const ab = new ArrayBuffer(decoded.imageData.byteLength);
  new Uint8Array(ab).set(decoded.imageData);
  const blob = new Blob([ab]);
  ts.objectUrl = URL.createObjectURL(blob);

  if (migrated) {
    log.info(`Tileset ${id} migrated to version ${latestVersion}, saving...`);
    await saveTileset(ts);
  }

  return ts;
}

export async function saveTileset(ts: Tileset) {
  const imageData = await (await fetch(ts.objectUrl)).bytes();
  const doc: LatestTilesetDoc = {
    tileset: { ...ts, objectUrl: "" },
    imageData,
    version: latestVersion,
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

export async function deleteTileset(id: string) {
  const res = await fetch(`/api/tilesets/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`deleteTileset failed: ${res.status}`);
}
