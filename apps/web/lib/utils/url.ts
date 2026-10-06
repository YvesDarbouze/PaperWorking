/**
 * URL and Host resolution utilities for dynamic link generation.
 * Handles environment variables, multi-tenant/preview request headers, and production fallbacks.
 */

export function resolveAppBaseUrl(request?: Request): string {
  // 1. Explicit environment variable takes first priority
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (envUrl?.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // 2. Request host & proto headers (forwarded by Cloud Run, Vercel, or local reverse proxies)
  if (request) {
    const forwardedHost = request.headers.get('x-forwarded-host');
    const host = forwardedHost || request.headers.get('host');
    if (host) {
      const forwardedProto = request.headers.get('x-forwarded-proto');
      const proto =
        forwardedProto ||
        (host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https');
      return `${proto}://${host}`.replace(/\/+$/, '');
    }

    // 3. Fallback to request URL origin if valid HTTP/HTTPS URL
    try {
      if (request.url) {
        const parsed = new URL(request.url);
        if (parsed.protocol.startsWith('http') && parsed.host) {
          return parsed.origin.replace(/\/+$/, '');
        }
      }
    } catch {
      // Fall through to default
    }
  }

  // 4. Default official production domain fallback
  return 'https://paperworking.co';
}
