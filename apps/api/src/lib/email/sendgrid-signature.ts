import { createVerify } from 'crypto';

export function formatSendGridPublicKey(key: string): string {
  if (key.includes('-----BEGIN PUBLIC KEY-----')) return key.trim();
  const cleanKey = key.trim().replace(/\s+/g, '');
  const lines = cleanKey.match(/.{1,64}/g)?.join('\n') || cleanKey;
  return `-----BEGIN PUBLIC KEY-----\n${lines}\n-----END PUBLIC KEY-----`;
}

/**
 * Verifies SendGrid Event Webhook ECDSA signature (timestamp + raw body).
 */
export function verifySendGridSignature(
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
  publicKey: string,
): boolean {
  if (!signature || !timestamp) return false;
  try {
    const formattedKey = formatSendGridPublicKey(publicKey);
    const verifier = createVerify('sha256');
    verifier.update(timestamp + rawBody);
    return verifier.verify(formattedKey, signature, 'base64');
  } catch (err) {
    console.error('[SendGrid Webhook] Signature verification exception:', err);
    return false;
  }
}

export function isMockSendGridSignature(signature: string | null, nodeEnv?: string): boolean {
  return nodeEnv !== 'production' && Boolean(signature?.includes('mock_sig'));
}
