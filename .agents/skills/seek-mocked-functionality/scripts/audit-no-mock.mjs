#!/usr/bin/env node

/**
 * PaperWorking NO-MOCK CONTRACT Audit Scanner
 *
 * Scans production components and libraries for:
 * 1. window.alert / confirm calls
 * 2. Dead links (href="#", href='javascript:...')
 * 3. Empty onClick handlers (onClick={() => {}})
 * 4. Placeholder text ("Lorem ipsum", "Coming soon")
 * 5. Stray console.log in client components
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../../..');

const VIOLATION_RULES = [
  {
    name: 'NO_BROWSER_ALERT',
    regex: /(?:window\.)?alert\s*\(/g,
    description: 'Banned window.alert() call — use reactive toast/banner state instead',
    excludeFiles: [/webhook-verifier\.ts$/], // webhook-verifier has internal alert helper
  },
  {
    name: 'NO_BROWSER_CONFIRM',
    regex: /(?:window\.)?confirm\s*\(/g,
    description: 'Banned window.confirm() call — use custom confirmation modal',
  },
  {
    name: 'NO_DEAD_HREF_HASH',
    regex: /href\s*=\s*["']#["']/g,
    description: 'Dead anchor link href="#" is prohibited by Rule 1',
  },
  {
    name: 'NO_DEAD_HREF_JS',
    regex: /href\s*=\s*["']javascript:/gi,
    description: 'Banned href="javascript:..." anchor pattern',
  },
  {
    name: 'NO_EMPTY_ONCLICK',
    regex: /onClick\s*=\s*\{(?:\s*\(\s*\)\s*=>\s*\{(?:\s*)\}|\s*\(\s*\)\s*=>\s*undefined)\}/g,
    description: 'Dead/empty onClick handler — must wire to real state or action',
  },
  {
    name: 'NO_LOREM_IPSUM',
    regex: /\blorem\s+ipsum\b/gi,
    description: 'Placeholder lorem ipsum text is strictly prohibited by Rule 2',
  },
  {
    name: 'NO_COMING_SOON',
    regex: /["']coming\s+soon["']/gi,
    description: 'Placeholder "coming soon" copy is prohibited by Rule 1 & 2',
  },
  {
    name: 'NO_COMPONENT_CONSOLE_LOG',
    regex: /console\.log\s*\(/g,
    description: 'Stray console.log in client component — replace with real telemetry or remove',
    onlyInDirs: ['apps/web/components'],
  },
];

const SCAN_DIRS = [
  'apps/web/components',
  'apps/web/app',
  'packages/financial-engine/src',
];

const EXCLUDE_FILE_PATTERNS = [
  /\.test\.[tj]sx?$/,
  /\.spec\.[tj]sx?$/,
  /__tests__/,
  /__mocks__/,
  /\.d\.ts$/,
];

function isExcludedFile(filePath) {
  return EXCLUDE_FILE_PATTERNS.some((pattern) => pattern.test(filePath));
}

function scanFile(filePath) {
  const relativePath = path.relative(REPO_ROOT, filePath);
  if (isExcludedFile(filePath)) {
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const violations = [];

  for (const rule of VIOLATION_RULES) {
    if (rule.onlyInDirs) {
      const matchesDir = rule.onlyInDirs.some((dir) => relativePath.startsWith(dir));
      if (!matchesDir) continue;
    }

    if (rule.excludeFiles) {
      const isExcluded = rule.excludeFiles.some((pattern) => pattern.test(filePath));
      if (isExcluded) continue;
    }

    lines.forEach((lineText, lineIdx) => {
      // Reset regex state
      rule.regex.lastIndex = 0;
      let match;
      while ((match = rule.regex.exec(lineText)) !== null) {
        // Skip comment lines
        const trimmed = lineText.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
          continue;
        }

        violations.push({
          file: relativePath,
          line: lineIdx + 1,
          rule: rule.name,
          matchedText: match[0],
          snippet: lineText.trim(),
        });
      }
    });
  }

  return violations;
}

function walkDir(dirPath) {
  let results = [];
  if (!fs.existsSync(dirPath)) return results;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(walkDir(fullPath));
    } else if (
      entry.isFile() &&
      /\.(ts|tsx|js|jsx)$/.test(entry.name) &&
      !isExcludedFile(fullPath)
    ) {
      results.push(fullPath);
    }
  }
  return results;
}

export function runAudit() {
  const allViolations = [];
  let fileCount = 0;

  for (const dir of SCAN_DIRS) {
    const fullDir = path.resolve(REPO_ROOT, dir);
    const files = walkDir(fullDir);
    fileCount += files.length;

    for (const file of files) {
      const violations = scanFile(file);
      allViolations.push(...violations);
    }
  }

  return { violations: allViolations, scannedFilesCount: fileCount };
}

// When run directly from CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log('🔍 PaperWorking NO-MOCK CONTRACT Audit Scanner');
  console.log('Scanning directories:');
  SCAN_DIRS.forEach((d) => console.log(`  - ${d}`));
  console.log('------------------------------------------------------------');

  const { violations, scannedFilesCount } = runAudit();

  console.log(`Audited ${scannedFilesCount} source files.`);

  if (violations.length === 0) {
    console.log('✅ ZERO VIOLATIONS FOUND. Codebase strictly adheres to NO-MOCK CONTRACT.');
    process.exit(0);
  } else {
    console.error(`❌ FOUND ${violations.length} NO-MOCK CONTRACT VIOLATION(S):\n`);
    violations.forEach((v, idx) => {
      console.error(`[${idx + 1}] Rule: ${v.rule}`);
      console.error(`    File: ${v.file}:${v.line}`);
      console.error(`    Snippet: ${v.snippet}`);
      console.error('');
    });
    process.exit(1);
  }
}
