/**
 * Extract numeric repo ID from Get Lost URLs (e.g., https://getlost.gg/994021540/main)
 * Returns null if not a valid Get Lost URL format
 */
export function extractNumericIdFromGetLostUrl(input: string): string | null {
  try {
    const urlObj = new URL(input);
    // Check if it's a getlost.gg domain (any subdomain)
    if (!urlObj.hostname.endsWith("getlost.gg")) {
      return null;
    }
    const pathParts = urlObj.pathname
      .split("/")
      .filter((part) => part.length > 0);

    // First path segment should be numeric
    if (pathParts.length > 0 && /^\d+$/.test(pathParts[0])) {
      return pathParts[0];
    }
    return null;
  } catch {
    return null;
  }
}
