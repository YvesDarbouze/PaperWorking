import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import * as admin from 'firebase-admin';

interface Invoice {
  id?: string;
  number?: string;
  [key: string]: unknown;
}

interface PaymentMethod {
  id?: string;
  isDefault?: boolean;
  [key: string]: unknown;
}

export async function GET(req: NextRequest, { params }: { params: { action?: string[] } }) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const actionPath = params.action || [];
  const uid = auth.uid;

  const userDoc = await adminDb.collection('users').doc(uid).get();
  const userData = userDoc.exists ? userDoc.data() : {};

  // GET /api/billing/payment-methods
  if (actionPath.length === 1 && actionPath[0] === 'payment-methods') {
    const paymentMethods = userData?.paymentMethods || [];
    return NextResponse.json(paymentMethods);
  }

  // GET /api/billing/invoices
  if (actionPath.length === 1 && actionPath[0] === 'invoices') {
    const invoices = userData?.invoices || [];
    return NextResponse.json(invoices);
  }

  // GET /api/billing/invoices/:id/download
  if (actionPath.length === 3 && actionPath[0] === 'invoices' && actionPath[2] === 'download') {
    const invoiceId = actionPath[1];
    const invoices = userData?.invoices || [];
    const invoice: Invoice = invoices.find((i: Invoice) => i.id === invoiceId) || { number: `INV-${invoiceId}` };

    // Return dummy PDF buffer with correct headers
    const dummyPdf = Buffer.from('%PDF-1.4 ... dummy invoice PDF content ...');
    return new NextResponse(dummyPdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoice.number || invoiceId}.pdf"`,
      },
    });
  }

  return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
}

export async function POST(req: NextRequest, { params }: { params: { action?: string[] } }) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const actionPath = params.action || [];
  const uid = auth.uid;
  const body = await req.json().catch(() => ({}));

  const userRef = adminDb.collection('users').doc(uid);
  const userDoc = await userRef.get();
  const userData = userDoc.exists ? userDoc.data() : {};

  // POST /api/billing/change-plan
  if (actionPath.length === 1 && actionPath[0] === 'change-plan') {
    const { planId, prorationMode } = body;
    if (!planId) {
      return NextResponse.json({ error: 'Missing planId' }, { status: 400 });
    }

    const updatedData = {
      subscriptionPlan: planId,
      subscriptionStatus: planId === 'None' ? 'inactive' : 'active',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await userRef.update(updatedData);

    return NextResponse.json({
      success: true,
      plan: planId,
      subscriptionStatus: updatedData.subscriptionStatus,
      prorationModeApplied: prorationMode || 'none',
    });
  }

  // POST /api/billing/cancel
  if (actionPath.length === 1 && actionPath[0] === 'cancel') {
    const gracePeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await userRef.update({
      subscriptionStatus: 'cancellation_pending',
      cancelAt: gracePeriodEnd,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      subscriptionStatus: 'cancellation_pending',
      cancelAt: gracePeriodEnd,
    });
  }

  // POST /api/billing/reactivate
  if (actionPath.length === 1 && actionPath[0] === 'reactivate') {
    await userRef.update({
      subscriptionStatus: 'active',
      cancelAt: admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      subscriptionStatus: 'active',
    });
  }

  // POST /api/billing/payment-methods
  if (actionPath.length === 1 && actionPath[0] === 'payment-methods') {
    const { paymentMethodId, nameOnCard, brand, last4, expiry } = body;
    const currentMethods = userData?.paymentMethods || [];

    const newMethod = {
      id: paymentMethodId || `pm_${Date.now()}`,
      brand: brand || 'visa',
      last4: last4 || '4242',
      expMonth: expiry ? parseInt(expiry.split('/')[0]) : 12,
      expYear: expiry ? parseInt('20' + expiry.split('/')[1]) : 2028,
      isDefault: currentMethods.length === 0,
      nameOnCard: nameOnCard || 'Cardholder',
    };

    const updatedMethods = [...currentMethods, newMethod];
    await userRef.update({
      paymentMethods: updatedMethods,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, paymentMethods: updatedMethods });
  }

  return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
}

export async function PUT(req: NextRequest, { params }: { params: { action?: string[] } }) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const actionPath = params.action || [];
  const uid = auth.uid;

  const userRef = adminDb.collection('users').doc(uid);
  const userDoc = await userRef.get();
  const userData = userDoc.exists ? userDoc.data() : {};

  // PUT /api/billing/payment-methods/:id/default or body default
  if (actionPath.length >= 1 && actionPath[0] === 'payment-methods') {
    const body = await req.json().catch(() => ({}));
    const methodId = actionPath[1] || body.id;

    if (!methodId) {
      return NextResponse.json({ error: 'Missing payment method ID' }, { status: 400 });
    }

    const currentMethods = userData?.paymentMethods || [];
    const updatedMethods = currentMethods.map((m: PaymentMethod) => ({
      ...m,
      isDefault: m.id === methodId,
    }));

    await userRef.update({
      paymentMethods: updatedMethods,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, paymentMethods: updatedMethods });
  }

  return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
}

export async function DELETE(req: NextRequest, { params }: { params: { action?: string[] } }) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const actionPath = params.action || [];
  const uid = auth.uid;

  const userRef = adminDb.collection('users').doc(uid);
  const userDoc = await userRef.get();
  const userData = userDoc.exists ? userDoc.data() : {};

  // DELETE /api/billing/payment-methods/:id or body id
  if (actionPath.length >= 1 && actionPath[0] === 'payment-methods') {
    const body = await req.json().catch(() => ({}));
    const methodId = actionPath[1] || body.id;

    if (!methodId) {
      return NextResponse.json({ error: 'Missing payment method ID' }, { status: 400 });
    }

    const currentMethods = userData?.paymentMethods || [];
    const updatedMethods = currentMethods.filter((m: PaymentMethod) => m.id !== methodId);

    // If default method is removed, assign default to another method
    if (currentMethods.find((m: PaymentMethod) => m.id === methodId)?.isDefault && updatedMethods.length > 0) {
      updatedMethods[0].isDefault = true;
    }

    await userRef.update({
      paymentMethods: updatedMethods,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, paymentMethods: updatedMethods });
  }

  return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
}
