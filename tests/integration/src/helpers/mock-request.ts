import type { HttpRequestLike } from '@paperworking/api';

export function mockRequest(headers: Record<string, string>): HttpRequestLike {
  const lower = Object.fromEntries(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]),
  );
  return {
    headers: {
      get(name: string) {
        return lower[name.toLowerCase()] ?? null;
      },
    },
  };
}
