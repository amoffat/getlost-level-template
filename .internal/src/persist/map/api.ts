import { log } from "@/log";
import { applyMigrations } from "@/utils/migrations";
import { decode, encode } from "cbor2";
import { getMigrations } from "./migrations";
import { BaseMapDoc, LatestMapDoc, latestVersion, MapState } from "./schema";

export async function loadMap(): Promise<MapState> {
  const res = await fetch("/api/map", { method: "GET" });
  if (res.status === 404) {
    log.info("No persisted map found; starting fresh");
    return { objects: { ids: [], entities: {} } };
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
    await saveMap(decoded.state);
  }

  return decoded.state;
}

export async function saveMap(state: MapState): Promise<void> {
  // Don't persist uncommitted objects
  const uncommitted = new Set(state.uncommittedObjIds);
  const filteredObjects: MapState["objects"] = { ids: [], entities: {} };

  for (const id of state.objects.ids) {
    if (!uncommitted.has(id)) {
      filteredObjects.ids.push(id);
      filteredObjects.entities[id] = state.objects.entities[id];
    }
  }
  state = { objects: filteredObjects };

  const doc: LatestMapDoc = {
    version: latestVersion,
    state,
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

  log.info(
    "[autosave] Map saved (objects: %d)",
    state.objects.ids?.length ?? 0
  );
}
