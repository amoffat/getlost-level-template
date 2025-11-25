import memoize from "memoizee";
import { extractNumericIdFromGetLostUrl } from "./getlost";

export async function extractIdFromGithubRepoUrl(
  url: string
): Promise<string | null> {
  try {
    // Parse the URL to extract OWNER/REPO
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname
      .split("/")
      .filter((part) => part.length > 0);

    // Need at least owner and repo
    if (pathParts.length < 2) {
      return null;
    }

    const owner = pathParts[0];
    const repo = pathParts[1];

    // Build the API URL and fetch
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.id ? String(data.id) : null;
  } catch {
    return null;
  }
}

// Memoized version to avoid spamming GitHub API
const cachedLookupIdFromGithubRepoUrl = memoize(extractIdFromGithubRepoUrl, {
  promise: true,
});

/**
 * Extract numeric repo ID from various input formats:
 * - owner/repo format: "amoffat/getlost-level-template"
 * - GitHub URLs: "https://github.com/owner/repo"
 * - Numeric ID: "994021540"
 * - Get Lost URLs: "https://getlost.gg/994021540/main"
 *
 * Always returns the numeric GitHub repo ID or null if invalid
 */
export async function extractRepoId(input: string): Promise<string | null> {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Check if it's a pure numeric ID
  if (/^\d+$/.test(trimmed)) {
    return trimmed;
  }

  // Check if it's a Get Lost URL
  const numericId = extractNumericIdFromGetLostUrl(trimmed);
  if (numericId) {
    return numericId;
  }

  // Check if it's already in owner/repo format
  if (/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return await cachedLookupIdFromGithubRepoUrl(
      `https://github.com/${trimmed}`
    );
  }

  // Try to parse as GitHub URL
  try {
    const urlObj = new URL(trimmed);
    if (urlObj.hostname !== "github.com") {
      return null;
    }
    const pathParts = urlObj.pathname
      .split("/")
      .filter((part) => part.length > 0);

    if (pathParts.length < 2) {
      return null;
    }

    const ownerRepo = `${pathParts[0]}/${pathParts[1]}`;
    return await cachedLookupIdFromGithubRepoUrl(
      `https://github.com/${ownerRepo}`
    );
  } catch {
    return null;
  }
}
