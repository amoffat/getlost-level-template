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
  } catch (error) {
    return null;
  }
}

export function extractOwnerRepo(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Check if it's already in owner/repo format
  if (/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return trimmed;
  }

  // Try to parse as URL
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

    return `${pathParts[0]}/${pathParts[1]}`;
  } catch {
    return null;
  }
}
