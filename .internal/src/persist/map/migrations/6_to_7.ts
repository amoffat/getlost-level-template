import type { MapDocV6 } from "../schema";

/**
 * Migration from version 6 to 7:
 * Adds the `backgroundImages` field to the map.
 *
 * The field is optional in SavedMap so existing maps load fine without it,
 * but we bump the version so that freshly saved maps advertise V7.
 */
export async function migrate(_doc: MapDocV6) {
  // No structural changes needed — backgroundImages defaults to [] on load.
}
