import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../../..');

interface Violation {
  file: string;
  line: number;
  snippet: string;
}

function walkSourceFiles(dirPath: string): string[] {
  let files: string[] = [];
  if (!fs.existsSync(dirPath)) return files;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === '__mocks__' || entry.name === 'node_modules') {
        continue;
      }
      files = files.concat(walkSourceFiles(fullPath));
    } else if (
      entry.isFile() &&
      /\.(tsx?|jsx?)$/.test(entry.name) &&
      !/\.(test|spec)\.[tj]sx?$/.test(entry.name) &&
      !entry.name.endsWith('.d.ts')
    ) {
      files.push(fullPath);
    }
  }
  return files;
}

function findViolations(
  files: string[],
  regex: RegExp,
  options?: {
    filterLine?: (line: string) => boolean;
    excludeFiles?: RegExp[];
  },
): Violation[] {
  const violations: Violation[] = [];

  for (const file of files) {
    if (options?.excludeFiles?.some((pattern) => pattern.test(file))) {
      continue;
    }

    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((lineText, idx) => {
      const trimmed = lineText.trim();
      // Skip comment lines
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
        return;
      }

      if (options?.filterLine && !options.filterLine(lineText)) {
        return;
      }

      regex.lastIndex = 0;
      if (regex.test(lineText)) {
        violations.push({
          file: path.relative(REPO_ROOT, file),
          line: idx + 1,
          snippet: trimmed,
        });
      }
    });
  }

  return violations;
}

describe('NO-MOCK CONTRACT Enforcement (PaperWorking Rules)', () => {
  const webComponentsDir = path.resolve(REPO_ROOT, 'apps/web/components');
  const webAppDir = path.resolve(REPO_ROOT, 'apps/web/app');
  const financialEngineDir = path.resolve(REPO_ROOT, 'packages/financial-engine/src');

  const componentFiles = walkSourceFiles(webComponentsDir);
  const appFiles = walkSourceFiles(webAppDir);
  const allUiFiles = [...componentFiles, ...appFiles];
  const engineFiles = walkSourceFiles(financialEngineDir);

  test('audit-no-mock scanner files are present and properly discovered', () => {
    expect(componentFiles.length).toBeGreaterThan(30);
    expect(appFiles.length).toBeGreaterThan(20);
    expect(engineFiles.length).toBeGreaterThan(3);
  });

  test('Rule 1: ZERO window.alert() calls exist in client components and App Router pages', () => {
    const violations = findViolations(
      allUiFiles,
      /(?:window\.)?alert\s*\(/,
      {
        excludeFiles: [/webhook-verifier\.ts$/],
      },
    );
    expect(violations).toEqual([]);
  });

  test('Rule 1: ZERO window.confirm() calls exist in client components and App Router pages', () => {
    const violations = findViolations(allUiFiles, /(?:window\.)?confirm\s*\(/);
    expect(violations).toEqual([]);
  });

  test('Rule 1: ZERO dead anchor links (href="#" or href=\'#\') exist', () => {
    const violations = findViolations(allUiFiles, /href\s*=\s*["']#["']/);
    expect(violations).toEqual([]);
  });

  test('Rule 1: ZERO javascript pseudo-protocol links (href="javascript:...") exist', () => {
    const violations = findViolations(allUiFiles, /href\s*=\s*["']javascript:/i);
    expect(violations).toEqual([]);
  });

  test('Rule 1: ZERO empty/no-op onClick handlers (onClick={() => {}}) exist', () => {
    const violations = findViolations(
      allUiFiles,
      /onClick\s*=\s*\{(?:\s*\(\s*\)\s*=>\s*\{(?:\s*)\}|\s*\(\s*\)\s*=>\s*undefined)\}/,
    );
    expect(violations).toEqual([]);
  });

  test('Rule 2: ZERO placeholder "lorem ipsum" text exists in UI components and routes', () => {
    const violations = findViolations(allUiFiles, /\blorem\s+ipsum\b/i);
    expect(violations).toEqual([]);
  });

  test('Rule 2: ZERO placeholder "coming soon" strings exist in UI components and routes', () => {
    const violations = findViolations(allUiFiles, /["']coming\s+soon["']/i);
    expect(violations).toEqual([]);
  });

  test('Rule 1 & Security: ZERO unhandled console.log calls exist in client components', () => {
    const violations = findViolations(componentFiles, /console\.log\s*\(/);
    expect(violations).toEqual([]);
  });
});
