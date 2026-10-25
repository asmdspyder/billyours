/**
 * Automatically resolves the application's base URL across:
 * 1. Active browser window (window.location.origin) — automatically adapts to ANY domain, port, or custom domain
 * 2. Explicit environment variables (NEXT_PUBLIC_APP_URL, APP_URL)
 * 3. Vercel deployment variables (VERCEL_PROJECT_PRODUCTION_URL, VERCEL_URL)
 * 4. Hosted fallback: https://billyours.vercel.app
 */
export function getBaseUrl(): string {
  // 1. Client-side browser: always returns the active current domain/host
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, "");
  }

  // 2. Custom domain environment variables if specified
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (envUrl) {
    const trimmed = envUrl.trim().replace(/\/+$/, "");
    return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
  }

  // 3. Vercel automatic system deployment variables
  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercelUrl) {
    const trimmed = vercelUrl.trim().replace(/\/+$/, "");
    return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
  }

  // 4. Default hosted domain
  return "https://billyours.vercel.app";
}

export function getBillShareUrl(token: string): string {
  return `${getBaseUrl()}/b/${token}`;
}
