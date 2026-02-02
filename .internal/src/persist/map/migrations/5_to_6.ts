import type { MapDocV5 } from "../schema";

/**
 * Migration from version 5 to 6:
 * Adds the `flicker` property to all light objects and the light template.
 *
 * The flicker property controls the light's flicker pattern, with options:
 * - "constant": No flickering (default)
 * - "campfire": Warm, organic flickering pattern
 * - "fluorescent": Sharp, rapid flickering pattern
 */
export async function migrate(doc: MapDocV5) {
  // Add flicker to the light template
  if (doc.map.templates?.lights) {
    (doc.map.templates.lights as any).flicker = "constant";
  }

  // Add flicker to all existing light objects
  if (doc.map.objects?.entities) {
    for (const obj of Object.values(doc.map.objects.entities)) {
      if (obj && obj.type === 6) {
        // MapObjType.Light = 6
        (obj as any).flicker = "constant";
      }
    }
  }
}
