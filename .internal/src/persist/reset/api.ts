/** Deletes all authored level assets on the backend and restores bare
 *  templates (full reset). The caller should reload the app afterwards. */
export async function resetLevel(): Promise<void> {
  const res = await fetch("/api/reset", { method: "POST" });
  if (!res.ok) throw new Error(`resetLevel failed: ${res.status}`);
}
