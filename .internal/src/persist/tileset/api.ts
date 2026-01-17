import { tilesetSourceHeader } from "@/constants/headers";
import { log } from "@/log";
import { LoadTilesetsResponse } from "@/types/api/tileset";
import { isTileGroupTemplate } from "@/types/tilegroup";
import { SavedTileset, Tileset } from "@/types/tileset";
import { collisionMaskStore } from "@/utils/maskStore";
import { applyMigrations } from "@/utils/migrations";
import { decode, encode } from "cbor2";
import { getMigrations } from "./migrations";
import { BaseTilesetDoc, LatestTilesetDoc, latestVersion } from "./schema";

export async function loadTilesets(): Promise<LoadTilesetsResponse> {
  const res = await fetch("/level/tilesets", {
    method: "GET",
    headers: { "content-type": "application/json" },
  });
  if (!res.ok) throw new Error(`openProject failed: ${res.status}`);
  const resp = (await res.json()) as LoadTilesetsResponse;
  return resp;
}

export async function loadTileset(id: string): Promise<Tileset> {
  const res = await fetch(`/level/tilesets/${encodeURIComponent(id)}.cbor.gz`, {
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

  // Hydrate the module-level mask store with this tileset's mask data
  if (decoded.maskData) {
    for (const [uuid, data] of Object.entries(decoded.maskData)) {
      collisionMaskStore.set(uuid, data);
    }
  }

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

  // Collect mask data for all TileGroupTemplates in this tileset
  const maskData: Record<string, Uint8Array> = {};
  if (ts.tiles?.entities) {
    for (const obj of Object.values(ts.tiles.entities)) {
      if (obj && isTileGroupTemplate(obj) && obj.collisions.mask) {
        const data = collisionMaskStore.get(obj.collisions.mask);
        if (data) {
          maskData[obj.collisions.mask] = data;
        }
      }
    }
  }

  const toSave: SavedTileset = {
    id: ts.id,
    width: ts.width,
    height: ts.height,
    gridSize: ts.gridSize,
    composite: ts.composite,
    tiles: ts.tiles,
    restricted: ts.restricted,
  } satisfies SavedTileset;

  const doc: LatestTilesetDoc = {
    tileset: toSave,
    imageData,
    maskData,
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

  const res = await fetch(
    `/level/tilesets/${encodeURIComponent(ts.id)}.cbor.gz`,
    {
      method: "PUT",
      body: form,
    }
  );
  if (!res.ok) throw new Error(`saveMeta failed: ${res.status}`);
}

export async function deleteTileset(id: string) {
  const res = await fetch(`/level/tilesets/${encodeURIComponent(id)}.cbor.gz`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`deleteTileset failed: ${res.status}`);
}
