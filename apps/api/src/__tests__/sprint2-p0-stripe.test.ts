/**
 * Sprint 2 P0 — Stripe session-status ownership + production fail-closed.
 */
import { describe, expect, it } from '@jest/globals';
import { ForbiddenException, ServiceUnavailableException } from '@nestjs/common';

function stripeMockAllowed(nodeEnv: string | undefined, useMock?: string): boolean {
  if (nodeEnv === 'production') return false;
  if (useMock === 'false' || useMock === '0') return false;
  return true;
}

function assertStripeSessionOwnedByUser(
  userUid: string,
  session: {
    client_reference_id?: string | null;
    metadata?: Record<string, unknown> | null;
    customer?: string | null;
  },
  ownedCustomerId?: string | null,
): void {
  const metaUser =
    session.metadata && typeof session.metadata.userId === 'string'
      ? session.metadata.userId
      : null;
  const ref = session.client_reference_id || null;
  if (ref === userUid || metaUser === userUid) return;
  if (ownedCustomerId && session.customer && session.customer === ownedCustomerId) return;
  throw new ForbiddenException({ error: 'Forbidden', reason: 'stripe_session' });
}

function sessionStatus(
  user: { uid: string },
  sessionId: string | undefined,
  opts: {
    nodeEnv?: string;
    useMock?: string;
    stripeKey?: string;
    retrieve?: () => {
      id: string;
      status: string;
      payment_status: string;
      client_reference_id?: string | null;
      metadata?: Record<string, unknown> | null;
      customer?: string | null;
    };
    ownedCustomerId?: string | null;
  },
) {
  if (!sessionId) throw new Error('session_id required');

  if (sessionId.startsWith('cs_test_mock_')) {
    if (!stripeMockAllowed(opts.nodeEnv, opts.useMock)) {
      throw new ServiceUnavailableException({
        error: 'Stripe session verification unavailable',
      });
    }
    const prefix = `cs_test_mock_${user.uid}_`;
    if (!sessionId.startsWith(prefix)) {
      throw new ForbiddenException({ error: 'Forbidden', reason: 'stripe_session' });
    }
    return {
      success: true,
      session: { id: sessionId, status: 'complete', payment_status: 'paid', mock: true },
    };
  }

  if (!opts.stripeKey) {
    throw new ServiceUnavailableException({
      error: 'Stripe session verification unavailable',
    });
  }
  if (!opts.retrieve) {
    throw new ServiceUnavailableException({
      error: 'Stripe session verification unavailable',
    });
  }
  const session = opts.retrieve();
  assertStripeSessionOwnedByUser(user.uid, session, opts.ownedCustomerId);
  return {
    success: true,
    session: {
      id: session.id,
      status: session.status,
      payment_status: session.payment_status,
      customer: session.customer,
    },
  };
}

describe('Sprint 2 P0 — Stripe session-status', () => {
  const owner = { uid: 'dev-user-1' };
  const foreign = { uid: 'attacker' };

  it('authenticated owner mock session → success', () => {
    const res = sessionStatus(owner, `cs_test_mock_${owner.uid}_123`, {
      nodeEnv: 'development',
      useMock: 'true',
    });
    expect(res.session.payment_status).toBe('paid');
    expect(res.session.mock).toBe(true);
  });

  it('authenticated foreign user mock session → rejected', () => {
    expect(() =>
      sessionStatus(foreign, `cs_test_mock_${owner.uid}_123`, {
        nodeEnv: 'development',
        useMock: 'true',
      }),
    ).toThrow(ForbiddenException);
  });

  it('production + mock payment state → must NOT return fake paid', () => {
    expect(() =>
      sessionStatus(owner, `cs_test_mock_${owner.uid}_123`, {
        nodeEnv: 'production',
        useMock: 'true',
      }),
    ).toThrow(ServiceUnavailableException);

    expect(() =>
      sessionStatus(owner, 'cs_live_arbitrary', {
        nodeEnv: 'production',
        // no stripe key → fail closed, never mock paid
      }),
    ).toThrow(ServiceUnavailableException);
  });

  it('valid Stripe session owned by user → correct status', () => {
    const res = sessionStatus(owner, 'cs_test_real_1', {
      nodeEnv: 'production',
      stripeKey: 'sk_test',
      retrieve: () => ({
        id: 'cs_test_real_1',
        status: 'complete',
        payment_status: 'paid',
        client_reference_id: owner.uid,
        metadata: { userId: owner.uid },
        customer: 'cus_1',
      }),
    });
    expect(res.session.payment_status).toBe('paid');
    expect(res.session.mock).toBeUndefined();
  });

  it('foreign Stripe session → rejected', () => {
    expect(() =>
      sessionStatus(owner, 'cs_test_real_2', {
        nodeEnv: 'production',
        stripeKey: 'sk_test',
        ownedCustomerId: 'cus_owner',
        retrieve: () => ({
          id: 'cs_test_real_2',
          status: 'complete',
          payment_status: 'paid',
          client_reference_id: 'other-user',
          metadata: { userId: 'other-user' },
          customer: 'cus_other',
        }),
      }),
    ).toThrow(ForbiddenException);
  });

  it('invalid/nonexistent session without Stripe → fail closed', () => {
    expect(() =>
      sessionStatus(owner, 'cs_unknown', {
        nodeEnv: 'development',
        useMock: 'true',
        // no key / retrieve
      }),
    ).toThrow(ServiceUnavailableException);
  });

  it('client query user_id is irrelevant — ownership from session only', () => {
    // Even if a client "wanted" to claim ownership, we only look at retrieved session fields.
    expect(() =>
      sessionStatus(foreign, `cs_test_mock_${owner.uid}_999`, {
        nodeEnv: 'development',
        useMock: 'true',
      }),
    ).toThrow(ForbiddenException);
  });
});
