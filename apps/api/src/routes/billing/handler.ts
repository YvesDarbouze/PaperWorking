import {
  binaryResponse,
  jsonResponse,
  type RouteResult,
} from '../../http/response.js';
import type { RequireAuthFn } from '../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../lib/auth/auth-types.js';
import {
  addPaymentMethod,
  buildCancelSubscriptionResult,
  buildChangePlanUpdate,
  buildInvoiceFilename,
  buildInvoicePdfStub,
  buildPaymentMethodFromBody,
  removePaymentMethod,
  resolvePaymentMethodId,
  setDefaultPaymentMethod,
  validateChangePlanBody,
  type BillingPaymentMethod,
} from '../../lib/billing/helpers.js';

export type LoadBillingUserFn = (
  uid: string,
) => Promise<{ paymentMethods: BillingPaymentMethod[]; invoices: Array<Record<string, unknown>> }>;

export type UpdateBillingUserFn = (
  uid: string,
  patch: Record<string, unknown>,
) => Promise<void>;

export interface BillingHandlerDeps {
  requireAuth?: RequireAuthFn;
  loadUser?: LoadBillingUserFn;
  updateUser?: UpdateBillingUserFn;
}

/**
 * GET /api/billing/*
 */
export async function handleBillingGet(
  actionPath: string[],
  deps: BillingHandlerDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  const user = deps.loadUser
    ? await deps.loadUser(auth.uid)
    : { paymentMethods: [], invoices: [] };

  if (actionPath.length === 1 && actionPath[0] === 'payment-methods') {
    return jsonResponse(200, user.paymentMethods);
  }

  if (actionPath.length === 1 && actionPath[0] === 'invoices') {
    return jsonResponse(200, user.invoices);
  }

  if (actionPath.length === 3 && actionPath[0] === 'invoices' && actionPath[2] === 'download') {
    const invoiceId = actionPath[1];
    const invoice =
      user.invoices.find((item) => item.id === invoiceId) ||
      ({ number: `INV-${invoiceId}` } as Record<string, unknown>);
    const filename = buildInvoiceFilename(String(invoice.number || ''), invoiceId);
    return binaryResponse(200, buildInvoicePdfStub(), {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
  }

  return jsonResponse(404, { error: 'Endpoint not found' });
}

/**
 * POST /api/billing/*
 */
export async function handleBillingPost(
  actionPath: string[],
  body: Record<string, unknown>,
  deps: BillingHandlerDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  const user = deps.loadUser
    ? await deps.loadUser(auth.uid)
    : { paymentMethods: [], invoices: [] };

  if (actionPath.length === 1 && actionPath[0] === 'change-plan') {
    const validated = validateChangePlanBody(body);
    if (!validated.ok) return jsonResponse(validated.status, { error: validated.error });
    const updated = buildChangePlanUpdate(validated.planId);
    if (deps.updateUser) await deps.updateUser(auth.uid, updated);
    return jsonResponse(200, {
      success: true,
      plan: validated.planId,
      subscriptionStatus: updated.subscriptionStatus,
      prorationModeApplied: validated.prorationMode || 'none',
    });
  }

  if (actionPath.length === 1 && actionPath[0] === 'cancel') {
    const cancel = buildCancelSubscriptionResult();
    if (deps.updateUser) await deps.updateUser(auth.uid, cancel);
    return jsonResponse(200, { success: true, ...cancel });
  }

  if (actionPath.length === 1 && actionPath[0] === 'reactivate') {
    if (deps.updateUser) {
      await deps.updateUser(auth.uid, { subscriptionStatus: 'active', cancelAt: null });
    }
    return jsonResponse(200, { success: true, subscriptionStatus: 'active' });
  }

  if (actionPath.length === 1 && actionPath[0] === 'payment-methods') {
    const newMethod = buildPaymentMethodFromBody(body);
    const updatedMethods = addPaymentMethod(user.paymentMethods, newMethod);
    if (deps.updateUser) await deps.updateUser(auth.uid, { paymentMethods: updatedMethods });
    return jsonResponse(200, { success: true, paymentMethods: updatedMethods });
  }

  return jsonResponse(404, { error: 'Endpoint not found' });
}

/**
 * PUT /api/billing/*
 */
export async function handleBillingPut(
  actionPath: string[],
  body: Record<string, unknown>,
  deps: BillingHandlerDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  if (actionPath.length >= 1 && actionPath[0] === 'payment-methods') {
    const methodId = resolvePaymentMethodId(actionPath, body);
    if (!methodId) return jsonResponse(400, { error: 'Missing payment method ID' });

    const user = deps.loadUser
      ? await deps.loadUser(auth.uid)
      : { paymentMethods: [], invoices: [] };
    const updatedMethods = setDefaultPaymentMethod(user.paymentMethods, methodId);
    if (deps.updateUser) await deps.updateUser(auth.uid, { paymentMethods: updatedMethods });
    return jsonResponse(200, { success: true, paymentMethods: updatedMethods });
  }

  return jsonResponse(404, { error: 'Endpoint not found' });
}

/**
 * DELETE /api/billing/*
 */
export async function handleBillingDelete(
  actionPath: string[],
  body: Record<string, unknown>,
  deps: BillingHandlerDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  if (actionPath.length >= 1 && actionPath[0] === 'payment-methods') {
    const methodId = resolvePaymentMethodId(actionPath, body);
    if (!methodId) return jsonResponse(400, { error: 'Missing payment method ID' });

    const user = deps.loadUser
      ? await deps.loadUser(auth.uid)
      : { paymentMethods: [], invoices: [] };
    const updatedMethods = removePaymentMethod(user.paymentMethods, methodId);
    if (deps.updateUser) await deps.updateUser(auth.uid, { paymentMethods: updatedMethods });
    return jsonResponse(200, { success: true, paymentMethods: updatedMethods });
  }

  return jsonResponse(404, { error: 'Endpoint not found' });
}
