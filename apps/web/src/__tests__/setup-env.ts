import os from 'node:os';
import path from 'node:path';

process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://test:test@127.0.0.1:5432/test';

// Isolate the calculator snapshot disk fallback per test file/worker so parallel
// suites cannot interfere with each other's persisted state.
process.env.CALCULATOR_SNAPSHOTS_FILE =
  process.env.CALCULATOR_SNAPSHOTS_FILE ||
  path.join(
    os.tmpdir(),
    `pw-calc-snapshots-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`,
  );
