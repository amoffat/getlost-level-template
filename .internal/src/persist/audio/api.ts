import { jobProgress$ } from "../../utils/jobs";

/** Upload a single audio file via PUT. */
export async function uploadAudioFile(item: {
  id: string;
  ext: string;
  blob: Blob;
  restricted?: boolean;
}): Promise<void> {
  const { id, ext, blob, restricted } = item;
  const filename = `${id}${ext}`;
  const form = new FormData();
  form.append("audio", blob, filename);
  if (restricted) form.append("audio.restricted", "1");
  const res = await fetch(`/level/sounds/${encodeURIComponent(filename)}`, {
    method: "PUT",
    body: form,
  });

  if (res.status === 202) {
    // Server is processing asynchronously (e.g. ffmpeg conversion).
    // Extract the job ID from the Location header and subscribe to progress.
    const relPath = res.headers.get("Location")!;
    const path = `/level/sounds/${relPath}/events`;
    jobProgress$(path).subscribe({
      next: (data) => console.log(`[audio upload] job ${path} progress:`, data),
      error: (err) => console.error(`[audio upload] job ${path} error:`, err),
    });
    return;
  }

  if (!res.ok) throw new Error(`uploadAudioFile failed: ${res.status}`);
}

/** Fetch a single audio file and return a blob URL. */
export async function fetchAudioFileUrl(filename: string): Promise<string> {
  const res = await fetch(`/level/sounds/${encodeURIComponent(filename)}`);
  if (!res.ok) throw new Error(`fetchAudioFileUrl failed: ${res.status}`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

/** Delete an audio file from the server. */
export async function deleteAudioFile(filename: string): Promise<void> {
  const res = await fetch(`/level/sounds/${encodeURIComponent(filename)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`deleteAudioFile failed: ${res.status}`);
}

/** List all audio filenames (e.g. `["abc123.ogg", "def456.mp3"]`). */
export async function listAudioFiles(): Promise<string[]> {
  const res = await fetch("/level/sounds/");
  if (!res.ok) throw new Error(`listAudioFiles failed: ${res.status}`);
  const data = (await res.json()) as { ids: string[] };
  return data.ids;
}
