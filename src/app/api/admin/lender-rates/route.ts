import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { DEFAULT_RATES, parseRatesDoc } from '@/lib/providers/lenderRates';

/* ═══════════════════════════════════════════════════════════════
   GET  /api/admin/lender-rates
     Returns the current lender rates from Firestore, or DEFAULT_RATES
     if the systemConfig doc hasn't been written yet.
     Auth: any authenticated user (rates are read-only for members)

   PUT  /api/admin/lender-rates
     Replaces the rates array. Caller must be orgRole 'Lead Investor'
     or 'Admin'. Each rate gets an asOf = serverTimestamp().
     Body: { rates: [{ id, name, interestRate, points, lenderFeesCents }] }
     Auth: Lead Investor or Admin only
   ═══════════════════════════════════════════════════════════════ */

const CONFIG_DOC = adminDb.collection('systemConfig').doc('lenderRates');

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const snap = await CONFIG_DOC.get();
    if (!snap.exists) {
      return NextResponse.json({
        rates: DEFAULT_RATES.map((r) => ({ ...r, asOf: null })),
        updatedAt: null,
        updatedByEmail: null,
      });
    }

    const data = snap.data()!;
    const rates = parseRatesDoc(data).map((r) => ({
      ...r,
      asOf: r.asOf.getTime() === 0 ? null : r.asOf.toISOString(),
    }));

    return NextResponse.json({
      rates,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? null,
      updatedByEmail: data.updatedByEmail ?? null,
    });
  } catch (err: any) {
    console.error('[LenderRates GET]', err.message);
    return NextResponse.json({ error: 'Failed to fetch lender rates' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;

    // Admin gate: Lead Investor or Admin orgRole
    const userSnap = await adminDb.collection('users').doc(uid).get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const userData = userSnap.data()!;
    const orgRole = userData.orgRole ?? '';
    const isAdmin = orgRole === 'Lead Investor' || orgRole === 'Admin';
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Only Lead Investors and Admins can update lender rates' },
        { status: 403 }
      );
    }

    const body = await request.json();
    if (!Array.isArray(body.rates) || body.rates.length === 0) {
      return NextResponse.json({ error: 'rates array is required' }, { status: 422 });
    }

    const now = FieldValue.serverTimestamp();
    const rates = body.rates.map((r: any) => {
      if (!r.id || typeof r.id !== 'string') throw new Error('Each rate needs an id');
      if (typeof r.interestRate !== 'number' || r.interestRate <= 0) throw new Error(`interestRate must be a positive number for ${r.id}`);
      if (typeof r.points !== 'number' || r.points < 0) throw new Error(`points must be >= 0 for ${r.id}`);
      if (typeof r.lenderFeesCents !== 'number' || r.lenderFeesCents < 0) throw new Error(`lenderFeesCents must be >= 0 for ${r.id}`);
      return {
        id:              r.id,
        name:            String(r.name ?? r.id),
        interestRate:    r.interestRate,
        points:          r.points,
        lenderFeesCents: Math.round(r.lenderFeesCents),
        asOf:            now,
      };
    });

    await CONFIG_DOC.set({
      rates,
      updatedAt:       now,
      updatedByUid:    uid,
      updatedByEmail:  userData.email ?? '',
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[LenderRates PUT]', err.message);
    const status = err.message?.includes('Lead') ? 403 : err.message?.includes('required') || err.message?.includes('must') ? 422 : 500;
    return NextResponse.json({ error: err.message ?? 'Failed to update lender rates' }, { status });
  }
}
