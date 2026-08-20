export interface BillingPaymentMethod {
  id: string;
  brand?: string;
  last4?: string;
  expMonth?: number;
  expYear?: number;
  isDefault?: boolean;
  nameOnCard?: string;
  [key: string]: unknown;
}

export function validateChangePlanBody(body: {
  planId?: unknown;
}): { ok: true; planId: string; prorationMode?: string } | { ok: false; error: string; status: number } {
  const planId = typeof body.planId === 'string' ? body.planId.trim() : '';
  if (!planId) {
    return { ok: false, error: 'Missing planId', status: 400 };
  }
  const prorationMode =
    typeof (body as { prorationMode?: unknown }).prorationMode === 'string'
      ? (body as { prorationMode: string }).prorationMode
      : undefined;
  return { ok: true, planId, prorationMode };
}

export function buildChangePlanUpdate(planId: string): {
  subscriptionPlan: string;
  subscriptionStatus: string;
} {
  return {
    subscriptionPlan: planId,
    subscriptionStatus: planId === 'None' ? 'inactive' : 'active',
  };
}

export function buildCancelSubscriptionResult(): {
  subscriptionStatus: string;
  cancelAt: string;
} {
  return {
    subscriptionStatus: 'cancellation_pending',
    cancelAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

export function buildPaymentMethodFromBody(body: {
  paymentMethodId?: unknown;
  nameOnCard?: unknown;
  brand?: unknown;
  last4?: unknown;
  expiry?: unknown;
}): BillingPaymentMethod {
  const expiry = typeof body.expiry === 'string' ? body.expiry : '';
  const [expMonthRaw, expYearRaw] = expiry.split('/');
  return {
    id: typeof body.paymentMethodId === 'string' ? body.paymentMethodId : `pm_${Date.now()}`,
    brand: typeof body.brand === 'string' ? body.brand : 'visa',
    last4: typeof body.last4 === 'string' ? body.last4 : '4242',
    expMonth: expMonthRaw ? parseInt(expMonthRaw, 10) : 12,
    expYear: expYearRaw ? parseInt(`20${expYearRaw}`, 10) : 2028,
    isDefault: false,
    nameOnCard: typeof body.nameOnCard === 'string' ? body.nameOnCard : 'Cardholder',
  };
}

export function addPaymentMethod(
  currentMethods: BillingPaymentMethod[],
  newMethod: BillingPaymentMethod,
): BillingPaymentMethod[] {
  const method = { ...newMethod, isDefault: currentMethods.length === 0 };
  return [...currentMethods, method];
}

export function setDefaultPaymentMethod(
  currentMethods: BillingPaymentMethod[],
  methodId: string,
): BillingPaymentMethod[] {
  return currentMethods.map((method) => ({
    ...method,
    isDefault: method.id === methodId,
  }));
}

export function removePaymentMethod(
  currentMethods: BillingPaymentMethod[],
  methodId: string,
): BillingPaymentMethod[] {
  const updated = currentMethods.filter((method) => method.id !== methodId);
  if (
    currentMethods.find((method) => method.id === methodId)?.isDefault &&
    updated.length > 0 &&
    !updated.some((method) => method.isDefault)
  ) {
    updated[0] = { ...updated[0], isDefault: true };
  }
  return updated;
}

export function resolvePaymentMethodId(
  actionPath: string[],
  body: { id?: unknown },
): string | null {
  const fromPath = actionPath.length >= 2 ? actionPath[1] : null;
  const fromBody = typeof body.id === 'string' ? body.id : null;
  return fromPath || fromBody;
}

export function buildInvoicePdfStub(): Uint8Array {
  return new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2e, 0x31, 0x2e, 0x34]);
}

export function buildInvoiceFilename(invoiceNumber: string, invoiceId: string): string {
  return `invoice-${invoiceNumber || invoiceId}.pdf`;
}
