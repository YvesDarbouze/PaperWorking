/**
 * PaperWorking Security & Compliance — CSRF Token Guard
 * 
 * Verifies CSRF protection tokens on state-changing state mutations (POST, PUT, PATCH, DELETE).
 * Webhook endpoints (/api/webhooks/*) use provider cryptographic signatures and are exempted.
 */

import { NextRequest } from 'next/server';

export function isCsrfExempt(pathname: string): boolean {
  return pathname.startsWith('/api/webhooks/') || pathname.startsWith('/api/stripe/webhook');
}

export function validateCsrfToken(request: NextRequest): { valid: boolean; reason?: string } {
  const method = request.method.toUpperCase();

  // GET, HEAD, OPTIONS are idempotent and safe
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return { valid: true };
  }

  // Exempt webhooks signed by external providers (Stripe, SendGrid, Plaid, Resend)
  if (isCsrfExempt(request.nextUrl.pathname)) {
    return { valid: true };
  }

  const headerToken = request.headers.get('x-csrf-token');
  const cookieToken = request.cookies.get('__csrf')?.value;

  // In test / server-to-server scenarios with Bearer auth, bypass CSRF requirement
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return { valid: true };
  }

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return {
      valid: false,
      reason: 'CSRF token validation failed or missing X-CSRF-Token header',
    };
  }

  return { valid: true };
}
