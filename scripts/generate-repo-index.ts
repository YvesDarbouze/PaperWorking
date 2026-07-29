import * as fs from 'fs';
import * as path from 'path';

// Sensitive files containing keys/secrets that must never be index-mapped
const SECRET_FILES_BLACK_LIST = [
  '.env',
  '.env.local',
  'firebase-key.json',
  'firebase-key 2.json',
  'dev.db',
];

// Directories containing build output, packages, external SDKs, or large binaries to skip
const DIRECTORY_BLACK_LIST = [
  'node_modules',
  '.next',
  '.git',
  '.gemini',
  '.claude',
  '.gstack',
  '.vscode',
  '.agent',
  '.agentic',
  '.agents',
  '.codebuddy',
  '.codex',
  '.continue',
  '.cursor',
  '.roo',
  '.trae',
  '.windsurf',
  'playwright-report',
  'test-results',
  'out',
  'google-cloud-sdk',
  'stitch_downloads',
  'stitch_screens',
  'stitch_marketing_screens',
];

// File extensions to ignore (binaries, lockfiles, etc.)
const EXTENSION_BLACK_LIST = [
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.ico',
  '.pdf',
  '.zip',
  '.tar',
  '.gz',
  '.mp4',
  '.webm',
  '.ai',
  '.tsbuildinfo',
  '.db',
  '.DS_Store',
];

interface FileMetadata {
  path: string;
  sizeBytes: number;
  lines: number;
  language: string;
  category: string;
  description: string;
}

function getFileCategory(relPath: string): string {
  const parts = relPath.split(path.sep);

  if (parts[0] === 'src') {
    if (parts[1] === 'app') {
      if (relPath.includes('/api/')) return 'API Route';
      return 'App Router Page/Layout';
    }
    if (parts[1] === 'components') return 'UI Component';
    if (parts[1] === 'actions') return 'Server Action';
    if (parts[1] === 'hooks') return 'React Hook';
    if (parts[1] === 'store') return 'Zustand Store';
    if (parts[1] === 'lib') return 'Library / Utility';
    if (parts[1] === 'types') return 'TypeScript Types';
    if (parts[1] === '__tests__') return 'Unit Test';
  } else if (parts[0] === 'prisma') {
    return 'Prisma Schema / Migration';
  } else if (parts[0] === 'scripts') {
    return 'Automation Script';
  } else if (parts[0] === 'docs') {
    return 'Documentation';
  } else if (parts[0] === 'e2e') {
    return 'End-to-End Test';
  }

  if (relPath.startsWith('.') || parts.length === 1) {
    return 'Configuration File';
  }

  return 'Other';
}

function getLanguageForExtension(ext: string): string {
  switch (ext) {
    case '.ts':
      return 'TypeScript';
    case '.tsx':
      return 'TypeScript React';
    case '.js':
    case '.jsx':
    case '.mjs':
      return 'JavaScript';
    case '.json':
      return 'JSON';
    case '.css':
      return 'CSS';
    case '.md':
      return 'Markdown';
    case '.rules':
      return 'Firebase Rules';
    case '.yaml':
    case '.yml':
      return 'YAML';
    case '.html':
      return 'HTML';
    default:
      return 'Plain Text';
  }
}

function guessFileDescription(relPath: string, category: string): string {
  const baseName = path.basename(relPath);

  if (category === 'API Route') {
    return `Server-side HTTP API endpoint under path: /api/${relPath.substring(relPath.indexOf('/api/') + 5, relPath.lastIndexOf('/'))}`;
  }
  if (category === 'Server Action') {
    return `Server-side database mutation or service handler triggered from UI actions.`;
  }
  if (category === 'UI Component') {
    return `Reusable UI component under component library: ${path.dirname(relPath)}`;
  }
  if (category === 'React Hook') {
    return `Custom React hook logic for state sync or state machines.`;
  }
  if (category === 'Zustand Store') {
    return `Global frontend state store for application data.`;
  }
  if (category === 'Unit Test') {
    return `Jest unit test suite verifying component or utility logic.`;
  }
  if (category === 'End-to-End Test') {
    return `Playwright integration/browser test verifying full user flows.`;
  }
  if (category === 'Library / Utility') {
    if (relPath.includes('metrics/')) return `Core Real Estate metrics calculation engine formulas.`;
    return `Helper functions, adapters, or service layers.`;
  }

  return `Project asset file: ${baseName}`;
}

function shouldSkipFile(filePath: string): boolean {
  const baseName = path.basename(filePath);
  const extName = path.extname(filePath);

  // Check secret files
  if (SECRET_FILES_BLACK_LIST.includes(baseName) || SECRET_FILES_BLACK_LIST.includes(filePath)) {
    return true;
  }

  // Skip lockfiles specifically
  if (baseName === 'package-lock.json' || baseName === 'skills-lock.json') {
    return true;
  }

  // Check extensions
  if (EXTENSION_BLACK_LIST.includes(extName)) {
    return true;
  }

  return false;
}

function shouldSkipDirectory(dirPath: string): boolean {
  const baseName = path.basename(dirPath);
  
  // Skip any dot directory unless it is .github
  if (baseName.startsWith('.') && baseName !== '.github') {
    return true;
  }

  return DIRECTORY_BLACK_LIST.includes(baseName);
}

function walkDir(dir: string, baseDir: string, filesList: string[] = []): string[] {
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!shouldSkipDirectory(filePath)) {
        walkDir(filePath, baseDir, filesList);
      }
    } else {
      const relPath = path.relative(baseDir, filePath);
      if (!shouldSkipFile(relPath)) {
        filesList.push(relPath);
      }
    }
  }
  return filesList;
}

function main() {
  const rootDir = process.cwd();
  console.log(`Analyzing repository: ${rootDir}`);

  const allFiles = walkDir(rootDir, rootDir).sort();
  const fileIndex: FileMetadata[] = [];

  for (const relPath of allFiles) {
    const fullPath = path.join(rootDir, relPath);
    try {
      const stat = fs.statSync(fullPath);
      const content = fs.readFileSync(fullPath, 'utf8');
      const ext = path.extname(relPath);
      const category = getFileCategory(relPath);
      const linesCount = content.split('\n').length;

      fileIndex.push({
        path: relPath,
        sizeBytes: stat.size,
        lines: linesCount,
        language: getLanguageForExtension(ext),
        category: category,
        description: guessFileDescription(relPath, category),
      });
    } catch (err) {
      console.warn(`Could not index file ${relPath}:`, err instanceof Error ? err.message : err);
    }
  }

  const outputPath = path.join('docs', 'architect', 'repository_index.json');
  const outputDir = path.dirname(path.resolve(outputPath));
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(fileIndex, null, 2), 'utf8');
  console.log(`Successfully generated index with ${fileIndex.length} files at: ${outputPath}`);
}

main();
