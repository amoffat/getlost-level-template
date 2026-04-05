import type { TilesetDocV23 } from "../schema";

/**
 * Migration from version 23 to 24:
 * Removes `restricted` from the CBOR tileset metadata. Restricted status is now
 * communicated via the file naming convention (.restricted.cbor.gz) and the
 * GetLost-Tileset-Restricted response header — not embedded in the asset data.
 */
export async function migrate(doc: TilesetDocV23) {
  delete (doc.tileset as any).restricted;
}
