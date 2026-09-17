import fs from 'node:fs';
import path from 'node:path';
import {
  ENGINE_VERSION,
  type UnderwritingCalculatorInputs,
  type ReconciledUnderwritingMetrics,
} from '@paperworking/financial-engine';
import {
  ImmutableSnapshotError,
  SnapshotIntegrityError,
  computeSnapshotIntegrityHash,
  encryptSnapshotAddress,
  DEFAULT_KEY_ID,
  type AddressEnvelope,
} from './snapshot-crypto';

export type DataMode = 'disk';

export function resolveDataMode(): DataMode {
  return 'disk';
}

export function assertProductionBootEnv(): void {
  // Firestore-only v0 port: calculator snapshots are persisted to the gated disk fallback.
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

function getSnapshotsFilePath(): string {
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
      '[snapshots-store] Disk storage fallback is strictly prohibited in production and postgres mode. PostgreSQL connection (DATABASE_URL) is required.',
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

function hasDatabase(): boolean {
  return false;
}

function getPrismaRepository(): any {
  return null;
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

export async function saveCalculatorSnapshot(
  userId: string,
  data: Omit<StoredCalculatorSnapshot, 'id' | 'createdAt' | 'userId' | 'version' | 'engineVersion' | 'superseded' | 'integrityHash'> & {
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
  },
): Promise<StoredCalculatorSnapshot> {
  const repo = getPrismaRepository();
  const targetEngineVersion = data.engineVersion ?? ENGINE_VERSION;
  const rawAddress = String((data.inputs as any)?.address || '').trim();

  if (repo) {
    const { snapshot: created } = await repo.createWithTransactionalAudit(
      {
        id: data.id,
        projectId: data.projectId ?? undefined,
        dealId: data.dealId ?? undefined,
        organizationId: data.organizationId ?? undefined,
        version: data.version,
        engineVersion: targetEngineVersion,
        inputs: data.inputs as unknown as Record<string, unknown>,
        outputs: data.outputs as unknown as Record<string, unknown>,
        assumptions: data.assumptions as unknown as Record<string, unknown>,
        calculatorVersion: data.calculatorVersion ?? '1.0.0',
        source: data.source ?? 'deal_calculator',
        createdByUid: userId,
      },
      {
        actorUid: userId,
        actorRole: data.auditContext?.actorRole,
        organizationId: data.organizationId ?? undefined,
        isSuperseding: data.auditContext?.isSuperseding,
        previousSnapshotId: data.auditContext?.previousSnapshotId,
        ipAddress: data.auditContext?.ipAddress,
        userAgent: data.auditContext?.userAgent,
        displayAddress: rawAddress,
      },
    );

    const displayAddress = created.identityMapping?.displayAddress || rawAddress;
    const inputs = {
      ...created.inputs,
      ...(displayAddress ? { address: displayAddress } : {}),
    };

    const snapshot: StoredCalculatorSnapshot = {
      id: created.id,
      version: created.version,
      engineVersion: created.engineVersion,
      superseded: created.superseded,
      userId: created.createdByUid ?? userId,
      organizationId: created.organizationId,
      projectId: created.projectId,
      dealId: created.dealId,
      source: (created.source as any) ?? 'deal_calculator',
      calculatorVersion: created.calculatorVersion,
      inputs: inputs as any,
      displayAddress,
      outputs: created.outputs as any,
      assumptions: (created.assumptions as any) ?? {},
      integrityHash: created.integrityHash,
      createdAt: created.createdAt.toISOString(),
    };

    return snapshot;
  }

  // Disk-backed persistence for local dev / testing (strictly gated)
  assertDiskFallbackAllowed();
  const diskSnapshots = readDiskSnapshots();
  const userSnapshots = diskSnapshots.filter((s) => s.userId === userId);
  const version = data.version ?? (userSnapshots.length + 1);
  const snapshotId =
    data.id || `snap-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const assumptions = data.assumptions ?? {};
  const superseded = targetEngineVersion < ENGINE_VERSION;

  let sealedInputs = { ...data.inputs };
  let addressEnvelope: AddressEnvelope | undefined;

  if (targetEngineVersion >= 3 && rawAddress) {
    if (!(data.inputs as any).addressEnvelope) {
      const devDek = Buffer.from(
        '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        'hex',
      );
      addressEnvelope = encryptSnapshotAddress(rawAddress, devDek, DEFAULT_KEY_ID);
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

  const snapshot: StoredCalculatorSnapshot = {
    id: snapshotId,
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

  diskSnapshots.unshift(snapshot);
  writeDiskSnapshots(diskSnapshots);
  return snapshot;
}

export async function getCalculatorSnapshots(
  userId: string,
  organizationId?: string,
  options?: { excludeSuperseded?: boolean },
): Promise<StoredCalculatorSnapshot[]> {
  const repo = getPrismaRepository();

  if (repo) {
    const records = await repo.findMany({
      createdByUid: userId,
      organizationId: organizationId ?? undefined,
      excludeSuperseded: options?.excludeSuperseded,
    });

    return records.map((r: any) => {
      const displayAddress = r.identityMapping?.displayAddress || (r.inputs as any)?.address;
      const inputs = {
        ...r.inputs,
        ...(displayAddress ? { address: displayAddress } : {}),
      };
      return {
        id: r.id,
        version: r.version,
        engineVersion: r.engineVersion,
        superseded: r.superseded,
        userId: r.createdByUid ?? userId,
        organizationId: r.organizationId,
        projectId: r.projectId,
        dealId: r.dealId,
        source: (r.source as any) ?? 'deal_calculator',
        calculatorVersion: r.calculatorVersion,
        inputs: inputs as any,
        displayAddress,
        outputs: r.outputs as any,
        assumptions: (r.assumptions as any) ?? {},
        integrityHash: r.integrityHash,
        createdAt: r.createdAt.toISOString(),
      };
    });
  }

  // Disk-backed retrieval (strictly gated)
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

  // Verify integrity of each retrieved record
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
  writeDiskSnapshots([]);
}
