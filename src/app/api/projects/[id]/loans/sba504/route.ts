import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import { writeActivityLog } from '@/lib/firebase/activityLogWriter';
import { NotificationService } from '@/lib/services/notificationService';

export const dynamic = 'force-dynamic';

/**
 * POST /api/projects/[id]/loans/sba504
 *
 * Records SBA 504 eligibility inputs and applies the FX-7 structure:
 *   Bank 50% First Lien + CDC Debenture + Borrower Equity Injection = 100%.
 *
 * Guarded reconciliation:
 *   - Updates existing Bank and CDC loan records in the `loans` subcollection
 *     (identified by lenderName) — never deletes unrelated records.
 *   - Upserts the borrower injection into `financials.capitalStack` without
 *     overwriting other equity sources.
 */

async function verifyProjectMembership(projectId: string, uid: string) {
  const snap = await adminDb.collection('projects').doc(projectId).get();
  if (!snap.exists) return null;
  const data = snap.data()!;
  const isOwner = data.ownerUid === uid;
  const isMember = !!data.members?.[uid] || data.teamMemberIds?.includes(uid);
  const isOrgMember = data.organizationId
    ? await adminDb.collection('organizations').doc(data.organizationId).get().then((o) => {
        if (!o.exists) return false;
        const od = o.data()!;
        return od.ownerUid === uid || od.teamMembers?.some((m: any) => m.id === uid && m.status === 'active');
      })
    : false;
  if (!isOwner && !isMember && !isOrgMember) return null;
  return data;
}

