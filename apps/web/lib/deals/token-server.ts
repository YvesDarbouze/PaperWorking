import type { BroadcastTokenPayload } from './token';

export function createBroadcastToken(payload: BroadcastTokenPayload): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodeBase64Url = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

  const encodedHeader = encodeBase64Url(header);
  const encodedPayload = encodeBase64Url({
    ...payload,
    exp: payload.exp || Math.floor(Date.now() / 1000) + 14 * 86400,
  });
  const signature = Buffer.from(`${encodedHeader}.${encodedPayload}.paperworking_secret`).toString(
    'base64url',
  );
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}
