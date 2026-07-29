import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

/**
 * Derives a 32-byte key buffer from the environment variable TOKEN_ENCRYPTION_KEY.
 * If the key is a 64-character hex string, it is parsed directly.
 * Otherwise, it is hashed with SHA-256 to guarantee a valid 32-byte key buffer.
 */
function getEncryptionKey(): Buffer {
  const secretKey = process.env.TOKEN_ENCRYPTION_KEY;
  if (!secretKey) {
    throw new Error('TOKEN_ENCRYPTION_KEY environment variable is not defined');
  }

  // If it is exactly a 64-character hex string, parse it as hex
  if (/^[0-9a-fA-F]{64}$/.test(secretKey)) {
    return Buffer.from(secretKey, 'hex');
  }

  // Fallback: SHA-256 hash of the key string to ensure 32 bytes
  return crypto.createHash('sha256').update(secretKey).digest();
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns a colon-separated string in the format: iv:authTag:encryptedHex
 */
export function encryptToken(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an encrypted token string (iv:authTag:encryptedHex) using AES-256-GCM.
 * Returns the decrypted plaintext string.
 */
export function decryptToken(encryptedData: string): string {
  const key = getEncryptionKey();
  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted token format');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encryptedText = Buffer.from(parts[2], 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedText).toString('utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

export { decryptToken as decrypt };
