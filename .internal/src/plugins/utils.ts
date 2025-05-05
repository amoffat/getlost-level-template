export const allowedDomains = [".getlost.gg", "localhost"];

export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) {
    return false;
  }
  try {
    const domain = new URL(origin).hostname;
    return allowedDomains.some((d) => domain.endsWith(d));
  } catch {
    return false;
  }
}
