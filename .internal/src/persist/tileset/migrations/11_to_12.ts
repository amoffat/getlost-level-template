import type { TilesetDocV11 } from "../schema";

/**
 * Migrate tint property from RgbColor object to hex string (without hash)
 */
export async function migrate(doc: TilesetDocV11) {
  const ts = doc.tileset;

  // Helper function to convert RgbColor to hex string without hash
  const rgbToHex = (rgb: { r: number; g: number; b: number }): string => {
    const rHex = rgb.r.toString(16).padStart(2, "0");
    const gHex = rgb.g.toString(16).padStart(2, "0");
    const bHex = rgb.b.toString(16).padStart(2, "0");
    return `${rHex}${gHex}${bHex}`;
  };

  // Migrate all templates (tileGroups, animations, and NPCs are all in tiles)
  for (const id of ts.tiles.ids) {
    const template = ts.tiles.entities[id];
    if (
      template &&
      template.tint &&
      typeof template.tint === "object" &&
      "r" in template.tint
    ) {
      (template.tint as any) = rgbToHex(template.tint as any);
    }
  }
}
