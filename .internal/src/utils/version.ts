import { gameUrls } from "@/constants";
import { Env } from "@/types/env";

/**
 * Returns
 * @returns The engine's current version
 */
export async function fetchEngineVersion(): Promise<string> {
  const resp = await fetch("/files/engine_version.txt");
  if (resp.ok) {
    const version = (await resp.text()).trim();
    return version;
  } else {
    throw new Error(
      `Failed to fetch engine version: ${resp.status} ${resp.statusText}`,
    );
  }
}

/**
 *
 * @param env The environment (prod, qa, etc) to check the version
 * @param version The version we want to check
 * @returns The authoritative version
 */
export async function resolveVersion(
  env: Env,
  version: string,
): Promise<string | null> {
  if (env === "local") return version;

  const gameUrl = gameUrls[env];
  const resp = await fetch(`${gameUrl}engine/${version}/version`);
  if (resp.ok) {
    const version = (await resp.text()).trim();
    if (version === "null") {
      return null;
    }
    return version;
  } else {
    throw new Error(
      `Failed to resolve version: ${resp.status} ${resp.statusText}`,
    );
  }
}

export async function hasNewerEngineVersion(): Promise<boolean> {
  const currentVersion = await fetchEngineVersion();
  const currentMajor = Number(currentVersion.split(".")[0]);
  const latest = await resolveVersion("prod", `${currentMajor + 1}.0.0`);
  return latest !== null;
}
