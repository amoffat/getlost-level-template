import type { MapDocV8 } from "../schema";

/**
 * Migration from version 8 to 9:
 * BackgroundImageObj gains a `parallax` field ({ x: number; y: number }).
 * Existing background image objects (type === 11) are given the default
 * value of { x: 1, y: 1 }, which means no parallax effect.
 */
export async function migrate(doc: MapDocV8) {
  const map = doc.map as any;
  const entities = map.objects?.entities ?? {};

  for (const obj of Object.values(entities) as any[]) {
    if (obj.type === 11 /* MapObjType.BackgroundImage */ && !obj.parallax) {
      obj.parallax = { x: 1, y: 1 };
    }
  }
}
