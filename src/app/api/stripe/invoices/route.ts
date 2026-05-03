import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

/* ═══════════════════════════════════════════════════════
   POST /api/stripe/invoices

   Authenticated (idToken in body). Returns the user's
   last 24 Stripe invoices, formatted for the billing UI.

   Body:  { idToken: string }
   200:   { invoices: Invoice[] }
   400:   missing idToken / no billing account
   401:   invalid token
   500:   internal error
   ═══════════════════════════════════════════════════════ */

export const dynamic = 'force-dynamic';

export interface BillingInvoice {
  id: string;
  number: string | null;
  date: string;
  amount: string;
  status: string;
  pdfUrl: string | null;
  hostedUrl: string | null;
}

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  return new Stripe(key, { apiVersion: '2026-03-25.dahlia' });
}

function fmtAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

export async function POST(request: Request) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json({ error: 'Missing idToken.' }, { status: 400 });
    }

    const decoded = await adminAuth.verifyIdToken(idToken).catch(() => null);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid or expired token.' }, { status: 401 });
    }

    const userSnap = await adminDb.collection('users').doc(decoded.uid).get();
    const stripeCustomerId = userSnap.data()?.stripeCustomerId as string | undefined;

    if (!stripeCustomerId) {
      return NextResponse.json({ invoices: [] }, { status: 200 });
    }

    const stripe = getStripe();
    const { data } = await stripe.invoices.list({
      customer: stripeCustomerId,
      limit: 24,
      status: undefined,
    });

    const invoices: BillingInvoice[] = data.map((inv) => ({
      id: inv.id,
      number: inv.number,
      date: new Date(inv.created * 1000).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      amount: fmtAmount(inv.amount_due, inv.currency),
      status: inv.status ?? 'unknown',
      pdfUrl: inv.invoice_pdf ?? null,
      hostedUrl: inv.hosted_invoice_url ?? null,
    }));

    return NextResponse.json({ invoices }, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Stripe/Invoices] Error:', msg);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
