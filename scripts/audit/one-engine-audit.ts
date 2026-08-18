import fs from 'fs';
import path from 'path';

interface AuditViolation {
  filePath: string;
  lineNumber: number;
  patternName: string;
  lineContent: string;
  recommendation: string;
}

const VIOLATION_PATTERNS: { name: string; regex: RegExp; recommendation: string }[] = [
  {
    name: 'NOI Inline Calculation',
    regex: /NOI\s*[=:]\s*[^;\n]*\-/i,
    recommendation: 'Use deriveAllProjectMetrics().scorecard.noi instead of inline NOI math.',
  },
  {
    name: 'Cap Rate Inline Calculation',
    regex: /Cap\s*Rate\s*[=:]\s*[^;\n]*\/\s*/i,
    recommendation: 'Use deriveAllProjectMetrics().scorecard.capRate instead of inline Cap Rate math.',
  },
  {
    name: 'Cash Flow Inline Calculation',
    regex: /Cash\s*Flow\s*[=:]\s*[^;\n]*\-/i,
    recommendation: 'Use deriveAllProjectMetrics().scorecard.cashFlow instead of inline Cash Flow math.',
  },
  {
    name: 'DSCR Inline Calculation',
    regex: /DSCR\s*[=:]\s*[^;\n]*\/\s*/i,
    recommendation: 'Use deriveAllProjectMetrics().scorecard.dscr instead of inline DSCR math.',
  },
  {
    name: 'PMT Payment Calculation Outside Amortization Engine',
    regex: /function\s+pmt\(|const\s+pmt\s*=/i,
    recommendation: 'Use calculateMortgagePayment() in src/lib/metrics/amortization-engine.ts.',
  },
];

const SCAN_DIRS = [
  path.join(process.cwd(), 'src/components'),
  path.join(process.cwd(), 'src/app/api'),
  path.join(process.cwd(), 'src/lib'),
  path.join(process.cwd(), 'scripts'),
];

const EXCLUDED_PATHS = [
  path.join(process.cwd(), 'src/lib/metrics'),
  path.join(process.cwd(), 'scripts/audit/one-engine-audit.ts'),
];

function isExcluded(filePath: string): boolean {
  return EXCLUDED_PATHS.some(excluded => filePath.startsWith(excluded));
}

function getFilesRecursively(dir: string): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursively(filePath));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      if (!isExcluded(filePath)) {
        results.push(filePath);
      }
    }
  }
  return results;
}

export function runOneEngineAudit(): { totalFilesScanned: number; violations: AuditViolation[] } {
  const violations: AuditViolation[] = [];
  let totalFilesScanned = 0;

  for (const scanDir of SCAN_DIRS) {
    const files = getFilesRecursively(scanDir);
    totalFilesScanned += files.length;

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        // Skip comment lines
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;

        for (const pattern of VIOLATION_PATTERNS) {
          if (pattern.regex.test(line)) {
            violations.push({
              filePath: path.relative(process.cwd(), file),
              lineNumber: index + 1,
              patternName: pattern.name,
              lineContent: line.trim(),
              recommendation: pattern.recommendation,
            });
          }
        }
      });
    }
  }

  return { totalFilesScanned, violations };
}

if (require.main === module) {
  console.log('🔍 Starting One-Engine Rule Audit...');
  const { totalFilesScanned, violations } = runOneEngineAudit();

  console.log(`Scanned ${totalFilesScanned} files across components, API routes, lib, and scripts.`);

  if (violations.length === 0) {
    console.log('✅ PASSED: 0 One-Engine Rule violations found!');
    process.exit(0);
  } else {
    console.error(`❌ FAILED: Found ${violations.length} One-Engine Rule violations:`);
    violations.forEach((v, idx) => {
      console.error(`\n[Violation #${idx + 1}] ${v.patternName}`);
      console.error(`File: ${v.filePath}:${v.lineNumber}`);
      console.error(`Code: ${v.lineContent}`);
      console.error(`Fix:  ${v.recommendation}`);
    });
    process.exit(1);
  }
}
