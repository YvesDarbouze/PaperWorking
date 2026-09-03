import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';
import {
  buildEmailIndex,
  extractUidFromMetadata,
  resolveStripeIdentity,
} from '../stripe-linkage/resolve-identity.js';
import {
  buildSubscriptionLinkagePayload,
  planStripeLinkageRow,
} from '../stripe-linkage/plan-stripe-linkage.js';
import {
  mapStripeSubscriptionStatusForPersistence,
  resolvePlanFromStripePriceId,
} from '../stripe-linkage/stripe-field-map.js';
import type { StripeSubscriptionSnapshot } from '../stripe-linkage/types.js';

describe('stripe linkage — identity resolution', () => {
  const authUids = new Set(['uid-a', 'uid-b']);
  const uniqueEmailToUid = new Map([['owner@example.com', 'uid-a']]);
  const ambiguousEmails = new Set<string>();

  function baseInput(
    overrides: Partial<Parameters<typeof resolveStripeIdentity>[0]> = {},
  ) {
    return {
      subscriptionMetadata: {},
      customerMetadata: {},
      customerEmail: null,
      stripeCustomerId: 'cus_1',
      stripeSubscriptionId: 'sub_1',
      firestoreUsersByStripeCustomer: new Map<string, string>(),
      firestoreUsersByStripeSubscription: new Map<string, string>(),
      firestoreSubscriptionsByStripeSubscription: new Map<string, string>(),
      uniqueEmailToUid,
      ambiguousEmails,
      authUids,
      ...overrides,
    };
  }

  it('matches verified Firebase UID in subscription metadata', () => {
    const result = resolveStripeIdentity(
      baseInput({ subscriptionMetadata: { userId: 'uid-a' } }),
    );
    expect(result.uid).toBe('uid-a');
    expect(result.confidence).toBe('verified_metadata');
  });

  it('falls back to unique email when metadata absent', () => {
    const result = resolveStripeIdentity(
      baseInput({ customerEmail: 'owner@example.com' }),
    );
    expect(result.uid).toBe('uid-a');
    expect(result.confidence).toBe('unique_email');
  });

  it('skips ambiguous shared email', () => {
    const result = resolveStripeIdentity(
      baseInput({
        customerEmail: 'shared@example.com',
        ambiguousEmails: new Set(['shared@example.com']),
        uniqueEmailToUid: new Map([
          ['shared@example.com', 'uid-a'],
          ['owner@example.com', 'uid-b'],
        ]),
      }),
    );
    expect(result.uid).toBeNull();
    expect(result.confidence).toBe('ambiguous');
  });

  it('rejects conflicting UID metadata on customer vs subscription', () => {
    const result = resolveStripeIdentity(
      baseInput({
        subscriptionMetadata: { userId: 'uid-a' },
        customerMetadata: { userId: 'uid-b' },
      }),
    );
    expect(result.uid).toBeNull();
    expect(result.confidence).toBe('conflict');
  });

  it('rejects metadata UID not present in Firebase Auth', () => {
    const result = resolveStripeIdentity(
      baseInput({ subscriptionMetadata: { userId: 'uid-missing' } }),
    );
    expect(result.uid).toBeNull();
    expect(result.confidence).toBe('conflict');
  });

  it('uses existing Firestore stripeCustomerId linkage', () => {
    const result = resolveStripeIdentity(
      baseInput({
        firestoreUsersByStripeCustomer: new Map([['cus_1', 'uid-a']]),
      }),
    );
    expect(result.uid).toBe('uid-a');
    expect(result.confidence).toBe('existing_linkage');
  });

  it('ignores placeholder guest metadata for email fallback', () => {
    const result = resolveStripeIdentity(
      baseInput({
        subscriptionMetadata: { userId: 'guest' },
        customerEmail: 'owner@example.com',
      }),
    );
    expect(result.uid).toBe('uid-a');
    expect(result.confidence).toBe('unique_email');
  });
});

