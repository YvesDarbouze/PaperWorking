/**
 * Flag to enable/disable demo simulations (Plaid feeds, document upload simulations,
 * OCR scan fallback, and gate progression simulation triggers).
 * Set NEXT_PUBLIC_DEMO_MODE=true in .env to enable. Defaults to false.
 */
export const IS_DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || process.env.NODE_ENV === 'test';

/**
 * Flag to enable/disable AI-assisted document extraction (Gemini OCR).
 * Set NEXT_PUBLIC_ENABLE_OCR=true in .env to enable. Defaults to false.
 */
export const ENABLE_OCR = process.env.NEXT_PUBLIC_ENABLE_OCR === 'true';

