/** Fetches a speaker image PNG and returns a blob URL. */
export async function fetchSpeakerImageUrl(imageId: string): Promise<string> {
  const res = await fetch(`/level/speakers/${encodeURIComponent(imageId)}.png`);
  if (!res.ok) throw new Error(`fetchSpeakerImageUrl failed: ${res.status}`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

/** Uploads a single speaker image PNG via PUT. */
export async function uploadSpeakerImage(item: {
  id: string;
  data: Uint8Array;
}): Promise<void> {
  const { id, data } = item;
  const form = new FormData();
  form.append(
    "speaker",
    new Blob([data.buffer as ArrayBuffer], { type: "image/png" }),
    `${id}.png`,
  );
  const res = await fetch(`/level/speakers/${encodeURIComponent(id)}.png`, {
    method: "PUT",
    body: form,
  });
  if (!res.ok) throw new Error(`uploadSpeakerImage failed: ${res.status}`);
}

/** Deletes a speaker image PNG from the server. */
export async function deleteSpeakerImage(imageId: string): Promise<void> {
  const res = await fetch(
    `/level/speakers/${encodeURIComponent(imageId)}.png`,
    { method: "DELETE" },
  );
  if (!res.ok) throw new Error(`deleteSpeakerImage failed: ${res.status}`);
}
