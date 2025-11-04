import type { MapDocV2 } from "../schema";

/**
 * Migration from version 2 to 3
 * Converts Rect from {ul: Vector, br: Vector} to {x: number, y: number, width: number, height: number}
 * This affects TileAnimationFrame.frame fields if they exist
 */
export async function migrate(doc: MapDocV2) {
  if (!doc.objects || !doc.objects.entities) return;

  for (const obj of Object.values(doc.objects.entities)) {
    if (!obj) continue;

    // Check if this is an AnimationInstance with frames
    if ("frames" in obj && Array.isArray(obj.frames)) {
      for (const frame of obj.frames as any[]) {
        if (frame.frame) {
          const oldFrame = frame.frame as any;
          if ("ul" in oldFrame && "br" in oldFrame) {
            frame.frame = {
              x: oldFrame.ul.x,
              y: oldFrame.ul.y,
              width: oldFrame.br.x - oldFrame.ul.x,
              height: oldFrame.br.y - oldFrame.ul.y,
            };
          }
        }
      }
    }
  }
}
