import { log } from "@/log";
import { MapObj } from "@/types/reconciler";
import { decode, encode } from "cbor2";
import { getMigrations } from "./migrations";
import { BaseMapDoc, LatestMapDoc, latestVersion } from "./schema";

export interface PersistedObjectsState {
  ids: string[];
  entities: Record<string, MapObj>;
}

export async function loadMap(): Promise<PersistedObjectsState> {
  const res = await fetch("/api/map", { method: "GET" });
  if (res.status === 404) {
    log.info("No persisted map found; starting fresh");
    return { ids: [], entities: {} };
  }
  if (!res.ok) throw new Error(`loadMap failed: ${res.status}`);

  const migrations = await getMigrations();
  const maxVersion = migrations.reduce((max, m) => Math.max(max, m.to), 1);

  const baseDecoded = decode<BaseMapDoc>(await res.bytes());
  const startVersion = baseDecoded.version;
  let migrated = false;
  for (const migration of migrations) {
    if (migration.from >= startVersion && migration.to <= maxVersion) {
      log.info(`Applying map migration: ${migration.from} -> ${migration.to}`);
      await migration.migrate(baseDecoded);
      baseDecoded.version = migration.to;
      migrated = true;
    }
  }

  const decoded = baseDecoded as LatestMapDoc;
  const objects = decoded.objects;

  if (migrated) {
    log.info(`Map migrated to version ${latestVersion}, saving...`);
    await saveMap(objects);
  }

  return objects;
}

export async function saveMap(objects: PersistedObjectsState): Promise<void> {
  const doc: LatestMapDoc = {
    version: latestVersion,
    objects,
  };
  const payload = encode(doc);
  // Copy to standalone ArrayBuffer to satisfy BlobPart typing similar to tileset api
  const ab = new ArrayBuffer(payload.byteLength);
  new Uint8Array(ab).set(payload);
  const blob = new Blob([ab], { type: "application/cbor" });
  const res = await fetch("/api/map", {
    method: "PUT",
    headers: { "content-type": "application/cbor" },
    body: blob,
  });
  if (!res.ok) throw new Error(`saveMap failed: ${res.status}`);
}
