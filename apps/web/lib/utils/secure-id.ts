/**
 * Unguessable identifiers backed by the Web Crypto CSPRNG.
 * Works in Node 19+, the Edge runtime, and browsers without importing node:crypto,
 * so it is safe in modules that may be bundled for the client.
 */

const CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

/** Base64url string encoding `byteLength` random bytes (24 bytes -> 32 chars). */
export function secureRandomToken(byteLength = 24): string {
  let binary = '';
  for (const b of randomBytes(byteLength)) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Lowercase hex string encoding `byteLength` random bytes (16 bytes -> 32 chars). */
export function secureRandomHex(byteLength = 16): string {
  return Array.from(randomBytes(byteLength), (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Uppercase alphanumeric code of exact `length`.
 * Uses rejection sampling so every character is uniformly distributed.
 */
export function secureRandomCode(length: number): string {
  const limit = 256 - (256 % CODE_ALPHABET.length);
  let out = '';
  while (out.length < length) {
    for (const b of randomBytes(length * 2)) {
      if (b < limit) out += CODE_ALPHABET[b % CODE_ALPHABET.length];
      if (out.length === length) break;
    }
  }
  return out;
}
