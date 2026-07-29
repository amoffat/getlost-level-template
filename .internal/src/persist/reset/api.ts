import type { ResetInfo } from "@/types/api/reset";

/** Fetches metadata describing what a full reset would do (e.g. how many level
 *  assets would be deleted), without performing the reset. */
export async function fetchResetInfo(): Promise<ResetInfo> {
  const res = await fetch("/api/reset");
  if (!res.ok) throw new Error(`fetchResetInfo failed: ${res.status}`);
  return (await res.json()) as ResetInfo;
}

/** Deletes all authored level assets on the backend and restores bare
 *  templates (full reset). The caller should reload the app afterwards. */
export async function resetLevel(): Promise<void> {
  const res = await fetch("/api/reset", { method: "POST" });
  if (!res.ok) throw new Error(`resetLevel failed: ${res.status}`);
}
