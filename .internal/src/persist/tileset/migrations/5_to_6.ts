import { TileGroup } from "@/types/tilegroup";
import { averageOklab } from "@/utils/color";
import { getImageDataFromBitmap, subImageData } from "@/utils/image";
import type { TilesetDocV5 } from "../schema";

/**
 * Populate avgColor for tile groups
 * @param doc
 */
export async function migrate(doc: TilesetDocV5) {
  const ab = new ArrayBuffer(doc.imageData.byteLength);
  new Uint8Array(ab).set(doc.imageData);
  const blob = new Blob([ab]);
  const objectUrl = URL.createObjectURL(blob);
  const bitmap = await createImageBitmap(
    await fetch(objectUrl).then((r) => r.blob())
  );
  const imageData = getImageDataFromBitmap(bitmap);

  const ts = doc.tileset as any;
  for (const obj of Object.values(ts.tiles.entities)) {
    const tg = obj as TileGroup;
    const tileImageData = subImageData(imageData, tg.pos);

    if (tg.avgColor === undefined) {
      tg.avgColor = averageOklab(tileImageData);
    }
  }
}
