import type { MapDocV7 } from "../schema";

/**
 * Migration from version 7 to 8:
 * Background images were previously stored as a separate `backgroundImages`
 * array on SavedMap. They are now stored as `BackgroundImageObj` instances
 * (type = 11) inside the `objects` entity adapter, just like any other map
 * object. This lets the existing select/move infrastructure work on them.
 *
 * For each item in `backgroundImages`, we create a BackgroundImageObj placed
 * at the map bounds (full-canvas size), preserving the insertion order via
 * z-index.
 */
export async function migrate(doc: MapDocV7) {
  const map = doc.map as any;
  const bgImages: { id: string; imageId: string }[] = map.backgroundImages ?? [];

  if (bgImages.length === 0) {
    delete map.backgroundImages;
    return;
  }

  const bounds = map.bounds ?? { x: 0, y: 0, width: 1920, height: 1080 };

  // Find the current min z among objects to avoid collisions, then place
  // background images below everything (lower z = rendered first).
  const existingEntities = Object.values(map.objects?.entities ?? {}) as any[];
  const minExistingZ = existingEntities.length > 0
    ? Math.min(...existingEntities.map((o: any) => o.z ?? 0))
    : 0;

  for (let i = 0; i < bgImages.length; i++) {
    const { id, imageId } = bgImages[i];
    const obj = {
      id,
      type: 11, // MapObjType.BackgroundImage
      imageId,
      x: bounds.x,
      y: bounds.y,
      z: minExistingZ - (bgImages.length - i), // preserve order, below existing objects
      layer: 4, // MapLayerName.Background
      width: bounds.width,
      height: bounds.height,
    };
    if (!map.objects) map.objects = { ids: [], entities: {} };
    map.objects.ids.push(id);
    map.objects.entities[id] = obj;
  }

  delete map.backgroundImages;
}
