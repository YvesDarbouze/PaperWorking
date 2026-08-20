/** Framework-agnostic HTTP result — adapt to Next.js, Hono, Express at the app boundary. */
export interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'lax' | 'strict' | 'none';
  path?: string;
  maxAge?: number;
}

export interface SetCookie {
  name: string;
  value: string;
  options?: CookieOptions;
}

export interface RouteResult {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
  cookies?: SetCookie[];
}

export function jsonResponse(
  status: number,
  body: unknown,
  headers?: Record<string, string>,
  cookies?: SetCookie[],
): RouteResult {
  return {
    status,
    body,
    headers: { 'content-type': 'application/json', ...headers },
    cookies,
  };
}

export function binaryResponse(
  status: number,
  body: ArrayBuffer | Uint8Array | string,
  headers: Record<string, string>,
): RouteResult {
  return { status, body, headers };
}

export function sseResponse(
  stream: ReadableStream<Uint8Array>,
  headers?: Record<string, string>,
): RouteResult {
  return {
    status: 200,
    body: stream,
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      ...headers,
    },
  };
}

export function htmlResponse(
  status: number,
  html: string,
  headers?: Record<string, string>,
): RouteResult {
  return {
    status,
    body: html,
    headers: { 'content-type': 'text/html; charset=utf-8', ...headers },
  };
}

export function redirectResponse(url: string, status = 302): RouteResult {
  return { status, body: null, headers: { location: url } };
}

/** Minimal request shape for CSRF + auth handlers (no Next.js dependency). */
export interface HttpRequestLike {
  headers: {
    get(name: string): string | null;
  };
}

export function headersRecordFromRequest(request: HttpRequestLike): Record<string, string | undefined> {
  const names = [
    'origin',
    'referer',
    'sec-fetch-site',
    'cookie',
    'user-agent',
    'x-forwarded-for',
    'x-real-ip',
  ];
  const out: Record<string, string | undefined> = {};
  for (const name of names) {
    out[name] = request.headers.get(name) ?? undefined;
  }
  return out;
}

export function parseCookieHeader(cookieHeader: string | null | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  const out: Record<string, string> = {};
  for (const part of cookieHeader.split(';')) {
    const [rawKey, ...rest] = part.trim().split('=');
    if (!rawKey) continue;
    out[rawKey] = decodeURIComponent(rest.join('='));
  }
  return out;
}
