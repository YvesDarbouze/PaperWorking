import fs from 'node:fs';
import path from 'node:path';
import {
  ENGINE_VERSION,
  type UnderwritingCalculatorInputs,
  type ReconciledUnderwritingMetrics,
} from '@paperworking/financial-engine';
import { getAdminFirestore, shouldAttemptFirestore } from '@/lib/firebase/admin';
import {
  ImmutableSnapshotError,
  SnapshotIntegrityError,
  computeSnapshotIntegrityHash,
  encryptSnapshotAddress,
  DEFAULT_KEY_ID,
  type AddressEnvelope,
} from './snapshot-crypto';

const SNAPSHOTS_COLLECTION = 'calculator_snapshots';

export type DataMode = 'firestore' | 'disk';

export function resolveDataMode(): DataMode {
  return shouldAttemptFirestore() ? 'firestore' : 'disk';
}

export function assertProductionBootEnv(): void {
  // Production persists calculator snapshots to Firestore; disk is dev/test only.
}

export {
  ENGINE_VERSION,
  ImmutableSnapshotError,
  SnapshotIntegrityError,
  computeSnapshotIntegrityHash,
};

export interface StoredCalculatorSnapshot {
  id: string;
  version: number;
  engineVersion: number;
  superseded: boolean;
  userId: string;
  organizationId?: string | null;
  projectId?: string | null;
  dealId?: string | null;
  source: 'deal_calculator' | 'project_underwriting' | 'calculator_handoff';
  calculatorVersion: string;
  inputs: UnderwritingCalculatorInputs & {
    address: string;
    addressEnvelope?: AddressEnvelope;
    [key: string]: unknown;
  };
  displayAddress?: string;
  outputs: ReconciledUnderwritingMetrics;
  assumptions: {
    propertyCondition?: string;
    submarketRating?: string;
    notes?: string;
    [key: string]: unknown;
  };
  integrityHash: string;
  createdAt: string;
}

function useFirestore(): boolean {
  return process.env.NODE_ENV === 'production' && shouldAttemptFirestore();
}

function sanitizeForFirestore<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeRecord(id: string, raw: Record<string, unknown>): StoredCalculatorSnapshot {
  const engineVersion = typeof raw.engineVersion === 'number' ? raw.engineVersion : 1;
  const inputs = (raw.inputs ?? {}) as StoredCalculatorSnapshot['inputs'];
  const displayAddress =
    (raw.displayAddress as string | undefined) || (inputs as { address?: string }).address;
  return {
    ...(raw as unknown as StoredCalculatorSnapshot),
    id,
    engineVersion,
    superseded: engineVersion < ENGINE_VERSION,
    displayAddress,
    inputs: {
      ...inputs,
      ...(displayAddress ? { address: displayAddress } : {}),
    },
  };
}

