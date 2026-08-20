import { createHmac, timingSafeEqual } from 'node:crypto';

export function verifyBridgeWebhookHmac(
  body: string,
  signature: string | null | undefined,
  secret: string,
): boolean {
  if (!signature) return false;
  const expected = createHmac('sha256', secret).update(body).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function parseBridgeWebhookPayload(rawBody: string): unknown {
  return JSON.parse(rawBody);
}
