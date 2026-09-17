import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';
import type { ReconciledUnderwritingMetrics } from '@paperworking/financial-engine';
import {
  GET as getSnapshots,
  POST as postSnapshot,
  PUT as putSnapshot,
  PATCH as patchSnapshot,
} from '../../app/api/calculator/snapshots/route';
import {
  saveCalculatorSnapshot,
  getCalculatorSnapshots,
  updateCalculatorSnapshot,
  verifySnapshotIntegrity,
  computeSnapshotIntegrityHash,
  ImmutableSnapshotError,
  SnapshotIntegrityError,
  type StoredCalculatorSnapshot,
  _resetSnapshotsStoreForTesting,
} from '../../lib/calculator/snapshots-store';

describe('Calculator Snapshot Persistence, Immutability & Integrity', () => {
  const testUserId = 'user-persistence-tester';
  const testOrgId = 'org-alphavest-capital';

  const baseDir = process.cwd().endsWith('apps/web')
    ? process.cwd()
    : path.resolve(process.cwd(), 'apps/web');
  const diskFilePath = path.join(baseDir, '.data', 'calculator-snapshots.json');

  beforeEach(() => {
    process.env.TEST_AUTH_UID = testUserId;
    process.env.ALLOW_DISK_FALLBACK = 'true';
    _resetSnapshotsStoreForTesting();
  });

  afterEach(() => {
    _resetSnapshotsStoreForTesting();
  });

  const samplePayload = {
    inputs: {
      address: '742 Evergreen Terrace, Springfield, OR 97477',
      purchasePrice: 350000,
      arv: 475000,
      rehabBudget: 45000,
      grossRentMonthly: 3200,
      operatingExpenseRatioPct: 35,
      financingType: 'conventional' as const,
      loanToValuePct: 75,
      interestRatePct: 6.5,
      loanTermYears: 30,
    },
    outputs: {
      totalCostBasis: 405500,
      initialEquityInvested: 103000,
      netOperatingIncomeAnnual: 24960,
      annualDebtService: 19920,
      netCashFlowAnnual: 5040,
      capRateOnCost: 6.16,
      cashOnCashReturnPct: 4.89,
      projectedIrrPct: 14.8,
      dscr: 1.25,
      breakEvenOccupancyPct: 72.5,
      grossRentMultiplier: 9.11,
      equityMultiple: 1.85,
    } as unknown as ReconciledUnderwritingMetrics,
    assumptions: {
      holdPeriodYears: 5,
      annualAppreciationPct: 3.5,
      sellingCostsPct: 6.0,
      propertyCondition: 'Class B Value-Add',
    },
  };

  describe('1. SHA-256 Cryptographic Integrity Seal', () => {
    it('generates a deterministic SHA-256 hash sealing inputs, outputs, assumptions, and version', async () => {
      const snapshot = await saveCalculatorSnapshot(testUserId, {
        ...samplePayload,
        organizationId: testOrgId,
        source: 'deal_calculator',
        calculatorVersion: '1.0.0',
      });

      expect(snapshot.engineVersion).toBe(4);
      expect(snapshot.superseded).toBe(false);
      expect(snapshot.integrityHash).toBeDefined();
      expect(snapshot.integrityHash).toMatch(/^[a-f0-9]{64}$/);

      const expectedHash = computeSnapshotIntegrityHash({
        inputs: {
          ...snapshot.inputs,
          address: '[ENCRYPTED:use_user_dek]',
        },
        outputs: snapshot.outputs,
        assumptions: snapshot.assumptions,
        version: snapshot.version,
        engineVersion: snapshot.engineVersion,
      });

      expect(snapshot.integrityHash).toBe(expectedHash);
      expect(verifySnapshotIntegrity(snapshot)).toBe(true);
    });

    it('detects tampering and throws SnapshotIntegrityError upon retrieval', async () => {
      await saveCalculatorSnapshot(testUserId, {
        ...samplePayload,
        source: 'deal_calculator',
        calculatorVersion: '1.0.0',
      });

      // Directly tamper with the persisted disk file (corrupting data without valid hash)
      expect(fs.existsSync(diskFilePath)).toBe(true);
      const diskData = JSON.parse(fs.readFileSync(diskFilePath, 'utf-8')) as StoredCalculatorSnapshot[];
      expect(diskData.length).toBeGreaterThan(0);

      // Fraudulently inflate purchasePrice from $350k to $950k without re-hashing
      (diskData[0].inputs as any).purchasePrice = 950000;
      fs.writeFileSync(diskFilePath, JSON.stringify(diskData, null, 2), 'utf-8');

      // Retrieval must detect SHA-256 mismatch and reject
      await expect(getCalculatorSnapshots(testUserId)).rejects.toThrow(SnapshotIntegrityError);
    });
  });

  describe('2. Strict Immutability Guard', () => {
    it('rejects code-level mutations by throwing ImmutableSnapshotError', async () => {
      const snapshot = await saveCalculatorSnapshot(testUserId, {
        ...samplePayload,
        source: 'deal_calculator',
        calculatorVersion: '1.0.0',
      });

      await expect(updateCalculatorSnapshot(snapshot.id, { purchasePrice: 400000 })).rejects.toThrow(
        ImmutableSnapshotError,
      );

      try {
        await updateCalculatorSnapshot(snapshot.id, { notes: 'trying to update' });
      } catch (err: any) {
        expect(err).toBeInstanceOf(ImmutableSnapshotError);
        expect(err.statusCode).toBe(405);
        expect(err.code).toBe('IMMUTABLE_SNAPSHOT_ERROR');
        expect(err.message).toContain(snapshot.id);
      }
    });

    it('rejects PUT and PATCH requests via API route with HTTP 405 Method Not Allowed', async () => {
      const reqPut = new Request('http://localhost:3000/api/calculator/snapshots', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'snap-12345', purchasePrice: 500000 }),
      });
      const resPut = await putSnapshot(reqPut);
      expect(resPut.status).toBe(405);
      const jsonPut = await resPut.json();
      expect(jsonPut.code).toBe('IMMUTABLE_SNAPSHOT_ERROR');

      const reqPatch = new Request('http://localhost:3000/api/calculator/snapshots', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'snap-12345', notes: 'patched notes' }),
      });
      const resPatch = await patchSnapshot(reqPatch);
      expect(resPatch.status).toBe(405);
      const jsonPatch = await resPatch.json();
      expect(jsonPatch.code).toBe('IMMUTABLE_SNAPSHOT_ERROR');
    });
  });

  describe('3. Restart Persistence & Storage Scoping', () => {
    it('persists snapshots to disk and recovers them accurately across cold re-reads', async () => {
      // Step 1: POST snapshot via API
      const req = new Request('http://localhost:3000/api/calculator/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...samplePayload,
          organizationId: testOrgId,
        }),
      });
      const postRes = await postSnapshot(req);
      expect(postRes.status).toBe(201);
      const { snapshot: saved } = await postRes.json();
      expect(saved.id).toBeDefined();

      // Step 2: Verify snapshot exists on disk
      expect(fs.existsSync(diskFilePath)).toBe(true);

      // Step 3: Cold reload via GET (reads directly from persisted storage)
      const getRes = await getSnapshots(new Request('http://localhost:3000/api/calculator/snapshots'));
      expect(getRes.status).toBe(200);
      const { snapshots } = await getRes.json();

      expect(snapshots.length).toBe(1);
      expect(snapshots[0].id).toBe(saved.id);
      expect(snapshots[0].inputs.address).toBe('742 Evergreen Terrace, Springfield, OR 97477');
      expect(snapshots[0].outputs.capRateOnCost).toBe(6.16);
      expect(snapshots[0].integrityHash).toBe(saved.integrityHash);

      // Step 4: Verify organization-scoped retrieval
      const getOrgReq = new Request(
        `http://localhost:3000/api/calculator/snapshots?organizationId=${testOrgId}`,
      );
      const getOrgRes = await getSnapshots(getOrgReq);
      const { snapshots: orgSnapshots } = await getOrgRes.json();
      expect(orgSnapshots.length).toBe(1);
      expect(orgSnapshots[0].id).toBe(saved.id);

      // Step 5: Query for a different non-matching organization -> 403 Forbidden (Review C2.2/H-16)
      const getOtherOrgReq = new Request(
        'http://localhost:3000/api/calculator/snapshots?organizationId=org-other-team',
      );
      const getOtherOrgRes = await getSnapshots(getOtherOrgReq);
      expect(getOtherOrgRes.status).toBe(403);
      const otherJson = await getOtherOrgRes.json();
      expect(otherJson.code).toBe('FORBIDDEN_ORG_MEMBERSHIP');
    });

    it('enforces user scoping so users cannot access each other snapshots', async () => {
      // Save snapshot for testUserId
      await saveCalculatorSnapshot(testUserId, {
        ...samplePayload,
        source: 'deal_calculator',
        calculatorVersion: '1.0.0',
      });

      // Query as different user
      process.env.TEST_AUTH_UID = 'user-unauthorized-party';
      const unauthorizedGet = await getSnapshots(new Request('http://localhost:3000/api/calculator/snapshots'));
      const { snapshots } = await unauthorizedGet.json();
      expect(snapshots.length).toBe(0);
    });
  });

  describe('4. Engine Versioning & Superseded-Record Policy', () => {
    it('accurately seals v3 records (superseded: false) and identifies v1 and v2 legacy records as superseded (superseded: true)', async () => {
      // 1. Create a legacy v1 snapshot (simulating pre-DCF snapshot like snap-mtw1xydy-xlq1)
      const v1Snapshot = await saveCalculatorSnapshot(testUserId, {
        id: 'snap-v1-legacy-proof',
        ...samplePayload,
        engineVersion: 1,
        source: 'deal_calculator',
        calculatorVersion: '1.0.0',
      });

      expect(v1Snapshot.engineVersion).toBe(1);
      expect(v1Snapshot.superseded).toBe(true);
      expect(verifySnapshotIntegrity(v1Snapshot)).toBe(true);

      // 2. Create a legacy v2 snapshot (simulating DCF v2 snapshot before crypto-shredding)
      const v2Snapshot = await saveCalculatorSnapshot(testUserId, {
        id: 'snap-v2-legacy-proof',
        ...samplePayload,
        engineVersion: 2,
        source: 'deal_calculator',
        calculatorVersion: '2.0.0',
      });

      expect(v2Snapshot.engineVersion).toBe(2);
      expect(v2Snapshot.superseded).toBe(true);
      expect(verifySnapshotIntegrity(v2Snapshot)).toBe(true);

      // 3. Create a modern v4 snapshot
      const v4Snapshot = await saveCalculatorSnapshot(testUserId, {
        id: 'snap-v4-dcf-active',
        ...samplePayload,
        source: 'deal_calculator',
        calculatorVersion: '4.0.0',
      });

      expect(v4Snapshot.engineVersion).toBe(4);
      expect(v4Snapshot.superseded).toBe(false);
      expect(verifySnapshotIntegrity(v4Snapshot)).toBe(true);

      // 4. Retrieve all snapshots without excludeSuperseded: returns all 3 records
      const allRes = await getSnapshots(new Request('http://localhost:3000/api/calculator/snapshots'));
      expect(allRes.status).toBe(200);
      const { snapshots: allSnapshots } = await allRes.json();
      expect(allSnapshots.length).toBe(3);

      const retrievedV1 = allSnapshots.find((s: StoredCalculatorSnapshot) => s.id === 'snap-v1-legacy-proof');
      const retrievedV2 = allSnapshots.find((s: StoredCalculatorSnapshot) => s.id === 'snap-v2-legacy-proof');
      const retrievedV4 = allSnapshots.find((s: StoredCalculatorSnapshot) => s.id === 'snap-v4-dcf-active');

      expect(retrievedV1).toBeDefined();
      expect(retrievedV1.engineVersion).toBe(1);
      expect(retrievedV1.superseded).toBe(true);

      expect(retrievedV2).toBeDefined();
      expect(retrievedV2.engineVersion).toBe(2);
      expect(retrievedV2.superseded).toBe(true);

      expect(retrievedV4).toBeDefined();
      expect(retrievedV4.engineVersion).toBe(4);
      expect(retrievedV4.superseded).toBe(false);

      // 5. Retrieve snapshots with excludeSuperseded=true (or lineage=true): filters out v1 and v2
      const lineageRes = await getSnapshots(
        new Request('http://localhost:3000/api/calculator/snapshots?excludeSuperseded=true'),
      );
      expect(lineageRes.status).toBe(200);
      const { snapshots: lineageSnapshots } = await lineageRes.json();
      expect(lineageSnapshots.length).toBe(1);
      expect(lineageSnapshots[0].id).toBe('snap-v4-dcf-active');
      expect(lineageSnapshots[0].superseded).toBe(false);

      // Also verify ?lineage=true alias behaves identically
      const aliasRes = await getSnapshots(
        new Request('http://localhost:3000/api/calculator/snapshots?lineage=true'),
      );
      expect(aliasRes.status).toBe(200);
      const { snapshots: aliasSnapshots } = await aliasRes.json();
      expect(aliasSnapshots.length).toBe(1);
      expect(aliasSnapshots[0].id).toBe('snap-v4-dcf-active');
    });

    it('rejects tampering on historical v1 snapshots', async () => {
      await saveCalculatorSnapshot(testUserId, {
        id: 'snap-v1-tamper-target',
        ...samplePayload,
        engineVersion: 1,
        source: 'deal_calculator',
        calculatorVersion: '1.0.0',
      });

      // Tamper on disk
      const diskData = JSON.parse(fs.readFileSync(diskFilePath, 'utf-8')) as StoredCalculatorSnapshot[];
      const target = diskData.find((s) => s.id === 'snap-v1-tamper-target');
      expect(target).toBeDefined();
      (target!.outputs as any).projectedIrrPct = 99.9; // Tamper output without updating SHA
      fs.writeFileSync(diskFilePath, JSON.stringify(diskData, null, 2), 'utf-8');

      // Querying should detect cryptographic mismatch
      await expect(getCalculatorSnapshots(testUserId)).rejects.toThrow(SnapshotIntegrityError);
    });
  });
});
