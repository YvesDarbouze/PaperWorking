/**
 * Flag to enable/disable demo simulations (Plaid feeds, document upload simulations,
 * and gate progression simulation triggers).
 * Set NEXT_PUBLIC_DEMO_MODE=true in .env to enable. Defaults to false.
 */
export const IS_DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || process.env.NODE_ENV === 'test';
