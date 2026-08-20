export interface BillingInvoice {
  id: string;
  number: string | null;
  date: string;
  amount: string;
  status: string;
  pdfUrl: string | null;
  hostedUrl: string | null;
}

export interface RawStripeInvoice {
  id: string;
  number: string | null;
  created: number;
  amount_due: number;
  currency: string;
  status: string | null;
  invoice_pdf?: string | null;
  hosted_invoice_url?: string | null;
}

export function formatInvoiceAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

export function mapStripeInvoice(inv: RawStripeInvoice): BillingInvoice {
  return {
    id: inv.id,
    number: inv.number,
    date: new Date(inv.created * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    amount: formatInvoiceAmount(inv.amount_due, inv.currency),
    status: inv.status ?? 'unknown',
    pdfUrl: inv.invoice_pdf ?? null,
    hostedUrl: inv.hosted_invoice_url ?? null,
  };
}

export interface PaymentMethodSummary {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  funding: string;
}

export interface RawPaymentMethodCard {
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  funding: string;
}

export function mapPaymentMethodCard(card: RawPaymentMethodCard): PaymentMethodSummary {
  return {
    brand: card.brand,
    last4: card.last4,
    expMonth: card.exp_month,
    expYear: card.exp_year,
    funding: card.funding,
  };
}

export interface CheckoutSessionStatusResponse {
  status: string;
  paymentStatus?: string | null;
  plan: string | null;
  planId?: string | null;
  billingInterval?: string | null;
  customerEmail: string | null;
  subscriptionId: string | null;
  subscriptionStatus: string | null;
  trialEnd: string | null;
}

export interface RawCheckoutSession {
  status: string | null;
  payment_status?: string | null;
  metadata?: Record<string, string | undefined>;
  customer_details?: { email?: string | null };
  customer_email?: string | null;
  subscription?: string | { id?: string; status?: string; trial_end?: number | null } | null;
}

export function mapCheckoutSessionStatus(session: RawCheckoutSession): CheckoutSessionStatusResponse {
  const subscription = session.subscription;
  const subscriptionObj =
    subscription && typeof subscription === 'object' ? subscription : null;

  return {
    status: session.status ?? 'unknown',
    paymentStatus: session.payment_status ?? null,
    plan: session.metadata?.plan ?? null,
    planId: session.metadata?.planId ?? null,
    billingInterval: session.metadata?.billingInterval ?? null,
    customerEmail:
      session.customer_details?.email ?? session.customer_email ?? null,
    subscriptionId:
      typeof subscription === 'string'
        ? subscription
        : subscriptionObj?.id ?? null,
    subscriptionStatus: subscriptionObj?.status ?? null,
    trialEnd: subscriptionObj?.trial_end
      ? new Date(subscriptionObj.trial_end * 1000).toISOString()
      : null,
  };
}
