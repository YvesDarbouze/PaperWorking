import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';
import {
  PUT as putSnapshot,
  PATCH as patchSnapshot,
} from '../../app/api/calculator/snapshots/route';
import {
  saveCalculatorSnapshot,
  getCalculatorSnapshots,
  updateCalculatorSnapshot,
  verifySnapshotIntegrity,
  ImmutableSnapshotError,
  SnapshotIntegrityError,
  type StoredCalculatorSnapshot,
  _resetSnapshotsStoreForTesting,
} from '../../lib/calculator/snapshots-store';

describe('Calculator Snapshot Multi-Process Restart Persistence & Immutability Integration Test', () => {
  const testUserId = 'user-persistence-tester';
  const testOrgId = 'org-alphavest-capital';

  const webRoot = process.cwd().endsWith('apps/web')
    ? process.cwd()
    : path.resolve(process.cwd(), 'apps/web');
  const diskFilePath = path.join(webRoot, '.data', 'calculator-snapshots.json');

  beforeEach(() => {
    process.env.TEST_AUTH_UID = testUserId;
    process.env.ALLOW_DISK_FALLBACK = 'true';
    _resetSnapshotsStoreForTesting();
  });

  afterEach(() => {
    _resetSnapshotsStoreForTesting();
  });

  const canonicalPayload = {
    organizationId: testOrgId,
    source: 'deal_calculator' as const,
    calculatorVersion: '3.0.0',
    inputs: {
      address: '1247 Elm Street, Austin, TX 78702',
      purchasePrice: 520000,
      arv: 680000,
      rehabBudget: 59800,
      grossRentMonthly: 5200,
      operatingExpenseRatioPct: 33.88,
      financingType: 'conventional' as const,
      loanToValuePct: 75,
      interestRatePct: 6.5,
      loanTermYears: 30,
    },
    outputs: {
      totalCostBasis: 595400,
      initialEquityInvested: 205400,
      netOperatingIncomeAnnual: 38138,
      annualDebtService: 29580,
      netCashFlowAnnual: 8558,
      capRateOnCost: 6.4,
      cashOnCashReturnPct: 4.2,
      projectedIrrPct: 3.8,
      dscr: 1.29,
      breakEvenOccupancyPct: 74.2,
      grossRentMultiplier: 8.33,
      equityMultiple: 1.48,
    } as any,
    assumptions: {
      holdPeriodYears: 5,
      annualAppreciationPct: 3.0,
      sellingCostsPct: 6.0,
      notes: 'Canonical True DCF Projected IRR Underwriting',
    },
  };

  it('1. proves restart-persistence: Process 1 saves a snapshot and exits; Process 2 recovers it from disk after cold boot', () => {
    // -------------------------------------------------------------------------
    // PROCESS 1: Save snapshot and terminate
    // -------------------------------------------------------------------------
    const process1Script = `
      import { saveCalculatorSnapshot } from './lib/calculator/snapshots-store.ts';
      async function main() {
        const saved = await saveCalculatorSnapshot('${testUserId}', ${JSON.stringify(canonicalPayload)});
        process.stdout.write(JSON.stringify({ id: saved.id, hash: saved.integrityHash, irr: saved.outputs.projectedIrrPct }));
      }
      main().catch(err => { console.error(err); process.exit(1); });
    `;

    const proc1 = spawnSync('node', ['--import', 'tsx', '--input-type=module', '-e', process1Script], {
      cwd: webRoot,
      encoding: 'utf-8',
      env: { ...process.env, ALLOW_DISK_FALLBACK: 'true', TEST_AUTH_UID: testUserId },
    });

    expect(proc1.status).toBe(0);
    const proc1Result = JSON.parse(proc1.stdout.trim().split('\n').pop()!);
    expect(proc1Result.id).toBeDefined();
    expect(proc1Result.irr).toBe(3.8);

    // Verify disk file exists and has size
    expect(fs.existsSync(diskFilePath)).toBe(true);
    expect(fs.statSync(diskFilePath).size).toBeGreaterThan(0);

    // -------------------------------------------------------------------------
    // PROCESS 2: Boot fresh process (cold restart) and query back from disk
    // -------------------------------------------------------------------------
    const process2Script = `
      import { getCalculatorSnapshots, verifySnapshotIntegrity } from './lib/calculator/snapshots-store.ts';
      async function main() {
        const list = await getCalculatorSnapshots('${testUserId}');
        if (!list || list.length === 0) {
          throw new Error('No snapshots found after cold boot');
        }
        const item = list[0];
        const sealValid = verifySnapshotIntegrity(item);
        process.stdout.write(JSON.stringify({
          count: list.length,
          id: item.id,
          capRate: item.outputs.capRateOnCost,
          coc: item.outputs.cashOnCashReturnPct,
          irr: item.outputs.projectedIrrPct,
          sealValid,
        }));
      }
      main().catch(err => { console.error(err); process.exit(1); });
    `;

    const proc2 = spawnSync('node', ['--import', 'tsx', '--input-type=module', '-e', process2Script], {
      cwd: webRoot,
      encoding: 'utf-8',
      env: { ...process.env, ALLOW_DISK_FALLBACK: 'true', TEST_AUTH_UID: testUserId },
    });

    expect(proc2.status).toBe(0);
    const proc2Result = JSON.parse(proc2.stdout.trim().split('\n').pop()!);
    expect(proc2Result.count).toBe(1);
    expect(proc2Result.id).toBe(proc1Result.id);
    expect(proc2Result.capRate).toBe(6.4);
    expect(proc2Result.coc).toBe(4.2);
    expect(proc2Result.irr).toBe(3.8);
    expect(proc2Result.sealValid).toBe(true);
  });

  it('2. proves immutability: attempts to update or mutate a persisted snapshot are rejected with 405 Method Not Allowed', async () => {
    const saved = await saveCalculatorSnapshot(testUserId, canonicalPayload);
    expect(saved.id).toBeDefined();

    // 1. Direct function call rejection
    await expect(updateCalculatorSnapshot(saved.id, { purchasePrice: 999999 })).rejects.toThrow(
      ImmutableSnapshotError,
    );

    // 2. HTTP PUT API route rejection
    const putReq = new Request('http://localhost:3000/api/calculator/snapshots', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: saved.id, purchasePrice: 999999 }),
    });
    const putRes = await putSnapshot(putReq);
    expect(putRes.status).toBe(405);
    const putBody = await putRes.json();
    expect(putBody.code).toBe('IMMUTABLE_SNAPSHOT_ERROR');

    // 3. HTTP PATCH API route rejection
    const patchReq = new Request('http://localhost:3000/api/calculator/snapshots', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: saved.id, notes: 'attempted patch' }),
    });
    const patchRes = await patchSnapshot(patchReq);
    expect(patchRes.status).toBe(405);
    const patchBody = await patchRes.json();
    expect(patchBody.code).toBe('IMMUTABLE_SNAPSHOT_ERROR');
  });

  it('3. proves tamper detection: altering persisted data without re-signing fails cryptographic verification', async () => {
    const saved = await saveCalculatorSnapshot(testUserId, canonicalPayload);
    expect(saved.id).toBeDefined();

    // Tamper with persisted file on disk directly
    const diskContent = JSON.parse(fs.readFileSync(diskFilePath, 'utf-8')) as StoredCalculatorSnapshot[];
    expect(diskContent.length).toBe(1);
    (diskContent[0].outputs as any).projectedIrrPct = 99.9; // Fraudulent IRR
    fs.writeFileSync(diskFilePath, JSON.stringify(diskContent, null, 2), 'utf-8');

    // Retrieval in fresh query detects SHA-256 seal mismatch
    await expect(getCalculatorSnapshots(testUserId)).rejects.toThrow(SnapshotIntegrityError);
  });

  it('4. proves API route layer restart-persistence and immutability across separate child processes', () => {
    // -------------------------------------------------------------------------
    // SUBPROCESS A: Invoke POST route handler in isolated process
    // -------------------------------------------------------------------------
    const scriptA = `
      import { POST } from './app/api/calculator/snapshots/route.ts';
      async function main() {
        const req = new Request('http://localhost:3000/api/calculator/snapshots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(${JSON.stringify(canonicalPayload)}),
        });
        const res = await POST(req);
        const data = await res.json();
        process.stdout.write(JSON.stringify({ status: res.status, snapshotId: data.snapshot?.id, data }));
      }
      main().catch(err => { console.error(err); process.exit(1); });
    `;

    const procA = spawnSync('node', ['--import', 'tsx', '--input-type=module', '-e', scriptA], {
      cwd: webRoot,
      encoding: 'utf-8',
      env: { ...process.env, ALLOW_DISK_FALLBACK: 'true', TEST_AUTH_UID: testUserId, TEST_AUTH_ORG: testOrgId },
    });
    expect(procA.status).toBe(0);
    const resultA = JSON.parse(procA.stdout.trim().split('\n').pop()!);
    expect(resultA.status).toBe(201);
    expect(resultA.snapshotId).toBeDefined();

    // -------------------------------------------------------------------------
    // SUBPROCESS B: Cold process attempts PUT mutation via API route handler
    // -------------------------------------------------------------------------
    const scriptB = `
      import { PUT } from './app/api/calculator/snapshots/route.ts';
      async function main() {
        const req = new Request('http://localhost:3000/api/calculator/snapshots', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: '${resultA.snapshotId}', purchasePrice: 999999 }),
        });
        const res = await PUT(req);
        const data = await res.json();
        process.stdout.write(JSON.stringify({ status: res.status, code: data.code }));
      }
      main().catch(err => { console.error(err); process.exit(1); });
    `;

    const procB = spawnSync('node', ['--import', 'tsx', '--input-type=module', '-e', scriptB], {
      cwd: webRoot,
      encoding: 'utf-8',
      env: { ...process.env, ALLOW_DISK_FALLBACK: 'true', TEST_AUTH_UID: testUserId, TEST_AUTH_ORG: testOrgId },
    });
    expect(procB.status).toBe(0);
    const resultB = JSON.parse(procB.stdout.trim().split('\n').pop()!);
    expect(resultB.status).toBe(405);
    expect(resultB.code).toBe('IMMUTABLE_SNAPSHOT_ERROR');

    // -------------------------------------------------------------------------
    // SUBPROCESS C: Fresh cold process queries GET route handler after reboot
    // -------------------------------------------------------------------------
    const scriptC = `
      import { GET } from './app/api/calculator/snapshots/route.ts';
      async function main() {
        const req = new Request('http://localhost:3000/api/calculator/snapshots?organizationId=${testOrgId}');
        const res = await GET(req);
        const data = await res.json();
        process.stdout.write(JSON.stringify({
          status: res.status,
          count: data.snapshots?.length,
          recoveredId: data.snapshots?.[0]?.id,
          capRate: data.snapshots?.[0]?.outputs?.capRateOnCost,
          irr: data.snapshots?.[0]?.outputs?.projectedIrrPct,
        }));
      }
      main().catch(err => { console.error(err); process.exit(1); });
    `;

    const procC = spawnSync('node', ['--import', 'tsx', '--input-type=module', '-e', scriptC], {
      cwd: webRoot,
      encoding: 'utf-8',
      env: { ...process.env, ALLOW_DISK_FALLBACK: 'true', TEST_AUTH_UID: testUserId, TEST_AUTH_ORG: testOrgId },
    });
    expect(procC.status).toBe(0);
    const resultC = JSON.parse(procC.stdout.trim().split('\n').pop()!);
    expect(resultC.status).toBe(200);
    expect(resultC.count).toBe(1);
    expect(resultC.recoveredId).toBe(resultA.snapshotId);
    expect(resultC.capRate).toBe(6.4);
    expect(resultC.irr).toBe(3.8);
  });
});

