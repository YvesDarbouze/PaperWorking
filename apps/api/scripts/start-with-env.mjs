#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../../..');
const envText = readFileSync(resolve(root, '.env'), 'utf8');
for (const key of ['DATABASE_URL', 'DIRECT_URL']) {
  const m = envText.match(new RegExp(`^${key}=(.*)$`, 'm'));
  if (!m) continue;
  let v = m[1].trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  process.env[key] = v;
}

process.env.PORT = process.env.PORT || '18081';
process.env.CORS_ORIGINS = process.env.CORS_ORIGINS || 'http://localhost:3000';
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.ENABLE_MOCK_AUTH = process.env.ENABLE_MOCK_AUTH || 'true';

const child = spawn(process.execPath, [resolve(root, 'apps/api/dist/main.js')], {
  stdio: 'inherit',
  env: process.env,
  cwd: root,
});
child.on('exit', (code) => process.exit(code ?? 1));
