import type { Request, Response } from 'express';
import type { RouteResult } from '../http/response.js';

/**
 * Map framework-agnostic RouteResult onto an Express response (Nest/Cloud Run).
 */
export function applyRouteResult(res: Response, result: RouteResult): void {
  if (result.headers) {
    for (const [key, value] of Object.entries(result.headers)) {
      if (key.toLowerCase() === 'set-cookie') continue;
      res.setHeader(key, value);
    }
  }

  if (result.cookies?.length) {
    for (const cookie of result.cookies) {
      const opts = cookie.options ?? {};
      const parts = [`${cookie.name}=${encodeURIComponent(cookie.value)}`];
      parts.push(`Path=${opts.path ?? '/'}`);
      if (opts.maxAge !== undefined) parts.push(`Max-Age=${opts.maxAge}`);
      if (opts.httpOnly) parts.push('HttpOnly');
      if (opts.secure) parts.push('Secure');
      if (opts.sameSite) parts.push(`SameSite=${opts.sameSite}`);
      res.append('Set-Cookie', parts.join('; '));
    }
  }

  res.status(result.status);

  if (result.body instanceof ReadableStream) {
    const stream = result.body;
    void (async () => {
      const reader = stream.getReader();
      const chunks: Uint8Array[] = [];
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
      const buf = Buffer.concat(chunks.map((c) => Buffer.from(c)));
      res.end(buf);
    })();
    return;
  }

  if (result.body === null || result.body === undefined) {
    res.end();
    return;
  }

  if (typeof result.body === 'string' || Buffer.isBuffer(result.body) || result.body instanceof Uint8Array) {
    res.send(result.body);
    return;
  }

  res.json(result.body);
}

export function headersFromRequest(req: Request): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) out[key] = value.join(', ');
    else out[key] = value;
  }
  return out;
}

export function cookieHeader(req: Request): string | undefined {
  const raw = req.headers.cookie;
  return typeof raw === 'string' ? raw : undefined;
}
