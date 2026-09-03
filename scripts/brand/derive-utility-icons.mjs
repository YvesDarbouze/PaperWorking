import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const rootDir = process.cwd();
const publicDir = path.resolve(rootDir, 'public');
const publicBrandDir = path.resolve(publicDir, 'brand');
const appDir = path.resolve(rootDir, 'src/app');

if (!fs.existsSync(publicBrandDir)) fs.mkdirSync(publicBrandDir, { recursive: true });

async function getAlphaBBox(imageBuffer) {
  const img = sharp(imageBuffer);
  const meta = await img.metadata();
  const raw = await img.raw().toBuffer();
  let minX = meta.width, maxX = 0, minY = meta.height, maxY = 0;
  for (let y = 0; y < meta.height; y++) {
    for (let x = 0; x < meta.width; x++) {
      const idx = (y * meta.width + x) * meta.channels;
      const alpha = meta.channels === 4 ? raw[idx + 3] : 255;
      if (alpha > 10) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

function buildIcoFile(pngBuffers) {
  const count = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  let offset = headerSize + count * dirEntrySize;
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);
  const dirEntries = [];
  const imageBuffers = [];
  for (const img of pngBuffers) {
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(img.width >= 256 ? 0 : img.width, 0);
    entry.writeUInt8(img.height >= 256 ? 0 : img.height, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(img.buffer.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += img.buffer.length;
    dirEntries.push(entry);
    imageBuffers.push(img.buffer);
  }
  return Buffer.concat([header, ...dirEntries, ...imageBuffers]);
}

async function renderCenteredIcon({ croppedBuffer, croppedWidth, croppedHeight, canvasSize, scalePercent, bgType = 'transparent' }) {
  const targetWidth = Math.max(1, Math.round(canvasSize * scalePercent));
  const targetHeight = Math.max(1, Math.round(targetWidth * (croppedHeight / croppedWidth)));
  const resizedMark = await sharp(croppedBuffer).resize(targetWidth, targetHeight, { fit: 'inside', kernel: 'lanczos3' }).toBuffer();
  const left = Math.round((canvasSize - targetWidth) / 2);
  const top = Math.round((canvasSize - targetHeight) / 2);
  let canvas = sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: bgType === 'black' ? { r: 0, g: 0, b: 0, alpha: 1 } : { r: 0, g: 0, b: 0, alpha: 0 }
    }
  });
  return await canvas.composite([{ input: resizedMark, left, top }]).png().toBuffer();
}

async function main() {
  console.log('Deriving utility brand icons from canonical masters...');
  const blackMasterBuf = fs.readFileSync(path.join(publicBrandDir, 'paperworking-icon-black-transparent.png'));
  const whiteMasterBuf = fs.readFileSync(path.join(publicBrandDir, 'paperworking-icon-white-transparent.png'));
  const blackBBox = await getAlphaBBox(blackMasterBuf);
  const whiteBBox = await getAlphaBBox(whiteMasterBuf);
  const croppedBlack = await sharp(blackMasterBuf).extract(blackBBox).toBuffer();
  const croppedWhite = await sharp(whiteMasterBuf).extract(whiteBBox).toBuffer();
  const results = [];

  const icon16 = await renderCenteredIcon({ croppedBuffer: croppedBlack, croppedWidth: blackBBox.width, croppedHeight: blackBBox.height, canvasSize: 16, scalePercent: 0.72, bgType: 'transparent' });
  fs.writeFileSync(path.join(publicDir, 'icon-16.png'), icon16);
  fs.writeFileSync(path.join(appDir, 'icon-16.png'), icon16);
  results.push({ name: 'public/icon-16.png', size: '16x16', desc: 'Black mark, transparent (72% scale)' });

  const icon32 = await renderCenteredIcon({ croppedBuffer: croppedBlack, croppedWidth: blackBBox.width, croppedHeight: blackBBox.height, canvasSize: 32, scalePercent: 0.72, bgType: 'transparent' });
  fs.writeFileSync(path.join(publicDir, 'icon-32.png'), icon32);
  fs.writeFileSync(path.join(appDir, 'icon-32.png'), icon32);
  fs.writeFileSync(path.join(publicDir, 'icon.png'), icon32);
  fs.writeFileSync(path.join(appDir, 'icon.png'), icon32);
  results.push({ name: 'public/icon-32.png', size: '32x32', desc: 'Black mark, transparent (72% scale)' });

  const icon48 = await renderCenteredIcon({ croppedBuffer: croppedBlack, croppedWidth: blackBBox.width, croppedHeight: blackBBox.height, canvasSize: 48, scalePercent: 0.72, bgType: 'transparent' });
  const faviconIco = buildIcoFile([{ width: 16, height: 16, buffer: icon16 }, { width: 32, height: 32, buffer: icon32 }, { width: 48, height: 48, buffer: icon48 }]);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), faviconIco);
  fs.writeFileSync(path.join(appDir, 'favicon.ico'), faviconIco);
  results.push({ name: 'public/favicon.ico', size: '16/32/48 ICO', desc: 'Multi-resolution ICO, transparent' });

  const appleTouch = await renderCenteredIcon({ croppedBuffer: croppedWhite, croppedWidth: whiteBBox.width, croppedHeight: whiteBBox.height, canvasSize: 180, scalePercent: 0.72, bgType: 'black' });
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleTouch);
  fs.writeFileSync(path.join(appDir, 'apple-touch-icon.png'), appleTouch);
  results.push({ name: 'public/apple-touch-icon.png', size: '180x180', desc: 'White mark on solid black square (72% scale)' });

  const pwa192 = await renderCenteredIcon({ croppedBuffer: croppedWhite, croppedWidth: whiteBBox.width, croppedHeight: whiteBBox.height, canvasSize: 192, scalePercent: 0.72, bgType: 'black' });
  fs.writeFileSync(path.join(publicBrandDir, 'pwa-192.png'), pwa192);
  fs.writeFileSync(path.join(publicDir, 'icon-192.png'), pwa192);
  fs.writeFileSync(path.join(appDir, 'icon-192.png'), pwa192);
  results.push({ name: 'public/brand/pwa-192.png', size: '192x192', desc: 'PWA standard, white on black (72% scale)' });

  const pwa512 = await renderCenteredIcon({ croppedBuffer: croppedWhite, croppedWidth: whiteBBox.width, croppedHeight: whiteBBox.height, canvasSize: 512, scalePercent: 0.72, bgType: 'black' });
  fs.writeFileSync(path.join(publicBrandDir, 'pwa-512.png'), pwa512);
  fs.writeFileSync(path.join(publicDir, 'icon-512.png'), pwa512);
  fs.writeFileSync(path.join(appDir, 'icon-512.png'), pwa512);
  results.push({ name: 'public/brand/pwa-512.png', size: '512x512', desc: 'PWA standard, white on black (72% scale)' });

  const pwaMaskable192 = await renderCenteredIcon({ croppedBuffer: croppedWhite, croppedWidth: whiteBBox.width, croppedHeight: whiteBBox.height, canvasSize: 192, scalePercent: 0.60, bgType: 'black' });
  fs.writeFileSync(path.join(publicBrandDir, 'pwa-maskable-192.png'), pwaMaskable192);
  results.push({ name: 'public/brand/pwa-maskable-192.png', size: '192x192', desc: 'PWA maskable, 60% safe zone, white on black' });

  const pwaMaskable512 = await renderCenteredIcon({ croppedBuffer: croppedWhite, croppedWidth: whiteBBox.width, croppedHeight: whiteBBox.height, canvasSize: 512, scalePercent: 0.60, bgType: 'black' });
  fs.writeFileSync(path.join(publicBrandDir, 'pwa-maskable-512.png'), pwaMaskable512);
  results.push({ name: 'public/brand/pwa-maskable-512.png', size: '512x512', desc: 'PWA maskable, 60% safe zone, white on black' });

  const cardSize = 240, gap = 20, sheetWidth = cardSize * 3 + gap * 4, sheetHeight = cardSize * 2 + gap * 3;
  const previewItems = [
    { label: 'icon-32', buf: icon32, bg: '#ffffff' },
    { label: 'apple-touch-icon', buf: appleTouch, bg: '#121014' },
    { label: 'pwa-192', buf: pwa192, bg: '#121014' },
    { label: 'pwa-maskable-192', buf: pwaMaskable192, bg: '#121014' },
    { label: 'pwa-512', buf: pwa512, bg: '#121014' },
    { label: 'pwa-maskable-512', buf: pwaMaskable512, bg: '#121014' },
  ];
  const compositeOperations = [];
  for (let i = 0; i < previewItems.length; i++) {
    const item = previewItems[i];
    const col = i % 3, row = Math.floor(i / 3);
    const x = gap + col * (cardSize + gap), y = gap + row * (cardSize + gap);
    const resizedPreview = await sharp(item.buf).resize(180, 180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
    const card = await sharp({
      create: {
        width: cardSize,
        height: cardSize,
        channels: 4,
        background: item.bg === '#ffffff' ? { r: 245, g: 245, b: 245, alpha: 1 } : { r: 25, g: 25, b: 28, alpha: 1 }
      }
    }).composite([{ input: resizedPreview, left: 30, top: 30 }]).png().toBuffer();
    compositeOperations.push({ input: card, left: x, top: y });
  }
  const contactSheet = await sharp({
    create: {
      width: sheetWidth,
      height: sheetHeight,
      channels: 4,
      background: { r: 15, g: 15, b: 18, alpha: 1 }
    }
  }).composite(compositeOperations).png().toBuffer();
  fs.writeFileSync(path.join(publicBrandDir, 'contact-sheet.png'), contactSheet);
  results.push({ name: 'public/brand/contact-sheet.png', size: sheetWidth + 'x' + sheetHeight, desc: '6-up contact sheet preview' });

  console.log('\n--- DERIVED ICONS REPORT ---');
  console.log('| Icon Path | Dimensions | Description |');
  console.log('| :--- | :--- | :--- |');
  for (const r of results) {
    console.log('| ' + r.name + ' | ' + r.size + ' | ' + r.desc + ' |');
  }
}
main().catch(console.error);