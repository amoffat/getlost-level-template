import type { MapDocV4 } from "../schema";

/**
 * Migrate light color from RgbColor object to hex string (without hash)
 */
export async function migrate(doc: MapDocV4) {
  const state = doc.state;

  // Helper function to convert RgbColor to hex string without hash
  const rgbToHex = (rgb: { r: number; g: number; b: number }): string => {
    const rHex = rgb.r.toString(16).padStart(2, "0");
    const gHex = rgb.g.toString(16).padStart(2, "0");
    const bHex = rgb.b.toString(16).padStart(2, "0");
    return `${rHex}${gHex}${bHex}`;
  };

  // Migrate the lights template
  if (
    state.templates?.lights?.color &&
    typeof state.templates.lights.color === "object" &&
    "r" in state.templates.lights.color
  ) {
    (state.templates.lights.color as any) = rgbToHex(
      state.templates.lights.color as any
    );
  }

  // Migrate all light instances in objects
  if (state.objects?.entities) {
    for (const id in state.objects.entities) {
      const obj = state.objects.entities[id];
      if (
        obj &&
        "color" in obj &&
        obj.color &&
        typeof obj.color === "object" &&
        "r" in obj.color
      ) {
        (obj.color as any) = rgbToHex(obj.color as any);
      }
    }
  }
}