function getSnapshotsFilePath(): string {
  const override = process.env.CALCULATOR_SNAPSHOTS_FILE;
  if (override && override.trim()) {
    const overridePath = path.resolve(override.trim());
    const overrideDir = path.dirname(overridePath);
    if (!fs.existsSync(overrideDir)) {
      fs.mkdirSync(overrideDir, { recursive: true });
    }
    return overridePath;
  }

  const baseDir = process.cwd().endsWith('apps/web')
    ? process.cwd()
    : path.resolve(process.cwd(), 'apps/web');
  const dataDir = path.join(baseDir, '.data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, 'calculator-snapshots.json');
}

function assertDiskFallbackAllowed(): void {
  const nodeEnv = process.env.NODE_ENV;
  const dataMode = process.env.DATA_MODE?.toLowerCase().trim();

  if (nodeEnv === 'production' || dataMode === 'postgres') {
    throw new Error(
      '[snapshots-store] Disk storage fallback is strictly prohibited in production. Firestore persistence is required.',
    );
  }

  if (process.env.ALLOW_DISK_FALLBACK !== 'true') {
    throw new Error(
      '[snapshots-store] Disk snapshot storage is gated behind ALLOW_DISK_FALLBACK=true for offline development.',
    );
  }
}

function readDiskSnapshots(): StoredCalculatorSnapshot[] {
  assertDiskFallbackAllowed();
  try {
    const filePath = getSnapshotsFilePath();
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    if (!raw.trim()) return [];
    return JSON.parse(raw) as StoredCalculatorSnapshot[];
  } catch (err) {
    if (err instanceof Error && err.message.includes('[snapshots-store]')) {
      throw err;
    }
    console.warn('[snapshots-store] Failed to read snapshots from disk:', err);
    return [];
  }
}

function writeDiskSnapshots(snapshots: StoredCalculatorSnapshot[]): void {
  assertDiskFallbackAllowed();
  try {
    const filePath = getSnapshotsFilePath();
    fs.writeFileSync(filePath, JSON.stringify(snapshots, null, 2), 'utf-8');
  } catch (err) {
    if (err instanceof Error && err.message.includes('[snapshots-store]')) {
      throw err;
    }
    console.error('[snapshots-store] Failed to write snapshots to disk:', err);
  }
}

export function verifySnapshotIntegrity(snapshot: StoredCalculatorSnapshot): boolean {
  if (!snapshot.integrityHash) {
    return true;
  }

  let verifyInputs: unknown = snapshot.inputs;
  if (snapshot.engineVersion >= 3 && (snapshot.inputs as any)?.addressEnvelope) {
    verifyInputs = {
      ...snapshot.inputs,
      address: '[ENCRYPTED:use_user_dek]',
    };
  }

  const expectedHash = computeSnapshotIntegrityHash({
    inputs: verifyInputs,
    outputs: snapshot.outputs,
    assumptions: snapshot.assumptions ?? {},
    version: snapshot.version,
    engineVersion: snapshot.engineVersion,
    createdByUid: snapshot.userId,
  });
  return expectedHash === snapshot.integrityHash;
}

export function assertSnapshotIntegrity(
  snapshot: StoredCalculatorSnapshot,
  baseline?: {
    inputs?: Record<string, unknown>;
    assumptions?: Record<string, unknown>;
  },
): void {
  if (!snapshot.integrityHash) return;
  const ok = verifySnapshotIntegrity(snapshot);
  if (!ok) {
    let tamperedKey: string | undefined;
    if (baseline?.assumptions && typeof snapshot.assumptions === 'object' && snapshot.assumptions !== null) {
      for (const [key, baseVal] of Object.entries(baseline.assumptions)) {
        if (JSON.stringify((snapshot.assumptions as any)[key]) !== JSON.stringify(baseVal)) {
          tamperedKey = key;
          break;
        }
      }
    }
    if (!tamperedKey && baseline?.inputs && typeof snapshot.inputs === 'object' && snapshot.inputs !== null) {
      for (const [key, baseVal] of Object.entries(baseline.inputs)) {
        if (JSON.stringify((snapshot.inputs as any)[key]) !== JSON.stringify(baseVal)) {
          tamperedKey = key;
          break;
        }
      }
    }
    throw new SnapshotIntegrityError(snapshot.id, tamperedKey);
  }
}

type SaveInput = Omit<
  StoredCalculatorSnapshot,
  'id' | 'createdAt' | 'userId' | 'version' | 'engineVersion' | 'superseded' | 'integrityHash'
> & {
  id?: string;
  version?: number;
  engineVersion?: number;
  integrityHash?: string;
  auditContext?: {
    actorRole?: string;
    isSuperseding?: boolean;
    previousSnapshotId?: string;
    ipAddress?: string;
    userAgent?: string;
  };
};

function buildSnapshot(
  userId: string,
  data: SaveInput,
  version: number,
): StoredCalculatorSnapshot {
  const targetEngineVersion = data.engineVersion ?? ENGINE_VERSION;
  const rawAddress = String((data.inputs as any)?.address || '').trim();
  const assumptions = data.assumptions ?? {};
  const superseded = targetEngineVersion < ENGINE_VERSION;

  let sealedInputs = { ...data.inputs };
  if (targetEngineVersion >= 3 && rawAddress) {
    if (!(data.inputs as any).addressEnvelope) {
      const devDek = Buffer.from(
        '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        'hex',
      );
      const addressEnvelope = encryptSnapshotAddress(rawAddress, devDek, DEFAULT_KEY_ID);
      sealedInputs = {
        ...data.inputs,
        addressEnvelope,
        address: '[ENCRYPTED:use_user_dek]',
      };
    }
  }

  const integrityHash =
    data.integrityHash ||
    computeSnapshotIntegrityHash({
      inputs: sealedInputs,
      outputs: data.outputs,
      assumptions,
      version,
      engineVersion: targetEngineVersion,
      createdByUid: userId,
    });

  return {
    id: data.id || `snap-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    version,
    engineVersion: targetEngineVersion,
    superseded,
    userId,
    organizationId: data.organizationId ?? null,
    projectId: data.projectId ?? null,
    dealId: data.dealId ?? null,
    source: data.source ?? 'deal_calculator',
    calculatorVersion: data.calculatorVersion ?? '1.0.0',
    inputs: {
      ...sealedInputs,
      address: rawAddress || (sealedInputs as any).address,
    } as any,
    displayAddress: rawAddress,
    outputs: data.outputs,
    assumptions,
    integrityHash,
    createdAt: new Date().toISOString(),
  };
}

async function saveToFirestore(userId: string, data: SaveInput): Promise<StoredCalculatorSnapshot> {
  const db = getAdminFirestore();
  const collection = db.collection(SNAPSHOTS_COLLECTION);
  const existing = await collection.where('userId', '==', userId).get();
  const version = data.version ?? existing.size + 1;
  const snapshot = buildSnapshot(userId, data, version);
  await collection.doc(snapshot.id).set(sanitizeForFirestore(snapshot));
  return snapshot;
}

async function listFromFirestore(
  userId: string,
  organizationId?: string,
  options?: { excludeSuperseded?: boolean },
): Promise<StoredCalculatorSnapshot[]> {
  const db = getAdminFirestore();
  const docs = await db.collection(SNAPSHOTS_COLLECTION).where('userId', '==', userId).get();
  const mapped = docs.docs.map((doc) => normalizeRecord(doc.id, doc.data()));

  const filtered = mapped.filter((s) => {
    if (organizationId && s.organizationId && s.organizationId !== organizationId) return false;
    if (options?.excludeSuperseded && s.superseded) return false;
    return true;
  });

  for (const snapshot of filtered) {
    if (!verifySnapshotIntegrity(snapshot)) {
      throw new SnapshotIntegrityError(snapshot.id);
    }
  }

  return filtered.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function saveCalculatorSnapshot(
  userId: string,
  data: SaveInput,
): Promise<StoredCalculatorSnapshot> {
  if (useFirestore()) {
    return saveToFirestore(userId, data);
  }

  assertDiskFallbackAllowed();
  const diskSnapshots = readDiskSnapshots();
  const userSnapshots = diskSnapshots.filter((s) => s.userId === userId);
  const version = data.version ?? userSnapshots.length + 1;
  const snapshot = buildSnapshot(userId, data, version);

  diskSnapshots.unshift(snapshot);
  writeDiskSnapshots(diskSnapshots);
  return snapshot;
}

export async function getCalculatorSnapshots(
  userId: string,
  organizationId?: string,
  options?: { excludeSuperseded?: boolean },
): Promise<StoredCalculatorSnapshot[]> {
  if (useFirestore()) {
    return listFromFirestore(userId, organizationId, options);
  }

  assertDiskFallbackAllowed();
  const diskSnapshots = readDiskSnapshots();
  const filtered = diskSnapshots.filter((s) => {
    if (s.userId !== userId) return false;
    if (organizationId && s.organizationId && s.organizationId !== organizationId) return false;
    return true;
  });

  const mapped: StoredCalculatorSnapshot[] = filtered.map((s) => {
    const engineVersion = typeof s.engineVersion === 'number' ? s.engineVersion : 1;
    const superseded = engineVersion < ENGINE_VERSION;
    const displayAddress = s.displayAddress || (s.inputs as any)?.address;
    return {
      ...s,
      engineVersion,
      superseded,
      displayAddress,
      inputs: {
        ...s.inputs,
        ...(displayAddress ? { address: displayAddress } : {}),
      },
    };
  });

  for (const s of mapped) {
    if (!verifySnapshotIntegrity(s)) {
      throw new SnapshotIntegrityError(s.id);
    }
  }

  const result = options?.excludeSuperseded ? mapped.filter((s) => !s.superseded) : mapped;

  return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getCalculatorSnapshotById(
  userId: string,
  snapshotId: string,
): Promise<StoredCalculatorSnapshot | null> {
  const snapshots = await getCalculatorSnapshots(userId);
  const found = snapshots.find((s) => s.id === snapshotId);
  return found || null;
}

export async function updateCalculatorSnapshot(
  snapshotId: string,
  _data?: unknown,
): Promise<never> {
  throw new ImmutableSnapshotError(snapshotId);
}

/** Reset disk store for test isolation */
export function _resetSnapshotsStoreForTesting(): void {
  if (!useFirestore()) {
    writeDiskSnapshots([]);
  }
}
