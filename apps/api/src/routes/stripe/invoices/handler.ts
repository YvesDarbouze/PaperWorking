import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type {
  GetStripeCustomerIdFn,
  VerifyIdTokenFn,
} from '../../../lib/auth/id-token-auth.js';
import {
  mapStripeInvoice,
  type RawStripeInvoice,
} from '../../../lib/stripe/billing-mappers.js';

export interface StripeInvoicesBody {
  idToken?: unknown;
}

export type ListCustomerInvoicesFn = (
  stripeCustomerId: string,
) => Promise<{
  invoices: RawStripeInvoice[];
  currentPeriodEnd: number | null;
}>;

export interface StripeInvoicesPostDeps {
  verifyIdToken?: VerifyIdTokenFn;
  getStripeCustomerId?: GetStripeCustomerIdFn;
  listInvoices?: ListCustomerInvoicesFn;
}

/**
 * POST /api/stripe/invoices — billing invoice history.
 */
export async function handleStripeInvoicesPost(
  body: StripeInvoicesBody,
  deps: StripeInvoicesPostDeps = {},
): Promise<RouteResult> {
  try {
    const idToken = typeof body.idToken === 'string' ? body.idToken : '';

    if (!idToken) {
      return jsonResponse(400, { error: 'Missing idToken.' });
    }

    if (!deps.verifyIdToken) {
      return jsonResponse(401, { error: 'Invalid or expired token.' });
    }

    const decoded = await deps.verifyIdToken(idToken);
    if (!decoded) {
      return jsonResponse(401, { error: 'Invalid or expired token.' });
    }

    const stripeCustomerId = deps.getStripeCustomerId
      ? await deps.getStripeCustomerId(decoded.uid)
      : null;

    if (!stripeCustomerId) {
      return jsonResponse(200, { invoices: [] });
    }

    if (!deps.listInvoices) {
      return jsonResponse(200, { invoices: [], currentPeriodEnd: null });
    }

    const { invoices, currentPeriodEnd } = await deps.listInvoices(stripeCustomerId);

    return jsonResponse(200, {
      invoices: invoices.map(mapStripeInvoice),
      currentPeriodEnd,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Stripe/Invoices] Error:', msg);
    return jsonResponse(500, { error: 'Internal server error.' });
  }
}
