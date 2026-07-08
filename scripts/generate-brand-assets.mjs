// Regenerates every raster brand asset (favicons, PWA icons, apple-touch-icon,
// and the email/PDF-only raster logotype exports) from the canonical vector
// sources in public/brand/icon.svg and public/brand/logotype.svg.
//
// Run: node scripts/generate-brand-assets.mjs
//
// Why this exists: sharp/librsvg renders `fill="currentColor"` inconsistently
// across environments, so for rasterization we substitute a literal hex color
// into a copy of the SVG markup — the canonical currentColor files themselves
// are untouched and remain the source of truth for the inline React components.

import sharp from 'sharp';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const BRAND_DIR = path.join(ROOT, 'public/brand');

const ICON_SVG = readFileSync(path.join(BRAND_DIR, 'icon.svg'), 'utf8');
const LOGOTYPE_SVG = readFileSync(path.join(BRAND_DIR, 'logotype.svg'), 'utf8');

function withColor(svg, hex) {
  return svg.replace('fill="currentColor"', `fill="${hex}"`);
}

/** Render an SVG string to a transparent-background PNG buffer at exact pixel size. */
async function renderTransparent(svg, width, height) {
  return sharp(Buffer.from(svg))
    .resize(width, height, { fit: 'contain' })
    .png()
    .toBuffer();
}

/**
 * Render the icon centered on a solid-color square canvas, with the glyph
 * confined to `scale` fraction of the canvas (maskable-icon safe zone / iOS
 * corner-mask headroom).
 */
async function renderOnSolid(iconHex, bgHex, canvasSize, scale) {
  const glyphSize = Math.round(canvasSize * scale);
  const glyph = await sharp(Buffer.from(withColor(ICON_SVG, iconHex)))
    .resize(glyphSize, glyphSize, { fit: 'contain' })
    .png()
    .toBuffer();

  const offset = Math.round((canvasSize - glyphSize) / 2);

  return sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: bgHex,
    },
  })
    .composite([{ input: glyph, left: offset, top: offset }])
    .png()
    .toBuffer();
}

/** Hand-rolled ICO container (PNG-in-ICO, supported by all modern browsers). */
function buildIco(pngBuffers) {
  const count = pngBuffers.length;
  const headerSize = 6 + 16 * count;
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(count, 4);

  let offset = headerSize;
  const entries = [];
  for (let i = 0; i < count; i++) {
    const { size, buffer } = pngBuffers[i];
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 = 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height (0 = 256)
    entry.writeUInt8(0, 2); // color count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // planes
    entry.writeUInt16LE(32, 6); // bit count
    entry.writeUInt32LE(buffer.length, 8); // bytes in resource
    entry.writeUInt32LE(offset, 12); // image offset
    offset += buffer.length;
    entries.push(entry);
  }

  return Buffer.concat([header, ...entries, ...pngBuffers.map((p) => p.buffer)]);
}

async function main() {
  // ── Favicon family (browser tab / Next.js icon convention): black glyph ──
  const faviconSizes = [16, 32, 48];
  const faviconBuffers = [];
  for (const size of faviconSizes) {
    const buffer = await renderTransparent(withColor(ICON_SVG, '#000000'), size, size);
    faviconBuffers.push({ size, buffer });
  }
  const ico = buildIco(faviconBuffers);

  const icon16 = faviconBuffers[0].buffer;
  const icon32 = faviconBuffers[1].buffer;
  const icon192 = await renderTransparent(withColor(ICON_SVG, '#000000'), 192, 192);
  const icon512 = await renderTransparent(withColor(ICON_SVG, '#000000'), 512, 512);
  const icon1024 = await renderTransparent(withColor(ICON_SVG, '#000000'), 1024, 1024);

  // apple-touch-icon: opaque background (iOS fills transparency with black),
  // brand off-white per AGENTS.md's light-theme token, icon at 72% for
  // breathing room under iOS's own corner mask.
  const appleTouchIcon = await renderOnSolid('#000000', '#FDFFFC', 180, 0.72);

  // Dark-mode favicon (prefers-color-scheme: dark), white glyph, transparent.
  const whiteIcon32 = await renderTransparent(withColor(ICON_SVG, '#ffffff'), 32, 32);

  // ── PWA manifest family: separate context (background_color: #121014 per
  //    manifest.ts), white glyph, maskable safe zone (icon confined to ~76%
  //    so Android's circular/squircle mask never clips it). ──
  const pwaIcon192 = await renderOnSolid('#ffffff', '#121014', 192, 0.76);
  const pwaIcon512 = await renderOnSolid('#ffffff', '#121014', 512, 0.76);

  // ── Email / PDF raster exports (jsPDF + email clients can't render inline
  //    SVG) — regenerate the exact filenames already referenced in code, now
  //    from the vector source instead of a 225x37px original. ──
  const logotypeHeight = 240;
  const logotypeWidth = Math.round(logotypeHeight * (400 / 51.38));
  const logotypeBlack = await renderTransparent(withColor(LOGOTYPE_SVG, '#000000'), logotypeWidth, logotypeHeight);
  const logotypeWhite = await renderTransparent(withColor(LOGOTYPE_SVG, '#ffffff'), logotypeWidth, logotypeHeight);

  // ── Write outputs ──
  const writes = [
    // Favicon family — both public/ and src/app/ locations currently exist;
    // refresh both so whichever Next.js resolves, content is correct.
    ...['public', 'src/app'].flatMap((dir) => [
      [path.join(ROOT, dir, 'favicon.ico'), ico],
      [path.join(ROOT, dir, 'icon-16.png'), icon16],
      [path.join(ROOT, dir, 'icon-32.png'), icon32],
      [path.join(ROOT, dir, 'icon-192.png'), icon192],
      [path.join(ROOT, dir, 'icon-512.png'), icon512],
      [path.join(ROOT, dir, 'apple-touch-icon.png'), appleTouchIcon],
    ]),
    [path.join(ROOT, 'src/app/icon.png'), icon1024],
    [path.join(BRAND_DIR, 'PaperWorking_White_Logo_Icon_32.png'), whiteIcon32],

    // PWA manifest icons — public/ only (manifest.ts resolves against public/).
    [path.join(ROOT, 'public/icon-192.png'), pwaIcon192],
    [path.join(ROOT, 'public/icon-512.png'), pwaIcon512],

    // Email / PDF raster logotype exports — same filenames as before.
    [path.join(BRAND_DIR, 'PaperWorking_Black_full_Logo_.png'), logotypeBlack],
    [path.join(BRAND_DIR, 'PaperWorking_White_full_Logo_.png'), logotypeWhite],
  ];

  for (const [filePath, buffer] of writes) {
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, buffer);
    console.log(`wrote ${path.relative(ROOT, filePath)} (${buffer.length} bytes)`);
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
