import fs from 'fs';
import path from 'path';

/**
 * Reads the PaperWorking header logo from /public as a base64 data URI.
 *
 * SERVER-ONLY: uses Node `fs`/`path`. Do NOT import this from a Client
 * Component — it would pull `fs` into the client bundle and break the build.
 * The PDF generators in `pdfGenerator.ts` take the logo as an argument so they
 * can stay isomorphic; only server callers (API routes) supply it via this fn.
 */
export function getLogoBase64(): string {
  try {
    const logoPath = path.join(process.cwd(), 'public/brand/paperworking-logotype-white-transparent.png');
    const logoBuffer = fs.readFileSync(logoPath);
    return `data:image/png;base64,${logoBuffer.toString('base64')}`;
  } catch (err) {
    console.error('Failed to load logo for PDF:', err);
    return '';
  }
}
