import * as fs from 'fs';
import * as path from 'path';

// Sensitive files containing keys/secrets that must never be exported
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

function getLanguageForExtension(ext: string): string {
  switch (ext) {
    case '.ts':
    case '.tsx':
      return 'typescript';
    case '.js':
    case '.jsx':
    case '.mjs':
      return 'javascript';
    case '.json':
      return 'json';
    case '.css':
      return 'css';
    case '.md':
      return 'markdown';
    case '.rules':
      return 'javascript'; // Firestore/Storage rules syntax highlighting
    case '.yaml':
    case '.yml':
      return 'yaml';
    case '.html':
      return 'html';
    default:
      return 'text';
  }
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
  const args = process.argv.slice(2);
  let targetSubdir = '';
  let outputPath = path.join('docs', 'architect', 'codebase_context.md');

  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--dir' || args[i] === '-d') && args[i + 1]) {
      targetSubdir = args[i + 1];
      i++;
    } else if ((args[i] === '--out' || args[i] === '-o') && args[i + 1]) {
      outputPath = args[i + 1];
      i++;
    }
  }

  const rootDir = process.cwd();
  const scanDir = targetSubdir ? path.join(rootDir, targetSubdir) : rootDir;

  if (!fs.existsSync(scanDir)) {
    console.error(`Error: Target directory "${scanDir}" does not exist.`);
    process.exit(1);
  }

  console.log(`Scanning codebase starting from: ${scanDir}`);
  const allFiles = walkDir(scanDir, rootDir).sort();
  console.log(`Found ${allFiles.length} files to export.`);

  // Create directory structures for output if they don't exist
  const outputDir = path.dirname(path.resolve(outputPath));
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let markdownContent = `# PaperWorking Codebase Context Snapshot\n`;
  markdownContent += `*Generated on: ${new Date().toISOString()}*\n`;
  markdownContent += `*Target path: ${targetSubdir || 'Project Root'}*\n\n`;

  markdownContent += `## Repository Structure\n\n\`\`\`\n`;
  allFiles.forEach(f => {
    markdownContent += `  ${f}\n`;
  });
  markdownContent += `\`\`\`\n\n---\n\n`;

  let exportedCount = 0;
  for (const relPath of allFiles) {
    const fullPath = path.join(rootDir, relPath);
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      const ext = path.extname(relPath);
      const lang = getLanguageForExtension(ext);

      markdownContent += `## File: [${relPath}](file://${fullPath})\n\n`;
      markdownContent += `\`\`\`${lang}\n`;
      markdownContent += content;
      if (!content.endsWith('\n')) {
        markdownContent += '\n';
      }
      markdownContent += `\`\`\`\n\n---\n\n`;
      exportedCount++;
    } catch (err) {
      console.warn(`Warning: Could not read file ${relPath}:`, err instanceof Error ? err.message : err);
    }
  }

  fs.writeFileSync(outputPath, markdownContent, 'utf8');
  console.log(`Successfully exported ${exportedCount} files to: ${outputPath}`);
}

main();
