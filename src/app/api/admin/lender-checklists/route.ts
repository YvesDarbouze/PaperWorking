import { NextRequest, NextResponse } from 'next/server';
import { isAuthError } from '@/lib/firebase-admin/auth-guard';
import { requireAdminAuth } from '@/lib/firebase-admin/admin-guard';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { DEFAULT_CHECKLIST_DEFINITIONS, parseChecklistsDoc } from '@/lib/providers/lenderChecklists';

const CONFIG_DOC = adminDb.collection('systemConfig').doc('lenderChecklists');

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminAuth(request);
    if (isAuthError(auth)) return auth;

    const snap = await CONFIG_DOC.get();
    if (!snap.exists) {
      return NextResponse.json({
        checklists: DEFAULT_CHECKLIST_DEFINITIONS,
        updatedAt: null,
        updatedByEmail: null,
      });
    }

    const data = snap.data()!;
    const checklists = parseChecklistsDoc(data);

    return NextResponse.json({
      checklists,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? null,
      updatedByEmail: data.updatedByEmail ?? null,
    });
  } catch (err: any) {
    console.error('[LenderChecklists GET]', err.message);
    return NextResponse.json({ error: 'Failed to fetch lender checklists' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdminAuth(request);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;

    const body = await request.json();
    const { Conventional, 'SBA 504': sba504, 'Hard Money': hardMoney, Bridge } = body;

    // Validate parameters are arrays of strings
    if (Conventional && (!Array.isArray(Conventional) || !Conventional.every(item => typeof item === 'string'))) {
      return NextResponse.json({ error: 'Conventional must be an array of strings' }, { status: 422 });
    }
    if (sba504 && (!Array.isArray(sba504) || !sba504.every(item => typeof item === 'string'))) {
      return NextResponse.json({ error: 'SBA 504 must be an array of strings' }, { status: 422 });
    }
    if (hardMoney && (!Array.isArray(hardMoney) || !hardMoney.every(item => typeof item === 'string'))) {
      return NextResponse.json({ error: 'Hard Money must be an array of strings' }, { status: 422 });
    }
    if (Bridge && (!Array.isArray(Bridge) || !Bridge.every(item => typeof item === 'string'))) {
      return NextResponse.json({ error: 'Bridge must be an array of strings' }, { status: 422 });
    }

    const now = FieldValue.serverTimestamp();
    const updateData = {
      Conventional: Conventional || DEFAULT_CHECKLIST_DEFINITIONS.Conventional,
      'SBA 504': sba504 || DEFAULT_CHECKLIST_DEFINITIONS['SBA 504'],
      'Hard Money': hardMoney || DEFAULT_CHECKLIST_DEFINITIONS['Hard Money'],
      Bridge: Bridge || DEFAULT_CHECKLIST_DEFINITIONS.Bridge,
      updatedAt: now,
      updatedByUid: uid,
      updatedByEmail: auth.token.email ?? '',
    };

    await CONFIG_DOC.set(updateData);

    return NextResponse.json({ success: true, checklists: parseChecklistsDoc(updateData) });
  } catch (err: any) {
    console.error('[LenderChecklists PUT]', err.message);
    return NextResponse.json({ error: err.message ?? 'Failed to update lender checklists' }, { status: 500 });
  }
}
