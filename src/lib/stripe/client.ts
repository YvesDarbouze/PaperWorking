import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

export function getStripeServerClient(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY || 'sk_test_paperworking_seeder_2024';
    stripeInstance = new Stripe(key, {
      apiVersion: '2025-02-24.acacia' as any,
      typescript: true,
    });
  }
  return stripeInstance;
}
