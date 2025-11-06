import type { TilesetDocV10 } from "../schema";

export async function migrate(doc: TilesetDocV10) {
  const ts = doc.tileset;

  const ab = new ArrayBuffer(doc.imageData.byteLength);
  new Uint8Array(ab).set(doc.imageData);
  const blob = new Blob([ab]);

  const bitmap = await createImageBitmap(blob);
  ts.width = bitmap.width;
  ts.height = bitmap.height;
  bitmap.close();
}
