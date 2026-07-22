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
      if (content.includes('<button') || content.includes('className="pw-btn') || content.includes('className="ag-button')) {
        // Find potential sibling buttons
        const matches = content.match(/<button[\s\S]*?<\/button>/g);
        if (matches && matches.length > 1) {
          console.log(`File: ${fullPath} has ${matches.length} button tags`);
        }
      }
    }
  }
}

scanDir(srcDir);
