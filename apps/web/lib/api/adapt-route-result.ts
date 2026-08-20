import type { RouteResult } from '@paperworking/api';
import { NextResponse } from 'next/server';

export function toNextResponse(result: RouteResult): NextResponse {
  const headers = new Headers(result.headers ?? {});

  if (result.cookies?.length) {
    for (const cookie of result.cookies) {
      const parts = [`${cookie.name}=${encodeURIComponent(cookie.value)}`];
      const opts = cookie.options;
      if (opts?.maxAge !== undefined) parts.push(`Max-Age=${opts.maxAge}`);
      if (opts?.path) parts.push(`Path=${opts.path}`);
      if (opts?.httpOnly) parts.push('HttpOnly');
      if (opts?.secure) parts.push('Secure');
      if (opts?.sameSite) parts.push(`SameSite=${opts.sameSite[0].toUpperCase()}${opts.sameSite.slice(1)}`);
      headers.append('Set-Cookie', parts.join('; '));
    }
  }

  if (result.body instanceof ReadableStream) {
    return new NextResponse(result.body, { status: result.status, headers });
  }

  if (result.body === null) {
    return new NextResponse(null, { status: result.status, headers });
  }

  if (typeof result.body === 'string') {
    return new NextResponse(result.body, { status: result.status, headers });
  }

  if (result.body instanceof Uint8Array) {
    return new NextResponse(result.body.buffer as ArrayBuffer, { status: result.status, headers });
  }

  return NextResponse.json(result.body, { status: result.status, headers });
}
