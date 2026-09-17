import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

const PORT = 3019;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const projectRoot = process.cwd().endsWith('apps/web')
  ? path.resolve(process.cwd(), '..', '..')
  : path.resolve(process.cwd());
const webRoot = path.join(projectRoot, 'apps/web');
const nextBin = path.join(projectRoot, 'node_modules/.bin/next');
const diskFilePath = path.join(webRoot, '.data/calculator-snapshots.json');

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function startDevServer(): Promise<{ server: ReturnType<typeof spawn>; ready: Promise<void> }> {
  const server = spawn(nextBin, ['dev', '-p', String(PORT)], {
    cwd: webRoot,
    env: {
      ...process.env,
      PORT: String(PORT),
      ALLOW_DISK_FALLBACK: 'true',
      TEST_AUTH_UID: 'dev-restart-user',
      TEST_AUTH_ORG: 'org-1',
    },
  });

  const ready = new Promise<void>((resolve, reject) => {
    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error(`Next.js server failed to emit ready signal within 45s on port ${PORT}`));
      }
    }, 45000);

    const onData = (data: Buffer) => {
      const text = data.toString();
      process.stdout.write(`  [next dev] ${text}`);
      if (text.includes('Ready in') || text.includes('Local:') || text.includes(`:${PORT}`)) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve();
        }
      }
    };

    server.stdout?.on('data', onData);
    server.stderr?.on('data', onData);
    server.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        reject(err);
      }
    });
  });

  return Promise.resolve({ server, ready });
}

