/**
 * Canonical public base URL for links and Open Graph metadata.
 *
 * On Vercel, `VERCEL_URL` is always set. If `NEXT_PUBLIC_APP_URL` was copied from
 * local `.env` as `http://localhost:3000`, using it would poison share links in
 * production—so we ignore localhost-style values when `VERCEL_URL` exists.
 *
 * Priority when deployed (VERCEL_URL set):
 * 1. NEXT_PUBLIC_APP_URL if it is a non-local origin (custom domain / real URL)
 * 2. https://VERCEL_URL
 *
 * Local dev (no VERCEL_URL):
 * 1. NEXT_PUBLIC_APP_URL if set
 * 2. http://localhost:3000
 */
function isLocalDevelopmentOrigin(baseUrl: string): boolean {
  try {
    const withScheme =
      baseUrl.includes("://") || baseUrl.startsWith("//")
        ? baseUrl.startsWith("//")
          ? `http:${baseUrl}`
          : baseUrl
        : `http://${baseUrl}`;
    const { hostname } = new URL(withScheme);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  } catch {
    return false;
  }
}

export function getPublicAppUrl(): string {
  const explicitRaw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const explicit = explicitRaw ? explicitRaw.replace(/\/$/, "") : "";

  const vercelRaw = process.env.VERCEL_URL?.trim();
  if (vercelRaw) {
    const host = vercelRaw.replace(/^https?:\/\//i, "");
    if (explicit && !isLocalDevelopmentOrigin(explicit)) {
      return explicit;
    }
    return `https://${host}`;
  }

  if (explicit) return explicit;
  return "http://localhost:3000";
}