const VALID_OCCUPANCY_TYPES = ['existing', 'new_construction'] as const;
const VALID_INJECTION_TIERS = [10, 15, 20] as const;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;

    const { id: projectId } = await params;

    const project = await verifyProjectMembership(projectId, uid);
    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
    }

    const body = await request.json();
    const {
      occupancyType,
      occupancyRate,
      occupancyRateTenYears,
      paydexScore,
      paydexSource,
      sbssScore,
      sbssSource,
      intelliscoreScore,
      intelliscoreSource,
      injectionTier,
    } = body;

    // ── Validation ───────────────────────────────────────────────────────
    if (!occupancyType || !VALID_OCCUPANCY_TYPES.includes(occupancyType)) {
      return NextResponse.json(
        { error: `occupancyType must be one of: ${VALID_OCCUPANCY_TYPES.join(', ')}` },
        { status: 422 }
      );
    }

    if (occupancyRate == null || typeof occupancyRate !== 'number' || occupancyRate < 0 || occupancyRate > 100) {
      return NextResponse.json(
        { error: 'occupancyRate must be a number between 0 and 100' },
        { status: 422 }
      );
    }

    if (occupancyType === 'new_construction') {
      if (occupancyRateTenYears == null || typeof occupancyRateTenYears !== 'number' || occupancyRateTenYears < 0 || occupancyRateTenYears > 100) {
        return NextResponse.json(
          { error: 'occupancyRateTenYears is required for new_construction and must be 0-100' },
          { status: 422 }
        );
      }
    }

    if (!injectionTier || !VALID_INJECTION_TIERS.includes(injectionTier)) {
      return NextResponse.json(
        { error: `injectionTier must be one of: ${VALID_INJECTION_TIERS.join(', ')}` },
        { status: 422 }
      );
    }

    // ── FX-7 Structure Calculation ───────────────────────────────────────
    const purchasePrice = project.financials?.purchasePrice || 0;
    if (purchasePrice <= 0) {
      return NextResponse.json(
        { error: 'Purchase price must be set before configuring SBA 504 structure.' },
        { status: 400 }
      );
    }

    const bankPct = 50;
    const injectionPct = injectionTier as number;
    const cdcPct = 100 - bankPct - injectionPct; // 40%, 35%, or 30%

    const bankAmountCents = Math.round(purchasePrice * (bankPct / 100) * 100);
    const cdcAmountCents = Math.round(purchasePrice * (cdcPct / 100) * 100);
    const injectionAmountCents = Math.round(purchasePrice * (injectionPct / 100) * 100);

    // ── Guarded Loan Record Updates ──────────────────────────────────────
    const loansColl = adminDb.collection('projects').doc(projectId).collection('loans');
    const loansSnap = await loansColl.get();

    let bankDocRef: FirebaseFirestore.DocumentReference | null = null;
    let cdcDocRef: FirebaseFirestore.DocumentReference | null = null;

    for (const doc of loansSnap.docs) {
      const data = doc.data();
      if (data.lenderName === 'SBA 504 First Lien Bank') {
        bankDocRef = doc.ref;
      } else if (data.lenderName === 'CDC Debenture Second Lien') {
        cdcDocRef = doc.ref;
      }
    }

    const now = new Date().toISOString();

    if (bankDocRef) {
      await bankDocRef.update({
        amountCents: bankAmountCents,
        notes: `Bank 50% First Lien Loan — $${(bankAmountCents / 100).toLocaleString()}`,
        updatedAt: now,
      });
    }

    if (cdcDocRef) {
      await cdcDocRef.update({
        amountCents: cdcAmountCents,
        notes: `CDC ${cdcPct}% Debenture Second Lien — $${(cdcAmountCents / 100).toLocaleString()}`,
        updatedAt: now,
      });
    }

    // ── Guarded Capital Stack Update (Borrower Injection) ────────────────
    const currentFinancials = project.financials || {};
    const existingStack: any[] = currentFinancials.capitalStack || [];

    const INJECTION_SOURCE_ID = 'sba504-borrower-injection';
    const injectionSource = {
      id: INJECTION_SOURCE_ID,
      category: 'Borrower Equity',
      amount: injectionAmountCents / 100,
      interestRate: 0,
      lenderName: 'Borrower Equity Injection (SBA 504)',
      status: 'Active',
      notes: `${injectionPct}% borrower injection — SBA 504 requirement`,
    };

    // Replace existing injection entry or append — never touch other sources
    const stackIdx = existingStack.findIndex((s: any) => s.id === INJECTION_SOURCE_ID);
    const updatedStack = [...existingStack];
    if (stackIdx >= 0) {
      updatedStack[stackIdx] = injectionSource;
    } else {
      updatedStack.push(injectionSource);
    }

    // ── Save Eligibility + Vendor Slots to Financials ────────────────────
    const sbaFields: Record<string, any> = {
      'financials.sbaOccupancyType': occupancyType,
      'financials.sbaOccupancyRate': occupancyRate,
      'financials.sbaInjectionTier': injectionTier,
      'financials.capitalStack': updatedStack,
    };

    if (occupancyType === 'new_construction') {
      sbaFields['financials.sbaOccupancyRateTenYears'] = occupancyRateTenYears;
    }

    // Credit scores — store only if provided
    if (paydexScore != null) {
      sbaFields['financials.sbaPaydexScore'] = paydexScore;
      sbaFields['financials.sbaPaydexSource'] = paydexSource || null;
    }
    if (sbssScore != null) {
      sbaFields['financials.sbaSbssScore'] = sbssScore;
      sbaFields['financials.sbaSbssSource'] = sbssSource || null;
    }
    if (intelliscoreScore != null) {
      sbaFields['financials.sbaIntelliscoreScore'] = intelliscoreScore;
      sbaFields['financials.sbaIntelliscoreSource'] = intelliscoreSource || null;
    }

    await adminDb.collection('projects').doc(projectId).update(sbaFields);

    // ── Timeline + Notification ──────────────────────────────────────────
    await writeActivityLog(
      projectId,
      uid,
      [{
        fieldPath: 'financials.sbaInjectionTier',
        oldValue: currentFinancials.sbaInjectionTier || null,
        newValue: injectionTier,
      }],
      'manual'
    );

    const dealAddress = project.propertyName || project.address?.street || 'the project';
    try {
      const actorName = auth.token.name || auth.token.email || 'A teammate';
      const recipient = project.ownerUid || uid;

      await NotificationService.createNotification({
        recipientId: recipient,
        type: 'LOAN_STATUS_UPDATE',
        actor: { uid, name: actorName },
        objectReference: {
          projectId,
          dealAddress,
          task: `SBA 504 structure configured: ${bankPct}/${cdcPct}/${injectionPct} on $${purchasePrice.toLocaleString()}`,
        },
        deepLinkUrl: `/dashboard/projects/${projectId}/phase-2`,
      });
    } catch (err: any) {
      console.error('Failed to trigger SBA 504 notification:', err.message);
    }

    return NextResponse.json({
      success: true,
      structure: {
        bankPct,
        cdcPct,
        injectionPct,
        bankAmountCents,
        cdcAmountCents,
        injectionAmountCents,
        purchasePrice,
      },
    });
  } catch (err: any) {
    console.error('[SBA 504 API]', err.message);
    return NextResponse.json({ error: 'Failed to configure SBA 504 structure' }, { status: 500 });
  }
}
