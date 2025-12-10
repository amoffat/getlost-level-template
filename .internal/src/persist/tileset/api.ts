import { tilesetSourceHeader } from "@/constants/headers";
import { log } from "@/log";
import { LoadTilesetsResponse } from "@/types/api/tileset";
import { SavedTileset, Tileset } from "@/types/tileset";
import { applyMigrations } from "@/utils/migrations";
import { decode, encode } from "cbor2";
import { getMigrations } from "./migrations";
import { BaseTilesetDoc, LatestTilesetDoc, latestVersion } from "./schema";

export async function loadTilesets(): Promise<LoadTilesetsResponse> {
  const res = await fetch("/api/tilesets", {
    method: "GET",
    headers: { "content-type": "application/json" },
  });
  if (!res.ok) throw new Error(`openProject failed: ${res.status}`);
  const resp = (await res.json()) as LoadTilesetsResponse;
  return resp;
}

export async function loadTileset(id: string): Promise<Tileset> {
  const res = await fetch(`/api/tilesets/${encodeURIComponent(id)}`, {
    method: "GET",
  });
  if (!res.ok) throw new Error(`loadTileset failed: ${res.status}`);

  // Apply all applicable migrations to bring the doc up to the latest version
  const migrations = await getMigrations();
  const baseDecoded = decode<BaseTilesetDoc>(await res.bytes());

  // Check for version override in querystring (for debugging migrations)
  const urlParams = new URLSearchParams(window.location.search);
  const tsVersionParam = urlParams.get("tsVersion");
  if (tsVersionParam !== null) {
    const versionOverride = Number(tsVersionParam);
    if (!isNaN(versionOverride)) {
      baseDecoded.version = versionOverride;
      log.info(
        `Tileset ${id} version overridden to ${versionOverride} via querystring`
      );
    }
  }

  const migrated = await applyMigrations(
    baseDecoded,
    migrations,
    latestVersion
  );

  const decoded = baseDecoded as LatestTilesetDoc;
  const ts = decoded.tileset as Tileset;

  const sourceHeader = res.headers.get(tilesetSourceHeader);
  const isSystem = sourceHeader === "system";
  ts.hidden = isSystem;

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

  const toSave: SavedTileset = {
    id: ts.id,
    width: ts.width,
    height: ts.height,
    composite: ts.composite,
    tiles: ts.tiles,
    restricted: ts.restricted,
  } satisfies SavedTileset;

  const doc: LatestTilesetDoc = {
    tileset: toSave,
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
