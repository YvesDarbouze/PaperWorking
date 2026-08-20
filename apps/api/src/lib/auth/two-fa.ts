export const MOCK_TOTP_CODES = new Set(['123456', '000000']);

export function isValidMockTotpCode(code: unknown): boolean {
  return typeof code === 'string' && MOCK_TOTP_CODES.has(code);
}

export function generateTwoFaSecret(): string {
  return 'JBSWY3DPEHPK3PXP';
}

export function buildOtpAuthUrl(email: string, secret: string, issuer = 'PaperWorking'): string {
  return `otpauth://totp/${issuer}:${email}?secret=${secret}&issuer=${issuer}`;
}

export function generateBackupCodes(count = 10): string[] {
  return Array.from({ length: count }, () =>
    Math.floor(10000000 + Math.random() * 90000000).toString(),
  );
}

export const TWO_FA_QR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="200" height="200">
  <rect width="100" height="100" fill="white"/>
  <rect x="10" y="10" width="30" height="30" fill="black" stroke="white" stroke-width="2"/>
  <rect x="15" y="15" width="20" height="20" fill="white"/>
  <rect x="20" y="20" width="10" height="10" fill="black"/>
  <rect x="60" y="10" width="30" height="30" fill="black" stroke="white" stroke-width="2"/>
  <rect x="65" y="65" width="20" height="20" fill="white"/>
  <rect x="70" y="70" width="10" height="10" fill="black"/>
  <rect x="10" y="60" width="30" height="30" fill="black" stroke="white" stroke-width="2"/>
  <rect x="15" y="65" width="20" height="20" fill="white"/>
  <rect x="20" y="70" width="10" height="10" fill="black"/>
  <rect x="50" y="50" width="10" height="10" fill="black"/>
  <rect x="60" y="50" width="10" height="10" fill="black"/>
  <rect x="50" y="60" width="10" height="10" fill="black"/>
  <rect x="80" y="80" width="10" height="10" fill="black"/>
  <rect x="70" y="50" width="10" height="10" fill="black"/>
</svg>`;

export type TwoFaAction = 'setup' | 'verify' | 'disable';

export function parseTwoFaAction(action: string | undefined): TwoFaAction | null {
  if (action === 'setup' || action === 'verify' || action === 'disable') {
    return action;
  }
  return null;
}
