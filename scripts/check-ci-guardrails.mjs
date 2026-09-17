import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

/**
 * CI GUARDRAILS:
 * 1. NEXT_PUBLIC_ Allowlist: Build fails on any unapproved NEXT_PUBLIC_ addition.
 * 2. Secret & PII Bundle Grep: Scans client bundles and client-side code for secret shapes:
 *    - hi@paperworking.co (protected support email)
 *    - SG. (SendGrid API secret keys)
 *    - sk_ / sk_live_ / sk_test_ (Stripe API secret keys)
 *    - access-sandbox- / access-development- / access-production- (Plaid access tokens)
 *    - "type": "service_account" / "-----BEGIN PRIVATE KEY-----" (Google service account keys)
 */

export const ALLOWED_NEXT_PUBLIC_VARS = new Set([
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
  'NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID',
  'NEXT_PUBLIC_USE_FIREBASE_EMULATOR',
  'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY',
  'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY_DEV',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_BUILD_SHA',
  'NEXT_PUBLIC_BUILT_AT',
  'NEXT_PUBLIC_DEMO_MODE',
  'NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY',
  'NEXT_PUBLIC_ENGINE_VERSION',
]);

export const FORBIDDEN_SECRET_PATTERNS = [
  {
    name: 'Protected Support Email (hi@paperworking.co)',
    pattern: /hi@paperworking\.co/gi,
  },
  {
    name: 'SendGrid Secret API Key (SG.)',
    pattern: /\bSG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}\b|\bSG\.[A-Za-z0-9_-]{10,}\b/g,
  },
  {
    name: 'Stripe Secret API Key (sk_live / sk_test / sk_)',
    pattern: /\bsk_(?:live|test)_[0-9a-zA-Z]{24,}\b|\bsk_[0-9a-zA-Z]{24,}\b/g,
  },
  {
    name: 'Plaid Access Token (access-sandbox- / access-development- / access-production-)',
    pattern: /\baccess-(?:sandbox|development|production)-[0-9a-fA-F-]{20,}\b/g,
  },
  {
    name: 'Google Service Account Private Key Marker',
    pattern: /-----BEGIN (?:RSA )?PRIVATE KEY-----/g,
  },
  {
    name: 'Google Service Account JSON Marker',
    pattern: /"type"\s*:\s*"service_account"/g,
  },
];

// 1. Validate NEXT_PUBLIC_ variables in process.env and environment files
export function checkNextPublicAllowlist(targetEnv = process.env) {
  const violations = [];
  for (const key of Object.keys(targetEnv)) {
    // Explicit Guardrail: Zero RentCast variables in NEXT_PUBLIC_
    if (key.includes('RENTCAST') && key.startsWith('NEXT_PUBLIC_')) {
      violations.push(`Forbidden RentCast exposure in client environment: ${key}`);
    } else if (key.startsWith('NEXT_PUBLIC_')) {
      if (!ALLOWED_NEXT_PUBLIC_VARS.has(key)) {
        violations.push(key);
      }
    }
  }
  return { ok: violations.length === 0, violations };
}

// Helper to recursively collect files
function collectFiles(dir, extensions = ['.js', '.mjs', '.tsx', '.ts', '.html', '.json', '.css']) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'dist') {
        files.push(...collectFiles(fullPath, extensions));
      }
    } else if (entry.isFile()) {
      if (extensions.some((ext) => entry.name.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

// 2. Scan client bundle directory (.next/static/), client components, and 'use client' files
export function scanClientBundlesForSecrets(baseDir = rootDir) {
  const findings = [];
  const clientTargets = [
    path.join(baseDir, 'apps/web/.next/static'),
    path.join(baseDir, 'apps/web/components'),
    path.join(baseDir, 'apps/web/app'),
    path.join(baseDir, 'apps/web/public'),
  ];

  const filesToScan = new Set();
  for (const target of clientTargets) {
    if (fs.existsSync(target)) {
      for (const f of collectFiles(target)) {
        filesToScan.add(f);
      }
    }
  }

  for (const file of filesToScan) {
    // Exclude test files
    if (file.includes('__tests__') || file.endsWith('.test.ts') || file.endsWith('.test.tsx')) {
      continue;
    }

    const content = fs.readFileSync(file, 'utf-8');
    for (const { name, pattern } of FORBIDDEN_SECRET_PATTERNS) {
      pattern.lastIndex = 0;
      const match = pattern.exec(content);
      if (match) {
        findings.push({
          file: path.relative(baseDir, file),
          secretType: name,
          snippet: match[0].slice(0, 50),
        });
      }
    }
  }

  return { ok: findings.length === 0, findings };
}

export function runGuardrails() {
  console.log('Running CI Security Guardrails...');
  let failed = false;

  // 1. Check NEXT_PUBLIC_ variables
  console.log('1. Verifying NEXT_PUBLIC_ allowlist...');
  const envResult = checkNextPublicAllowlist();
  if (!envResult.ok) {
    console.error(`❌ [FAIL] Unauthorized NEXT_PUBLIC_ variable(s) detected: ${envResult.violations.join(', ')}`);
    console.error('All client-exposed variables must be explicitly reviewed and added to ALLOWED_NEXT_PUBLIC_VARS.');
    failed = true;
  } else {
    console.log(`✓ All NEXT_PUBLIC_ variables conform to the approved allowlist (${ALLOWED_NEXT_PUBLIC_VARS.size} approved).`);
  }

  // 2. Scan Client Bundles & Source
  console.log('2. Scanning client bundle and components for secret leak patterns...');
  const scanResult = scanClientBundlesForSecrets();
  if (!scanResult.ok) {
    console.error(`❌ [FAIL] Forbidden secret shape(s) detected in client surface:`);
    for (const finding of scanResult.findings) {
      console.error(`  - ${finding.file}: ${finding.secretType} (match: "${finding.snippet}")`);
    }
    failed = true;
  } else {
    console.log('✓ Zero forbidden secret shapes detected in client bundles and components.');
  }

  return !failed;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const success = runGuardrails();
  if (!success) {
    process.exit(1);
  }
  console.log('\n[PASS] All CI security guardrails verified successfully.');
}
