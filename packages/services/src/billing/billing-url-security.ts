import { BillingValidationError } from './billing-errors.js';

function parseOrigin(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/** Collect trusted application origins for Stripe redirect URL validation. */
export function getAllowedBillingOrigins(): Set<string> {
  const origins = new Set<string>();
  const envCandidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.STRIPE_SUCCESS_URL,
    process.env.STRIPE_CANCEL_URL,
    process.env.STRIPE_PORTAL_RETURN_URL,
    ...(process.env.CORS_ORIGINS?.split(',') ?? []),
  ];
  for (const candidate of envCandidates) {
    const origin = parseOrigin(candidate?.trim());
    if (origin) origins.add(origin);
  }
  if (process.env.NODE_ENV !== 'production') {
    origins.add('http://localhost:3000');
    origins.add('http://127.0.0.1:3000');
  }
  return origins;
}

/**
 * Resolve a Stripe redirect URL — client-supplied URLs must match an allowlisted origin.
 */
export function resolveAllowedBillingRedirectUrl(
  clientUrl: string | undefined,
  envFallback: string | undefined,
  devDefault: string,
): string {
  const candidate = (clientUrl || envFallback || devDefault).trim();
  if (!candidate) {
    throw new BillingValidationError('Redirect URL required');
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new BillingValidationError('Invalid redirect URL');
  }

  const allowed = getAllowedBillingOrigins();
  if (allowed.size > 0 && !allowed.has(parsed.origin)) {
    throw new BillingValidationError('Redirect URL origin not allowed');
  }

  return parsed.toString();
}
