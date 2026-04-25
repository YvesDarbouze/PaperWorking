import fs from 'fs';
import path from 'path';

const SRC_DIR = path.join(process.cwd(), 'src');

// Comprehensive mapping for the 6-color palette
const replacements = [
  // Typography Replacements -> text-text-primary (#595959)
  { regex: /\btext-(black|slate-900|gray-900|zinc-900|neutral-900|stone-900)\b/g, replace: 'text-text-primary' },
  { regex: /\btext-(slate-800|gray-800|zinc-800|neutral-800|stone-800)\b/g, replace: 'text-text-primary' },
  { regex: /\btext-(slate-700|gray-700|zinc-700|neutral-700|stone-700)\b/g, replace: 'text-text-primary' },
  { regex: /\btext-pw-fg\b/g, replace: 'text-text-primary' },
  { regex: /\btext-pw-black\b/g, replace: 'text-text-primary' },
  { regex: /\btext-\[\#000000\]\b/g, replace: 'text-text-primary' },

  // Typography Replacements -> text-text-secondary (#7F7F7F)
  { regex: /\btext-(slate-600|gray-600|zinc-600|neutral-600|stone-600)\b/g, replace: 'text-text-secondary' },
  { regex: /\btext-(slate-500|gray-500|zinc-500|neutral-500|stone-500)\b/g, replace: 'text-text-secondary' },
  { regex: /\btext-(slate-400|gray-400|zinc-400|neutral-400|stone-400)\b/g, replace: 'text-text-secondary' },
  { regex: /\btext-pw-subtle\b/g, replace: 'text-text-secondary' },
  { regex: /\btext-pw-muted\b/g, replace: 'text-text-secondary' },

  // Background Replacements -> bg-bg-surface (#FFFFFF)
  { regex: /\bbg-white\b/g, replace: 'bg-bg-surface' },
  { regex: /\bbg-pw-white\b/g, replace: 'bg-bg-surface' },
  { regex: /\bbg-pw-surface\b/g, replace: 'bg-bg-surface' },
  { regex: /\bbg-\[\#ffffff\]\b/gi, replace: 'bg-bg-surface' },
  { regex: /\bbg-\[\#fff\]\b/gi, replace: 'bg-bg-surface' },

  // Background Replacements -> bg-bg-primary (#F2F2F2)
  { regex: /\bbg-(slate-50|gray-50|zinc-50|neutral-50|stone-50)\b/g, replace: 'bg-bg-primary' },
  { regex: /\bbg-(slate-100|gray-100|zinc-100|neutral-100|stone-100)\b/g, replace: 'bg-bg-primary' },
  { regex: /\bbg-pw-bg\b/g, replace: 'bg-bg-primary' },
  { regex: /\bbg-\[\#f2f2f2\]\b/gi, replace: 'bg-bg-primary' },

  // Border Replacements -> border-border-accent (#A5A5A5)
  { regex: /\bborder-(slate-100|gray-100|zinc-100|neutral-100|stone-100)\b/g, replace: 'border-border-accent' },
  { regex: /\bborder-(slate-200|gray-200|zinc-200|neutral-200|stone-200)\b/g, replace: 'border-border-accent' },
  { regex: /\bborder-(slate-300|gray-300|zinc-300|neutral-300|stone-300)\b/g, replace: 'border-border-accent' },
  { regex: /\bborder-pw-border\b/g, replace: 'border-border-accent' },
];

function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      processFile(fullPath);
    }
  }
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let hasChanges = false;

  for (const { regex, replace } of replacements) {
    if (regex.test(content)) {
      content = content.replace(regex, replace);
      hasChanges = true;
    }
  }

  if (hasChanges) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath.replace(process.cwd(), '')}`);
  }
}

console.log('Starting PaperWorking Color Palette Cleanup...');
processDirectory(SRC_DIR);
console.log('Cleanup Complete.');
