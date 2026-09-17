import crypto from 'node:crypto';

export const DEFAULT_KEY_ID = 'master-kek-v1';

const DEK_LENGTH_BYTES = 32;
const GCM_IV_LENGTH_BYTES = 12;

export class ImmutableSnapshotError extends Error {
  readonly statusCode = 405;
  readonly code = 'IMMUTABLE_SNAPSHOT_ERROR';

  constructor(snapshotId: string) {
    super(
      `CalculatorSnapshot "${snapshotId}" is immutable and cannot be updated or mutated once persisted.`,
    );
    this.name = 'ImmutableSnapshotError';
  }
}

export class SnapshotIntegrityError extends Error {
  readonly statusCode = 422;
  readonly code = 'SNAPSHOT_INTEGRITY_MISMATCH';
  readonly tamperedKey?: string;

  constructor(snapshotId: string, tamperedKey?: string) {
    super(
      tamperedKey
        ? `CalculatorSnapshot "${snapshotId}" failed SHA-256 cryptographic integrity verification on assumption key "${tamperedKey}". The stored payload does not match its seal.`
        : `CalculatorSnapshot "${snapshotId}" failed SHA-256 cryptographic integrity verification. The stored payload does not match its seal.`,
    );
    this.name = 'SnapshotIntegrityError';
    this.tamperedKey = tamperedKey;
  }
}

export interface AddressEnvelope {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyId: string;
  algorithm: 'aes-256-gcm';
}

export function computeSnapshotIntegrityHash(payload: {
  inputs: unknown;
  outputs: unknown;
  assumptions?: unknown;
  version: number;
  engineVersion?: number;
  createdByUid?: string | null;
}): string {
  if (payload.engineVersion !== undefined && payload.engineVersion >= 3) {
    const canonical = JSON.stringify({
      inputs: payload.inputs,
      outputs: payload.outputs,
      assumptions: payload.assumptions ?? {},
      version: payload.version,
      engineVersion: payload.engineVersion,
    });
    return crypto.createHash('sha256').update(canonical).digest('hex');
  }

  if (payload.engineVersion !== undefined && payload.engineVersion === 2) {
    const canonical = JSON.stringify({
      inputs: payload.inputs,
      outputs: payload.outputs,
      assumptions: payload.assumptions ?? {},
      version: payload.version,
      engineVersion: payload.engineVersion,
      createdByUid: payload.createdByUid ?? '',
    });
    return crypto.createHash('sha256').update(canonical).digest('hex');
  }

  const canonical = JSON.stringify({
    inputs: payload.inputs,
    outputs: payload.outputs,
    assumptions: payload.assumptions ?? {},
    version: payload.version,
    createdByUid: payload.createdByUid ?? '',
  });
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

export function encryptSnapshotAddress(
  address: string,
  userDek: Buffer,
  keyId = DEFAULT_KEY_ID,
): AddressEnvelope {
  const iv = crypto.randomBytes(GCM_IV_LENGTH_BYTES);
  const cipher = crypto.createCipheriv('aes-256-gcm', userDek, iv);
  const ciphertext = Buffer.concat([cipher.update(Buffer.from(address, 'utf8')), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    keyId,
    algorithm: 'aes-256-gcm',
  };
}
