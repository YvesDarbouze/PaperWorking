#!/usr/bin/env node
/**
 * Fails when two dynamic segments with different slug names live under the
 * same normalized path position (Next.js runtime error:
 * "You cannot use different slug names for the same dynamic path").
 *
 * Route groups like (marketing) are ignored when comparing parents.
 */
import fs from 'node:fs';
import path from 'node:path';

const APP_DIR = path.resolve(process.cwd(), 'apps/web/app');

if (!fs.existsSync(APP_DIR)) {
  console.error(`[route-conflicts] app dir not found: ${APP_DIR}`);
  process.exit(1);
}

const groups = new Map();

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const full = path.join(dir, entry.name);
    if (entry.name.startsWith('[') && entry.name.endsWith(']')) {
      const rel = path.relative(APP_DIR, dir);
      const normalized = rel
        .split(path.sep)
        .filter((p) => p && !(p.startsWith('(') && p.endsWith(')')))
        .join('/');
      const key = normalized || '.';
      if (!groups.has(key)) groups.set(key, new Set());
      groups.get(key).add(entry.name);
    }
    walk(full);
  }
}

walk(APP_DIR);

const conflicts = [...groups.entries()].filter(([, names]) => names.size > 1);

if (conflicts.length > 0) {
  console.error('[route-conflicts] FAIL: conflicting dynamic segment names:');
  for (const [parent, names] of conflicts) {
    console.error(`  ${parent}: ${[...names].sort().join(' vs ')}`);
  }
  process.exit(1);
}

console.log(`[route-conflicts] OK: ${groups.size} dynamic parents, no slug-name conflicts`);
