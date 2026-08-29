import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types.js';
import { AuthorizationService } from '../authz/authorization.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

/** Free-tier plan ids — may activate without Stripe. */
const FREE_PLANS = new Set(['individual', 'free', 'trial', 'none', '']);

function isFreePlan(planId: string): boolean {
  return FREE_PLANS.has(planId.trim().toLowerCase());
}

function hasVerifiedPaidSubscription(sub: {
  stripeSubscriptionId: string | null;
  status: string | null;
}): boolean {
  if (!sub.stripeSubscriptionId) return false;
  const status = (sub.status || '').toLowerCase();
  return status === 'active' || status === 'trialing';
}

type PaymentMethod = {
  id: string;
  brand?: string;
  last4?: string;
  expMonth?: number;
  expYear?: number;
  isDefault?: boolean;
};

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthorizationService,
  ) {}

  private async getOrCreateSubscription(userId: string) {
    let sub = await this.prisma.subscription.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
    if (!sub) {
      sub = await this.prisma.subscription.create({
        data: {
          userId,
          plan: 'Individual',
          status: 'active',
        },
      });
    }
    return sub;
  }

  private paymentMethodsFromSub(sub: { id: string }): PaymentMethod[] {
    // Subscription schema has no paymentMethods JSON column — return empty unless extended later.
    void sub;
    return [];
  }

  private parseBillingPath(reqPath: string): string[] {
    const idx = reqPath.indexOf('/api/billing');
    const rest = idx >= 0 ? reqPath.slice(idx + '/api/billing'.length) : reqPath;
    return rest.split('/').filter(Boolean);
  }

  async billingGet(user: AuthUser, reqPath: string) {
    const actionPath = this.parseBillingPath(reqPath);
    const sub = await this.getOrCreateSubscription(user.uid);
    const paymentMethods = this.paymentMethodsFromSub(sub);

    if (actionPath.length === 0) {
      return {
        success: true,
        subscription: {
          id: sub.id,
          plan: sub.plan,
          status: sub.status,
          stripeCustomerId: sub.stripeCustomerId,
          stripeSubscriptionId: sub.stripeSubscriptionId,
        },
        paymentMethods,
        invoices: [],
      };
    }

    if (actionPath.length === 1 && actionPath[0] === 'payment-methods') {
      return paymentMethods;
    }

    if (actionPath.length === 1 && actionPath[0] === 'invoices') {
      return [];
    }

    if (
      actionPath.length === 3 &&
      actionPath[0] === 'invoices' &&
      actionPath[2] === 'download'
    ) {
      return {
        success: true,
        invoiceId: actionPath[1],
        stub: true,
        message: 'Invoice PDF stub — no binary storage configured',
      };
    }

    throw new BadRequestException({ error: 'Endpoint not found' });
  }

  async billingMutate(
    user: AuthUser,
    method: string,
    reqPath: string,
    body: Record<string, unknown>,
  ) {
    this.authz.assertPermission(user, 'billing.manage');
    const actionPath = this.parseBillingPath(reqPath);
    const sub = await this.getOrCreateSubscription(user.uid);

    // Never trust client-supplied payment/subscription status.
    void body.status;
    void body.subscriptionStatus;
    void body.paymentStatus;
    void body.stripeSubscriptionId;
    void body.organizationId;

    if (method === 'POST' && actionPath[0] === 'change-plan') {
      const planId = String(body.planId || body.plan || '');
      if (!planId) throw new BadRequestException({ error: 'planId required' });

      if (isFreePlan(planId)) {
        const updated = await this.prisma.subscription.update({
          where: { id: sub.id },
          data: { plan: planId, status: 'active' },
        });
        return {
          success: true,
          plan: planId,
          subscriptionStatus: updated.status,
          entitlement: 'free',
          prorationModeApplied: 'none',
        };
      }

      // Paid plan: require verified Stripe subscription — never activate from client alone.
      if (!hasVerifiedPaidSubscription(sub)) {
        throw new ForbiddenException({
          error: 'Payment required',
          code: 'CHECKOUT_REQUIRED',
          message: 'Use Stripe checkout to activate a paid plan',
        });
      }

      // Already paid via webhook — allow plan label update without flipping unpaid→active.
      const updated = await this.prisma.subscription.update({
        where: { id: sub.id },
        data: { plan: planId },
      });
      return {
        success: true,
        plan: planId,
        subscriptionStatus: updated.status,
        entitlement: 'paid',
        prorationModeApplied: body.prorationMode || 'none',
      };
    }

    if (method === 'POST' && actionPath[0] === 'cancel') {
      const updated = await this.prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'canceled' },
      });
      return { success: true, subscriptionStatus: updated.status };
    }

    if (method === 'POST' && actionPath[0] === 'reactivate') {
      if (isFreePlan(sub.plan || 'Individual')) {
        const updated = await this.prisma.subscription.update({
          where: { id: sub.id },
          data: { status: 'active' },
        });
        return { success: true, subscriptionStatus: updated.status, entitlement: 'free' };
      }
      if (!sub.stripeSubscriptionId) {
        throw new ForbiddenException({
          error: 'Payment required',
          code: 'CHECKOUT_REQUIRED',
          message: 'Cannot reactivate a paid plan without Stripe subscription',
        });
      }
      // Do not invent Stripe resume — require portal / webhook for paid.
      throw new ForbiddenException({
        error: 'Use Stripe customer portal to reactivate',
        code: 'PORTAL_REQUIRED',
      });
    }

    if (method === 'POST' && actionPath[0] === 'payment-methods') {
      return {
        success: true,
        paymentMethods: [],
        message: 'Payment methods require Stripe; returning empty list',
      };
    }

    if (method === 'DELETE' && actionPath[0] === 'payment-methods') {
      return { success: true, paymentMethods: [] };
    }

    if (method === 'PUT' && actionPath[0] === 'payment-methods' && actionPath[1] === 'default') {
      return { success: true, paymentMethods: [] };
    }

    if (method === 'PUT' || method === 'POST' || method === 'DELETE') {
      return {
        success: true,
        path: actionPath,
        subscription: {
          id: sub.id,
          plan: sub.plan,
          status: sub.status,
        },
      };
    }

    throw new BadRequestException({ error: 'Endpoint not found' });
  }

  private requireStripeKey(): string {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new ServiceUnavailableException({ error: 'Stripe not configured' });
    }
    return key;
  }

  async checkout(user: AuthUser, body: Record<string, unknown>) {
    const priceId = String(body.priceId || body.price || '');
    const successUrl = String(
      body.successUrl || process.env.STRIPE_SUCCESS_URL || 'http://localhost:3000/billing?success=1',
    );
    const cancelUrl = String(
      body.cancelUrl || process.env.STRIPE_CANCEL_URL || 'http://localhost:3000/billing?canceled=1',
    );

    const key = process.env.STRIPE_SECRET_KEY;
    if (key) {
      try {
        // Optional stripe SDK — dynamic import so build works without the dependency.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Stripe = (await import('stripe' as string).catch(() => null)) as any;
        if (Stripe) {
          const stripe = new Stripe.default ? new Stripe.default(key) : new Stripe(key);
          const sub = await this.getOrCreateSubscription(user.uid);
          const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            customer: sub.stripeCustomerId || undefined,
            line_items: priceId ? [{ price: priceId, quantity: 1 }] : undefined,
            success_url: successUrl,
            cancel_url: cancelUrl,
            client_reference_id: user.uid,
            metadata: { userId: user.uid },
          });
          return { success: true, url: session.url, sessionId: session.id };
        }
      } catch {
        /* fall through */
      }
      if (process.env.NODE_ENV === 'production') {
        throw new ServiceUnavailableException({ error: 'Stripe SDK unavailable' });
      }
    } else if (process.env.NODE_ENV === 'production' || !this.stripeMockAllowed()) {
      throw new ServiceUnavailableException({ error: 'Stripe not configured' });
    }

    // Non-prod mock only — encodes owner uid for session-status binding.
    const sessionId = `cs_test_mock_${user.uid}_${Date.now()}`;
    return {
      success: true,
      url: `${successUrl}${successUrl.includes('?') ? '&' : '?'}session_id=${sessionId}`,
      sessionId,
      mock: true,
    };
  }

  async portal(user: AuthUser, body: Record<string, unknown>) {
    const returnUrl = String(
      body.returnUrl || process.env.STRIPE_PORTAL_RETURN_URL || 'http://localhost:3000/billing',
    );
    const sub = await this.getOrCreateSubscription(user.uid);
    const key = process.env.STRIPE_SECRET_KEY;

    if (key) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Stripe = (await import('stripe' as string).catch(() => null)) as any;
        if (Stripe && sub.stripeCustomerId) {
          const stripe = new Stripe.default ? new Stripe.default(key) : new Stripe(key);
          const session = await stripe.billingPortal.sessions.create({
            customer: sub.stripeCustomerId,
            return_url: returnUrl,
          });
          return { success: true, url: session.url };
        }
      } catch {
        /* fall through */
      }
      if (process.env.NODE_ENV === 'production') {
        throw new ServiceUnavailableException({ error: 'Stripe portal unavailable' });
      }
    } else if (process.env.NODE_ENV === 'production' || !this.stripeMockAllowed()) {
      throw new ServiceUnavailableException({ error: 'Stripe not configured' });
    }

    return { success: true, url: returnUrl, mock: true };
  }

  /**
   * Mock Stripe responses are allowed only outside production and when mock data
   * is not explicitly disabled (aligned with FE USE_MOCK_DATA semantics).
   */
  private stripeMockAllowed(): boolean {
    if (process.env.NODE_ENV === 'production') return false;
    const flag = process.env.USE_MOCK_DATA ?? process.env.ENABLE_MOCK_AUTH;
    if (flag === 'false' || flag === '0') return false;
    return true;
  }

  /**
   * Bind a Stripe checkout session to the authenticated user using server-side
   * session fields only — never client-supplied user/account/org IDs.
   */
  private assertStripeSessionOwnedByUser(
    user: AuthUser,
    session: {
      client_reference_id?: string | null;
      metadata?: Record<string, unknown> | null;
      customer?: string | { id?: string } | null;
    },
    ownedCustomerId?: string | null,
  ): void {
    const metaUser =
      session.metadata && typeof session.metadata.userId === 'string'
        ? session.metadata.userId
        : null;
    const ref = session.client_reference_id || null;
    if (ref === user.uid || metaUser === user.uid) return;

    const customerId =
      typeof session.customer === 'string'
        ? session.customer
        : session.customer && typeof session.customer === 'object'
          ? session.customer.id
          : null;
    if (ownedCustomerId && customerId && customerId === ownedCustomerId) return;

    throw new ForbiddenException({ error: 'Forbidden', reason: 'stripe_session' });
  }

  async sessionStatus(user: AuthUser, sessionId?: string) {
    if (!sessionId) throw new BadRequestException({ error: 'session_id required' });

    // Non-prod mock sessions minted by checkout: cs_test_mock_{uid}_{ts}
    if (sessionId.startsWith('cs_test_mock_')) {
      if (!this.stripeMockAllowed()) {
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
        session: {
          id: sessionId,
          status: 'complete',
          payment_status: 'paid',
          mock: true,
        },
      };
    }

    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      // Fail closed — never return fake paid for real-looking session ids.
      throw new ServiceUnavailableException({
        error: 'Stripe session verification unavailable',
      });
    }

    const sub = await this.prisma.subscription.findFirst({
      where: { userId: user.uid },
      orderBy: { updatedAt: 'desc' },
    });

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Stripe = (await import('stripe' as string).catch(() => null)) as any;
      if (!Stripe) {
        throw new ServiceUnavailableException({
          error: 'Stripe session verification unavailable',
        });
      }
      const stripe = new Stripe.default ? new Stripe.default(key) : new Stripe(key);
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      this.assertStripeSessionOwnedByUser(user, session, sub?.stripeCustomerId);

      return {
        success: true,
        session: {
          id: session.id,
          status: session.status,
          payment_status: session.payment_status,
          customer: session.customer,
        },
      };
    } catch (err) {
      if (
        err instanceof ForbiddenException ||
        err instanceof ServiceUnavailableException ||
        err instanceof BadRequestException
      ) {
        throw err;
      }
      throw new NotFoundException({ error: 'Stripe session not found' });
    }
  }

  async webhook(
    rawBody: Buffer | string,
    signature: string | undefined,
  ) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      throw new BadRequestException({ error: 'Webhook secret not configured' });
    }
    if (!signature) {
      throw new BadRequestException({ error: 'Missing stripe-signature header' });
    }

    // Production and non-prod: never accept unsigned JSON. Mock payloads must not
    // grant entitlement without constructEvent verification.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Stripe = (await import('stripe' as string).catch(() => null)) as any;
    if (!Stripe) {
      throw new BadRequestException({
        error: 'Unable to verify webhook signature',
        code: 'STRIPE_SDK_UNAVAILABLE',
      });
    }

    let event: {
      id?: string;
      type: string;
      data?: { object?: Record<string, unknown> };
    };
    try {
      const key = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';
      const stripe = new Stripe.default ? new Stripe.default(key) : new Stripe(key);
      event = stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch (err) {
      throw new BadRequestException({
        error: 'Invalid stripe signature',
        details: err instanceof Error ? err.message : String(err),
      });
    }

    // Idempotent-ish: apply status from verified event only; no entitlement from
    // client-supplied metadata alone. Missing user binding → acknowledge, no grant.
    // Full event-id dedupe table: not available without schema migration (documented).
    const object = event.data?.object || {};

    if (event.type === 'checkout.session.completed') {
      const userId = String(
        object.client_reference_id ||
          (object.metadata as Record<string, unknown> | undefined)?.userId ||
          '',
      );
      if (!userId) {
        return { received: true, applied: false, reason: 'missing_user_binding' };
      }
      const sub = await this.getOrCreateSubscription(userId);
      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: {
          status: 'active',
          stripeCustomerId: object.customer
            ? String(object.customer)
            : sub.stripeCustomerId,
          stripeSubscriptionId: object.subscription
            ? String(object.subscription)
            : sub.stripeSubscriptionId,
        },
      });
      return { received: true, applied: true, eventType: event.type };
    }

    if (
      event.type === 'customer.subscription.deleted' ||
      event.type === 'customer.subscription.updated'
    ) {
      const stripeSubId = object.id ? String(object.id) : '';
      const status = String(object.status || '').toLowerCase();
      if (!stripeSubId) {
        return { received: true, applied: false, reason: 'unknown_subscription' };
      }
      const existing = await this.prisma.subscription.findFirst({
        where: { stripeSubscriptionId: stripeSubId },
      });
      if (!existing) {
        return { received: true, applied: false, reason: 'unknown_subscription' };
      }
      const nextStatus =
        event.type === 'customer.subscription.deleted'
          ? 'canceled'
          : status === 'active' || status === 'trialing' || status === 'past_due' || status === 'canceled'
            ? status
            : existing.status;
      await this.prisma.subscription.update({
        where: { id: existing.id },
        data: { status: nextStatus },
      });
      return { received: true, applied: true, eventType: event.type };
    }

    if (event.type === 'invoice.payment_failed') {
      const stripeSubId = object.subscription ? String(object.subscription) : '';
      if (!stripeSubId) {
        return { received: true, applied: false, reason: 'unknown_subscription' };
      }
      const existing = await this.prisma.subscription.findFirst({
        where: { stripeSubscriptionId: stripeSubId },
      });
      if (!existing) {
        return { received: true, applied: false, reason: 'unknown_subscription' };
      }
      await this.prisma.subscription.update({
        where: { id: existing.id },
        data: { status: 'past_due' },
      });
      return { received: true, applied: true, eventType: event.type };
    }

    return { received: true, applied: false, eventType: event.type };
  }
}
