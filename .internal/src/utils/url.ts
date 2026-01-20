/**
 * Encodes an object as a URL-safe base64 string for use in query parameters.
 * Uses base64url encoding (RFC 4648) which is safe for URLs without additional encoding.
 */
export function encodeForUrl(obj: any): string {
  const json = JSON.stringify(obj);
  const base64 = btoa(json);
  // Convert to URL-safe base64: replace + with -, / with _, and remove padding =
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
