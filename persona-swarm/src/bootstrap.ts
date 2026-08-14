/**
 * Persona Swarm Harness Bootstrap & Safety Guardrails
 * 
 * Enforces test-only execution parameters to prevent accidental operation
 * against production environments, live database schemas, or live Stripe keys.
 */

export interface SwarmConfig {
  baseUrl: string;
  concurrency: number;
  mode: boolean;
  stripeSecretKey: string;
  stripePublishableKey: string;
  databaseUrl: string;
}

/**
 * Asserts that active Stripe keys are strictly test-mode keys (sk_test_ / pk_test_).
 * Aborts immediately if live keys (sk_live_ / pk_live_) or non-test keys are detected.
 */
export function assertStripeTestMode(secretKey?: string, publishableKey?: string): void {
  const sk = secretKey || process.env.STRIPE_SECRET_KEY || '';
  const pk = publishableKey || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY || '';

  if (sk.startsWith('sk_live_') || pk.startsWith('pk_live_')) {
    throw new Error(
      'CRITICAL SAFETY REFUSAL: Live Stripe keys detected! Persona Swarm MUST run in test mode only (sk_test_ / pk_test_).'
    );
  }

  if (!sk.startsWith('sk_test_')) {
    throw new Error(
      `CRITICAL SAFETY REFUSAL: Invalid or missing Stripe secret test key. Key must start with "sk_test_". Received: "${sk.slice(0, 7)}..."`
    );
  }

  if (pk && !pk.startsWith('pk_test_')) {
    throw new Error(
      `CRITICAL SAFETY REFUSAL: Invalid Stripe publishable test key. Key must start with "pk_test_". Received: "${pk.slice(0, 7)}..."`
    );
  }
}

/**
 * Asserts that the target database name contains "persona_swarm" to protect dev/prod schemas.
 */
export function assertDisposableDatabase(databaseUrl?: string): void {
  const dbUrl = databaseUrl || process.env.DATABASE_URL || process.env.DIRECT_URL || '';

  if (!dbUrl.includes('persona_swarm')) {
    throw new Error(
      `CRITICAL SAFETY REFUSAL: Database connection string must point to a disposable DB containing "persona_swarm" in its name. Connection string received: "${dbUrl.replace(/:[^:@]+@/, ':****@')}"`
    );
  }
}

/**
 * Asserts that PERSONA_SWARM_MODE feature flag is explicitly enabled.
 */
export function assertSwarmFeatureFlag(modeFlag?: string): void {
  const flag = modeFlag !== undefined ? modeFlag : process.env.PERSONA_SWARM_MODE;

  if (flag !== 'true') {
    throw new Error(
      'CRITICAL SAFETY REFUSAL: PERSONA_SWARM_MODE environment variable is not set to "true". Harness execution refused.'
    );
  }
}

/**
 * Initializes and validates all environment and safety guardrails.
 */
export function bootstrapSwarm(): SwarmConfig {
  assertSwarmFeatureFlag();
  
  const sk = process.env.STRIPE_SECRET_KEY || 'sk_test_mock_persona_swarm_key';
  const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_mock_persona_swarm_key';
  assertStripeTestMode(sk, pk);

  const dbUrl = process.env.DATABASE_URL || process.env.DIRECT_URL || 'postgresql://user:pass@localhost:5432/paperworking_persona_swarm';
  assertDisposableDatabase(dbUrl);

  const baseUrl = process.env.PERSONA_SWARM_BASE_URL || 'http://localhost:3000';
  const concurrency = parseInt(process.env.PERSONA_SWARM_CONCURRENCY || '5', 10);

  return {
    baseUrl,
    concurrency: isNaN(concurrency) ? 5 : concurrency,
    mode: true,
    stripeSecretKey: sk,
    stripePublishableKey: pk,
    databaseUrl: dbUrl,
  };
}