describe('stripe linkage — payload planning', () => {
  const previousPrice = process.env.STRIPE_PRICE_INDIVIDUAL_MONTHLY;

  beforeEach(() => {
    process.env.STRIPE_PRICE_INDIVIDUAL_MONTHLY = 'price_ind_m';
  });

  afterEach(() => {
    if (previousPrice === undefined) delete process.env.STRIPE_PRICE_INDIVIDUAL_MONTHLY;
    else process.env.STRIPE_PRICE_INDIVIDUAL_MONTHLY = previousPrice;
  });

  const stripeSub = (): StripeSubscriptionSnapshot => ({
    id: 'sub_live_1',
    customerId: 'cus_live_1',
    status: 'active',
    priceId: 'price_ind_m',
    cancelAtPeriodEnd: false,
    currentPeriodStart: 1_700_000_000,
    currentPeriodEnd: 1_702_592_000,
    trialEnd: null,
    metadata: { userId: 'uid-a' },
    customer: {
      id: 'cus_live_1',
      email: 'owner@example.com',
      metadata: { userId: 'uid-a' },
    },
  });

  it('creates subscription payload with mapped plan and status', () => {
    const built = buildSubscriptionLinkagePayload({
      uid: 'uid-a',
      stripe: stripeSub(),
      existing: null,
    });
    expect(built.payload.plan).toBe('Individual');
    expect(built.payload.status).toBe('active');
    expect(built.payload.stripeCustomerId).toBe('cus_live_1');
    expect(built.userSnapshotPayload.subscriptionPlan).toBe('Individual');
  });

  it('preserves existing subscription status when already linked', () => {
    const row = planStripeLinkageRow({
      uid: 'uid-a',
      email: 'owner@example.com',
      stripe: { ...stripeSub(), status: 'past_due' },
      existing: {
        uid: 'uid-a',
        plan: 'Individual',
        status: 'active',
        stripeCustomerId: 'cus_live_1',
        stripeSubscriptionId: 'sub_live_1',
        updatedAt: new Date(),
      },
      confidence: 'verified_metadata',
      conflictReasons: [],
    });
    expect(row.proposedAction).toBe('no-op');
  });

  it('reports unresolved Stripe price IDs', () => {
    const built = buildSubscriptionLinkagePayload({
      uid: 'uid-a',
      stripe: { ...stripeSub(), priceId: 'price_unknown' },
      existing: null,
    });
    expect(built.unresolvedPlan).toBe(true);
    expect(built.payload.unresolvedStripePriceId).toBe('price_unknown');
    expect(built.payload.plan).toBeUndefined();
  });

  it('plans idempotent no-op when linkage already complete', () => {
    const row = planStripeLinkageRow({
      uid: 'uid-a',
      email: 'owner@example.com',
      stripe: stripeSub(),
      existing: {
        uid: 'uid-a',
        plan: 'Individual',
        status: 'active',
        stripeCustomerId: 'cus_live_1',
        stripeSubscriptionId: 'sub_live_1',
        updatedAt: new Date(),
      },
      confidence: 'verified_metadata',
      conflictReasons: [],
    });
    expect(row.proposedAction).toBe('no-op');
  });

  it('maps stripe status using webhook-compatible rules', () => {
    expect(mapStripeSubscriptionStatusForPersistence('trialing')).toBe('trialing');
    expect(mapStripeSubscriptionStatusForPersistence('weird', { existingStatus: 'active' })).toBe(
      'active',
    );
    expect(resolvePlanFromStripePriceId('price_ind_m')?.canonicalName).toBe('Individual');
  });

  it('extracts UID metadata keys in priority order', () => {
    expect(extractUidFromMetadata({ userId: 'u1', uid: 'u2' })).toBe('u1');
    expect(buildEmailIndex([{ uid: 'a', email: 'x@test.com' }]).uniqueByEmail.get('x@test.com')).toBe(
      'a',
    );
  });
});