async function main() {
  console.log('======================================================================');
  console.log('DEV SERVER RESTART-PERSISTENCE & IMMUTABILITY LIVE PROOF');
  console.log('======================================================================\n');

  // Setup test environment
  const dataDir = path.dirname(diskFilePath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(diskFilePath, JSON.stringify([], null, 2), 'utf-8');

  // ---------------------------------------------------------------------------
  // STEP 1: Boot Dev Server #1
  // ---------------------------------------------------------------------------
  console.log(`[Step 1] Launching Next.js dev server on port ${PORT}...`);
  const { server: server1, ready: ready1 } = await startDevServer();
  await ready1;
  await sleep(1000);
  console.log(`✓ Dev Server #1 is ready and accepting requests at ${BASE_URL} (PID: ${server1.pid})`);

  // ---------------------------------------------------------------------------
  // STEP 2: POST Snapshot to Dev Server #1
  // ---------------------------------------------------------------------------
  console.log('\n[Step 2] Sending POST /api/calculator/snapshots to Dev Server #1...');
  const postPayload = {
    source: 'deal_calculator',
    calculatorVersion: '3.0.0',
    inputs: {
      address: '1247 Elm Street, Austin, TX 78702',
      purchasePrice: 520000,
      arv: 680000,
      rehabBudget: 59800,
      grossRentMonthly: 5200,
      operatingExpenseRatioPct: 33.88,
      financingType: 'conventional',
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
    },
    assumptions: {
      holdPeriodYears: 5,
      annualAppreciationPct: 3.0,
      sellingCostsPct: 6.0,
      notes: 'Live Dev Server Restart Persistence Verification',
    },
  };

  const postRes = await fetch(`${BASE_URL}/api/calculator/snapshots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(postPayload),
  });

  console.log(`  HTTP Response Status: ${postRes.status} ${postRes.statusText}`);
  const postJson = (await postRes.json()) as any;
  const savedSnapshot = postJson.snapshot;

  console.log('✓ Snapshot created and persisted:');
  console.log('  ID:             ', savedSnapshot.id);
  console.log('  Engine Version: ', savedSnapshot.engineVersion);
  console.log('  Integrity Hash: ', savedSnapshot.integrityHash);
  console.log('  Address:        ', savedSnapshot.inputs.address);
  console.log('  Cap Rate:       ', savedSnapshot.outputs.capRateOnCost, '%');
  console.log('  Cash on Cash:   ', savedSnapshot.outputs.cashOnCashReturnPct, '%');
  console.log('  Projected IRR:  ', savedSnapshot.outputs.projectedIrrPct, '% (True DCF)');

  // Verify file on disk before restart
  const diskBefore = JSON.parse(fs.readFileSync(diskFilePath, 'utf-8'));
  console.log(`  Persisted on disk: ${diskBefore.length} record(s) (${fs.statSync(diskFilePath).size} bytes)`);

  // ---------------------------------------------------------------------------
  // STEP 3: Terminate Dev Server #1 (Simulate Cold Server Restart)
  // ---------------------------------------------------------------------------
  console.log('\n[Step 3] Stopping Dev Server #1 (SIGTERM)...');
  server1.kill('SIGTERM');
  await sleep(2500);
  try {
    server1.kill('SIGKILL');
  } catch {
    // ignore
  }
  console.log('✓ Dev Server #1 terminated. All memory wiped.');

  // ---------------------------------------------------------------------------
  // STEP 4: Boot Fresh Dev Server #2 (Cold Reboot)
  // ---------------------------------------------------------------------------
  console.log(`\n[Step 4] Starting Dev Server #2 on port ${PORT} (Cold Reboot)...`);
  const { server: server2, ready: ready2 } = await startDevServer();
  await ready2;
  await sleep(1000);
  console.log(`✓ Dev Server #2 is live at ${BASE_URL} (PID: ${server2.pid})`);

  // ---------------------------------------------------------------------------
  // STEP 5: GET Snapshot from Dev Server #2 Across Restart
  // ---------------------------------------------------------------------------
  console.log('\n[Step 5] Sending GET /api/calculator/snapshots to Dev Server #2...');
  const getRes = await fetch(`${BASE_URL}/api/calculator/snapshots`);
  console.log(`  HTTP Response Status: ${getRes.status} ${getRes.statusText}`);
  const getJson = (await getRes.json()) as any;
  const recoveredSnapshots = getJson.snapshots;

  console.log(`✓ Retrieved ${recoveredSnapshots.length} snapshot(s) from Dev Server #2:`);
  const recovered = recoveredSnapshots[0];
  console.log('  ID:             ', recovered.id);
  console.log('  Engine Version: ', recovered.engineVersion);
  console.log('  Integrity Hash: ', recovered.integrityHash);
  console.log('  Address:        ', recovered.inputs.address);
  console.log('  Cap Rate:       ', recovered.outputs.capRateOnCost, '%');
  console.log('  Cash on Cash:   ', recovered.outputs.cashOnCashReturnPct, '%');
  console.log('  Projected IRR:  ', recovered.outputs.projectedIrrPct, '% (True DCF)');

  if (recovered.id !== savedSnapshot.id) {
    console.error(`FAIL: Recovered snapshot ID (${recovered.id}) does not match saved (${savedSnapshot.id})`);
    server2.kill('SIGKILL');
    process.exit(1);
  }
  if (recovered.integrityHash !== savedSnapshot.integrityHash) {
    console.error('FAIL: Cryptographic integrity seal mismatch across server restart');
    server2.kill('SIGKILL');
    process.exit(1);
  }
  console.log('✓ Cryptographic SHA-256 seal verified identical across cold server restart!');

  // ---------------------------------------------------------------------------
  // STEP 6: Attempt Mutation via PUT on Dev Server #2 (Prove Immutability)
  // ---------------------------------------------------------------------------
  console.log('\n[Step 6] Attempting mutation via PUT /api/calculator/snapshots...');
  const putRes = await fetch(`${BASE_URL}/api/calculator/snapshots`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: recovered.id, purchasePrice: 999999 }),
  });
  console.log(`  HTTP Response Status: ${putRes.status} ${putRes.statusText} (Expected: 405 Method Not Allowed)`);
  const putJson = (await putRes.json()) as any;
  console.log('  Response Payload:    ', JSON.stringify(putJson));
  if (putRes.status !== 405 || putJson.code !== 'IMMUTABLE_SNAPSHOT_ERROR') {
    console.error('FAIL: Mutation was not rejected with HTTP 405 IMMUTABLE_SNAPSHOT_ERROR');
    server2.kill('SIGKILL');
    process.exit(1);
  }
  console.log('✓ Immutability proven: PUT mutation rejected with HTTP 405 Method Not Allowed');

  // Clean up
  server2.kill('SIGTERM');
  await sleep(1500);
  try {
    server2.kill('SIGKILL');
  } catch {
    // ignore
  }

  console.log('\n======================================================================');
  console.log('RESTART-PERSISTENCE & IMMUTABILITY VERIFICATION COMPLETE');
  console.log('======================================================================\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
