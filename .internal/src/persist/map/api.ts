import { log } from "@/log";
import { SavedMap } from "@/types/map";
import { applyMigrations } from "@/utils/migrations";
import { decode, encode } from "cbor2";
import { getMigrations } from "./migrations";
import { BaseMapDoc, LatestMapDoc, latestVersion } from "./schema";

export async function loadMap(): Promise<SavedMap | undefined> {
  const res = await fetch("/level/map.cbor.gz", { method: "GET" });
  if (res.status === 404) {
    log.info("No persisted map found; starting fresh");
    return;
  }
  if (!res.ok) throw new Error(`loadMap failed: ${res.status}`);

  const migrations = await getMigrations();
  const baseDecoded = decode<BaseMapDoc>(await res.bytes());
  const migrated = await applyMigrations(
    baseDecoded,
    migrations,
    latestVersion
  );

  const decoded = baseDecoded as LatestMapDoc;

  if (migrated) {
    log.info(`Map migrated to version ${latestVersion}, saving...`);
    await saveMap(decoded.map);
  }

  return decoded.map;
}

export async function saveMap(map: SavedMap): Promise<void> {
  const doc: LatestMapDoc = {
    version: latestVersion,
    map,
  };
  const payload = encode(doc);
  // Copy to standalone ArrayBuffer to satisfy BlobPart typing similar to tileset api
  const ab = new ArrayBuffer(payload.byteLength);
  new Uint8Array(ab).set(payload);
  const blob = new Blob([ab], { type: "application/cbor" });
  const res = await fetch("/level/map.cbor.gz", {
    method: "PUT",
    headers: { "content-type": "application/cbor" },
    body: blob,
  });
  if (!res.ok) throw new Error(`saveMap failed: ${res.status}`);

  log.info("[autosave] Map saved (objects: %d)", map.objects.ids?.length ?? 0);
}
