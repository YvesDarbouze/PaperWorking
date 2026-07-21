const fs = require('fs');
const path = require('path');

const srcDir = '/Users/yvesdarbouze/Documents/PaperWorking/src';

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scanDir(fullPath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Look for lines containing flex/grid layouts with gap-1, gap-2, gap-1.5, gap-0, or space-x-1, space-x-2
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        const hasSmallGap = /(gap-[0-1](\.5)?|gap-2|space-x-[0-2](\.5)?|gap-none)\b/.test(line);
        const hasButtons = line.includes('button') || line.includes('btn') || line.includes('tab') || line.includes('Link');
        if (hasSmallGap && hasButtons) {
          console.log(`${fullPath}:${index + 1}: ${line.trim()}`);
        }
      });
    }
  }
}

scanDir(srcDir);
