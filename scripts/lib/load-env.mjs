import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const scriptsDir = dirname(fileURLToPath(import.meta.url));
/** scripts/lib → repo root is two levels up */
const repoRoot = resolve(scriptsDir, '../..');

/** Load key=value pairs from repo .env without overwriting existing process.env. */
export function loadRepoEnv() {
  const candidates = [
    resolve(repoRoot, '.env'),
    resolve(repoRoot, '.env.local'),
    resolve(repoRoot, 'apps/web/.env.local'),
  ];
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      value = value.replace(/\\n/g, '\n');
      if (!(key in process.env)) process.env[key] = value;
    }
  }
}

export { repoRoot };
