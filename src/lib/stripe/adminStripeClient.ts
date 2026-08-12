import Stripe from 'stripe';

/**
 * Restricted-Key Stripe Client Abstraction for Admin Surface (Amendment C)
 * Prioritizes STRIPE_RESTRICTED_KEY for admin operations without altering webhook key usage.
 */
export function getAdminStripeClient(): Stripe | null {
  const restrictedKey = process.env.STRIPE_RESTRICTED_KEY;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const apiKey = restrictedKey || secretKey;

  if (!apiKey) {
    console.warn('[AdminStripeClient] Neither STRIPE_RESTRICTED_KEY nor STRIPE_SECRET_KEY is configured.');
    return null;
  }

  return new Stripe(apiKey, {
    apiVersion: '2026-04-22.dahlia' as any,
  });
}
