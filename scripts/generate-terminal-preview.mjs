import React from 'react';
import { renderToString } from 'react-dom/server';
import fs from 'node:fs';
import path from 'node:path';
import InstitutionalCommandTerminal from '../apps/web/components/dashboard/InstitutionalCommandTerminal.js';

// Pre-render the component to a standalone HTML file with Tailwind CDN and font links
const terminalHtml = renderToString(React.createElement(InstitutionalCommandTerminal));

const fullHtml = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PaperWorking Command Terminal - Institutional Showcase</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body {
      background-color: #0F172A;
      font-family: 'Inter', sans-serif;
      margin: 0;
      padding: 0;
      color: #F8FAFC;
    }
    .font-mono {
      font-family: 'JetBrains Mono', monospace;
    }
  </style>
</head>
<body class="bg-[#0F172A] min-h-screen text-[#F8FAFC]">
  <div id="root">
    ${terminalHtml}
  </div>
</body>
</html>`;

const outDir = '/Users/yvesdarbouze/.gemini/antigravity/brain/ad6468c7-7cd1-4b82-b77a-da6d5866895f/scratch';
fs.mkdirSync(outDir, { recursive: true });
const filePath = path.join(outDir, 'terminal_preview.html');
fs.writeFileSync(filePath, fullHtml, 'utf8');
console.log('Saved standalone terminal preview HTML to:', filePath);
