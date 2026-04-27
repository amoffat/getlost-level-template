/** Fetches a background image PNG and returns a blob URL. */
export async function fetchBackgroundImageUrl(
  imageId: string,
): Promise<string> {
  const res = await fetch(`/level/backgrounds/${imageId}.png`);
  if (!res.ok) throw new Error(`fetchBackgroundImageUrl failed: ${res.status}`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

/**
 * Uploads a single background image PNG via PUT.
 * Per-asset restricted flag: field "background.restricted" = "1" if restricted.
 */
export async function uploadBackgroundImage(item: {
  id: string;
  blob: Blob;
  restricted?: boolean;
}): Promise<void> {
  const { id, blob, restricted } = item;
  const form = new FormData();
  form.append("background", blob, `${id}.png`);
  if (restricted) form.append("background.restricted", "1");
  const res = await fetch(`/level/backgrounds/${encodeURIComponent(id)}.png`, {
    method: "PUT",
    body: form,
  });
  if (!res.ok) throw new Error(`uploadBackgroundImage failed: ${res.status}`);
}

/**
 * Uploads multiple background image PNGs, one PUT per image (parallel).
 */
export async function batchUploadBackgroundImages(
  items: { id: string; blob: Blob; restricted?: boolean }[],
): Promise<void> {
  if (!items.length) return;
  await Promise.all(items.map(uploadBackgroundImage));
}

/** Deletes a background image PNG from the server. */
export async function deleteBackgroundImage(imageId: string): Promise<void> {
  const res = await fetch(`/level/backgrounds/${imageId}.png`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`deleteBackgroundImage failed: ${res.status}`);
}
