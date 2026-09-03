/**
 * One-time read-only export of Neon AdminAuditLog rows.
 * Usage: node --env-file=../../.env archive/postgres-migration/scripts/export-admin-audit-log.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '../exports');
mkdirSync(outDir, { recursive: true });

const connectionString = process.env.DATABASE_URL?.trim();
if (!connectionString) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const client = new pg.Client({ connectionString });
await client.connect();

const { rows } = await client.query(`
  SELECT
    id,
    "sequenceNumber"::text AS "sequenceNumber",
    timestamp,
    "actorUid",
    "actorEmail",
    "actorRole",
    action,
    "targetResource",
    "targetResourceId",
    status,
    "ipAddress",
    "userAgent",
    "reasonCode",
    severity,
    "previousHash",
    "entryHash",
    metadata
  FROM "AdminAuditLog"
  ORDER BY timestamp ASC
`);

await client.end();

const payload = {
  exportedAt: new Date().toISOString(),
  source: 'neon',
  table: 'AdminAuditLog',
  recordCount: rows.length,
  records: rows,
};

const jsonPath = join(outDir, 'admin-audit-log.json');
writeFileSync(jsonPath, JSON.stringify(payload, null, 2));

const csvHeader =
  'id,sequenceNumber,timestamp,actorUid,actorEmail,actorRole,action,targetResource,targetResourceId,status,ipAddress,userAgent,reasonCode,severity,previousHash,entryHash,metadata\n';
const csvBody = rows
  .map((r) =>
    [
      r.id,
      r.sequenceNumber,
      r.timestamp?.toISOString?.() ?? r.timestamp,
      r.actorUid,
      r.actorEmail,
      r.actorRole,
      r.action,
      r.targetResource,
      r.targetResourceId ?? '',
      r.status,
      r.ipAddress,
      r.userAgent ?? '',
      r.reasonCode ?? '',
      r.severity,
      r.previousHash,
      r.entryHash ?? '',
      JSON.stringify(r.metadata ?? null),
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(','),
  )
  .join('\n');

const csvPath = join(outDir, 'admin-audit-log.csv');
writeFileSync(csvPath, csvHeader + csvBody);

console.log(`Exported ${rows.length} AdminAuditLog rows`);
console.log(`JSON: ${jsonPath}`);
console.log(`CSV:  ${csvPath}`);
