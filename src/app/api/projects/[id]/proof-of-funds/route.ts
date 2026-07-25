import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import type { ProofOfFundsStatus, ProofOfFundsStatusLog } from '@/types/schema';
import { getBankingProvider } from '@/lib/banking';
import { decryptToken } from '@/lib/encryption/tokenVault';

interface Params { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  // ── 1. Authenticate Caller ────────────────────────────────
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;
  const { uid } = auth;

  const { id: projectId } = await params;
  if (!projectId) {
    return NextResponse.json({ success: false, error: 'projectId is required' }, { status: 400 });
  }

  let body: {
    sourceId: string;
    action: 'request' | 'upload' | 'verify' | 'plaid_sync';
    documentId?: string | null;
    documentName?: string | null;
    documentUrl?: string | null;
    plaidAccountName?: string | null;
    plaidBalance?: number | null;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const { sourceId, action, documentId, documentName, documentUrl, plaidAccountName, plaidBalance } = body;

  if (!sourceId && action !== 'plaid_sync') {
    return NextResponse.json({ success: false, error: 'sourceId is required' }, { status: 400 });
  }

  // ── 2. Load Project & Verify Access ────────────────────────
  const projectRef = adminDb.collection('projects').doc(projectId);
  const projectSnap = await projectRef.get();
  if (!projectSnap.exists) {
    return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
  }
  const projectData = projectSnap.data()!;
  const orgId = projectData.organizationId;

  const userSnap = await adminDb.collection('users').doc(uid).get();
  if (!userSnap.exists) {
    return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
  }
  const profile = userSnap.data()!;

  // Project access check helper
  const hasAccess =
    profile.personalOrganizationId === orgId ||
    profile.organizationId === orgId ||
    (profile.memberships != null && Boolean(profile.memberships[orgId]));

  if (!hasAccess) {
    return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
  }

  // ── 3. Check Lead Investor Authorization ───────────────────
  const isLead =
    projectData.ownerUid === uid ||
    projectData.members?.[uid]?.role === 'Lead Investor';

  // ── 4. Initialize Equity Sources list if empty ─────────────
  let proofOfFunds: ProofOfFundsStatus[] = projectData.proofOfFunds || [];

  const capitalStack = projectData.financials?.capitalStack || [];
  const equitySources = capitalStack.filter((s: any) =>
    s.category === 'Borrower Injection' ||
    s.category === 'Co-buying Equity' ||
    s.category === 'Syndication Equity'
  );

  // If no equity sources exist in capitalStack, fallback to a default solo cash source
  if (equitySources.length === 0) {
    const defaultId = 'default_solo_equity';
    if (!proofOfFunds.some((pof) => pof.id === defaultId)) {
      proofOfFunds.push({
        id: defaultId,
        sourceName: 'Borrower Injection (Solo Cash)',
        amount: projectData.financials?.purchasePrice || 0,
        status: 'requested',
        history: [{
          status: 'requested',
          updatedAt: new Date().toISOString(),
          updatedByUid: 'system',
          updatedByName: 'System Initialization',
        }],
      });
    }
  } else {
    // Populate missing items in proofOfFunds from capitalStack
    for (const source of equitySources) {
      if (!proofOfFunds.some((pof) => pof.id === source.id)) {
        proofOfFunds.push({
          id: source.id,
          sourceName: source.category,
          amount: source.amount || 0,
          status: 'requested',
          history: [{
            status: 'requested',
            updatedAt: new Date().toISOString(),
            updatedByUid: 'system',
            updatedByName: 'System Initialization',
          }],
        });
      }
    }
  }

  // ── 5. Perform Action ─────────────────────────────────────
  const now = new Date().toISOString();
  const userName = profile.name || profile.email || uid;

  if (action === 'plaid_sync') {
    const bankingProvider = getBankingProvider();
    let accountName = plaidAccountName || 'Business Premier Savings (*8892)';
    let balance = plaidBalance !== undefined && plaidBalance !== null ? plaidBalance : 75000_00;

    if (process.env.BANKING_PROVIDER === 'plaid') {
      const connectionsSnap = await adminDb
        .collection('users')
        .doc(uid)
        .collection('bankConnections')
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

      if (connectionsSnap.empty) {
        return NextResponse.json({
          success: false,
          error: 'No linked bank accounts found. Please link your bank account first.',
        }, { status: 400 });
      }

      const connectionDoc = connectionsSnap.docs[0].data();
      const encryptedAccessToken = connectionDoc.accessToken;
      if (!encryptedAccessToken) {
        return NextResponse.json({
          success: false,
          error: 'Bank connection is invalid. Please relink your bank account.',
        }, { status: 400 });
      }

      try {
        const decryptedAccessToken = decryptToken(encryptedAccessToken);
        const plaidBalanceInfo = await bankingProvider.getAccountBalance(decryptedAccessToken);
        accountName = plaidBalanceInfo.accountName;
        balance = plaidBalanceInfo.balance;
      } catch (err: any) {
        console.error('[Plaid Sync Action] Failed to fetch real Plaid balance:', err);
        return NextResponse.json({
          success: false,
          error: `Failed to fetch Plaid balance: ${err.message}`,
        }, { status: 500 });
      }
    }

    const targetPoF = proofOfFunds.find((p) => p.id === sourceId) || proofOfFunds[0];
    if (targetPoF) {
      targetPoF.plaidAccountName = accountName;
      targetPoF.plaidBalance = balance;
      targetPoF.plaidLastSync = now;
    }
  } else {
    const targetPoF = proofOfFunds.find((p) => p.id === sourceId);
    if (!targetPoF) {
      return NextResponse.json({ success: false, error: 'Equity source not found' }, { status: 404 });
    }

    if (action === 'request') {
      targetPoF.status = 'requested';
      targetPoF.documentId = null;
      targetPoF.documentName = null;
      targetPoF.documentUrl = null;
      targetPoF.verifiedByUid = null;
      targetPoF.verifiedByName = null;
      targetPoF.verifiedAt = null;

      targetPoF.history.push({
        status: 'requested',
        updatedAt: now,
        updatedByUid: uid,
        updatedByName: userName,
      });
    } else if (action === 'upload') {
      if (!documentUrl) {
        return NextResponse.json({ success: false, error: 'documentUrl is required for upload action' }, { status: 400 });
      }
      targetPoF.status = 'received';
      targetPoF.documentId = documentId || crypto.randomUUID();
      targetPoF.documentName = documentName || 'proof_of_funds.pdf';
      targetPoF.documentUrl = documentUrl;
      targetPoF.verifiedByUid = null;
      targetPoF.verifiedByName = null;
      targetPoF.verifiedAt = null;

      targetPoF.history.push({
        status: 'received',
        updatedAt: now,
        updatedByUid: uid,
        updatedByName: userName,
      });
    } else if (action === 'verify') {
      // ONLY Lead Investor is authorized to verify
      if (!isLead) {
        return NextResponse.json({ success: false, error: 'Unauthorized. Only the Lead Investor can verify proof of funds.' }, { status: 403 });
      }

      targetPoF.status = 'verified';
      targetPoF.verifiedByUid = uid;
      targetPoF.verifiedByName = userName;
      targetPoF.verifiedAt = now;

      targetPoF.history.push({
        status: 'verified',
        updatedAt: now,
        updatedByUid: uid,
        updatedByName: userName,
      });
    }
  }

  // ── 6. Sync card F1.4 complete state ───────────────────────
  // card F1.4 is complete if all items in proofOfFunds are verified
  const allVerified = proofOfFunds.length > 0 && proofOfFunds.every((pof) => pof.status === 'verified');
  let completedFundCards: string[] = projectData.completedFundCards || [];

  if (allVerified) {
    if (!completedFundCards.includes('F1.4')) {
      completedFundCards.push('F1.4');
    }
  } else {
    completedFundCards = completedFundCards.filter((id) => id !== 'F1.4');
  }

  // ── 7. Save to Firestore ──────────────────────────────────
  await projectRef.update({
    proofOfFunds,
    completedFundCards,
    updatedAt: now,
  });

  return NextResponse.json({
    success: true,
    proofOfFunds,
    completedFundCards,
  });
}
