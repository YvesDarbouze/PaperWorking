import type { RouteResult } from '@paperworking/api';
import { NextResponse } from 'next/server';

export function toNextResponse(result: RouteResult): NextResponse {
  const headers = new Headers(result.headers ?? {});

  let response: NextResponse;

  if (result.body instanceof ReadableStream) {
    response = new NextResponse(result.body, { status: result.status, headers });
  } else if (result.body === null) {
    response = new NextResponse(null, { status: result.status, headers });
  } else if (typeof result.body === 'string') {
    response = new NextResponse(result.body, { status: result.status, headers });
  } else if (result.body instanceof Uint8Array) {
    response = new NextResponse(result.body.buffer as ArrayBuffer, {
      status: result.status,
      headers,
    });
  } else {
    response = NextResponse.json(result.body, { status: result.status, headers });
  }

  // Prefer NextResponse.cookies API — manual Set-Cookie headers are unreliable in App Router.
  if (result.cookies?.length) {
    for (const cookie of result.cookies) {
      const opts = cookie.options;
      response.cookies.set(cookie.name, cookie.value, {
        httpOnly: opts?.httpOnly,
        secure: opts?.secure,
        sameSite: opts?.sameSite,
        path: opts?.path ?? '/',
        maxAge: opts?.maxAge,
      });
    }
  }

  return response;
}
