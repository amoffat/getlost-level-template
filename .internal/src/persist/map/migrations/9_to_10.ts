import type { MapDocV8 } from "../schema";

/**
 * Migration from version 9 to 10:
 */
export async function migrate(doc: MapDocV8) {
  const map = doc.map as any;
  const entities = map.objects?.entities ?? {};

  for (const obj of Object.values(entities) as any[]) {
    if (obj.type === 11 /* MapObjType.BackgroundImage */ && obj.parallax) {
      obj.parallaxX = obj.parallax.x;
      obj.parallaxY = obj.parallax.y;
      delete obj.parallax;
    }
  }
}
