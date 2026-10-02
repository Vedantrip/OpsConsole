/**
 * Safely resolves the base application origin URL (e.g. https://mountlift-ops.vercel.app).
 * 
 * Auto-sanitizes any path suffixes that might have been accidentally pasted into 
 * NEXT_PUBLIC_APP_URL or APP_URL (such as /api/auth/instagram/callback).
 */
export function getAppBaseUrl(origin?: string): string {
  if (origin && origin.startsWith("http")) {
    try {
      return new URL(origin).origin;
    } catch {
      return origin.replace(/\/+$/, "");
    }
  }

  const raw =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL.trim()}` : undefined) ||
    "http://localhost:3000";

  try {
    const parsed = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    return parsed.origin;
  } catch {
    return raw.replace(/\/+$/, "");
  }
}
