'use server';

import { adminAuth, adminDb } from '@/lib/firebase/admin';

interface VerifiedUser {
  uid: string;
  role: string;
  organizationId: string;
  [key: string]: unknown;
}

async function verifyActionAuth(idToken: string): Promise<VerifiedUser> {
  if (!idToken) throw new Error('Missing authentication token.');
  try {
    let isE2eTest = false;
    let cookieStore: any = null;
    try {
      const { cookies } = require('next/headers');
      cookieStore = await cookies();
      isE2eTest = cookieStore?.get('__e2e_test')?.value === '1';
    } catch {
      // Ignored
    }
    if ((process.env.NODE_ENV !== 'production' || isE2eTest) && (process.env.ENABLE_MOCK_AUTH === 'true' || process.env.NODE_ENV === 'test') && (idToken === 'mock_token' || idToken === 'mock_token_123' || idToken === 'mock_session_token_123')) {
      const uid = cookieStore?.get('mock_user_uid')?.value || 'user_lead_investor_seed';
      const email = cookieStore?.get('mock_user_email')?.value || 'marcus@apexcapital.io';
      const name = cookieStore?.get('mock_user_name')?.value || 'Marcus Aurelius';
      const role = cookieStore?.get('mock_user_role')?.value || 'Lead Investor';
      const accountType = cookieStore?.get('mock_user_account_type')?.value || (role === 'Vendor' ? 'vendor' : 'investor');
      const subscriptionPlan = cookieStore?.get('mock_user_subscription_plan')?.value || 'Team';
      const subscriptionStatus = subscriptionPlan === 'None' ? 'inactive' : 'active';
      const organizationId = cookieStore?.get('mock_user_org_id')?.value || 'org_paperworking_seed';
      return {
        uid,
        email,
        displayName: name,
        role,
        accountType,
        subscriptionPlan,
        subscriptionStatus,
        organizationId,
      } as unknown as VerifiedUser;
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const userDocRef = adminDb.collection('users').doc(decodedToken.uid);
    const userSnap = await userDocRef.get();
    if (!userSnap.exists) throw new Error('User profile not found.');
    const userData = userSnap.data() as Record<string, unknown>;
    return { uid: decodedToken.uid, ...userData } as VerifiedUser;
  } catch (err) {
    console.error('Server Action Auth Error:', err);
    throw new Error('Unauthorized');
  }
}

export interface ReconciliationCheckResult {
  requiresReconciliation: boolean;
  orphanedLoans: Array<{ id: string; lenderName: string; instrument: string; amountCents: number }>;
  orphanedPartners: Array<{ id: string; name: string; contributionAmount: number; status: string }>;
  orphanedLedgerEntries: Array<{ id: string; partyName: string; amountCents: number; status: string }>;
}

/**
 * Checks if changing the modality will orphan any downstream records.
 */
export async function checkModalityReconciliation(
  idToken: string,
  projectId: string,
  nextModality: string[]
): Promise<ReconciliationCheckResult> {
  await verifyActionAuth(idToken);

  const projectRef = adminDb.collection('projects').doc(projectId);
  const projectSnap = await projectRef.get();
  if (!projectSnap.exists) throw new Error('Project not found.');

  const projectData = projectSnap.data()!;
  const currentModality: string[] = projectData.fundingPlan?.modality || [];

  const removedEquity = currentModality.some(m => m === 'co_buyer_equity' || m === 'syndication_equity') &&
                        !nextModality.some(m => m === 'co_buyer_equity' || m === 'syndication_equity');

  const removedConventional = currentModality.includes('conventional_loan') && !nextModality.includes('conventional_loan');
  const removedHardMoney = currentModality.includes('hard_money') && !nextModality.includes('hard_money');
  const removedBridge = currentModality.includes('bridge') && !nextModality.includes('bridge');
  const removedSba504 = currentModality.includes('sba_504') && !nextModality.includes('sba_504');

  const orphanedLoans: any[] = [];
  const orphanedPartners: any[] = [];
  const orphanedLedgerEntries: any[] = [];

  // Query loans in subcollection
  const loansSnap = await projectRef.collection('loans').get();
  for (const doc of loansSnap.docs) {
    const loan = doc.data();
    if (loan.status === 'Archived' || loan.isArchived) continue;

    const instrument = loan.instrument;
    const shouldOrphan = (instrument === 'Conventional' && removedConventional) ||
                         (instrument === 'Hard Money' && removedHardMoney) ||
                         (instrument === 'Bridge' && removedBridge) ||
                         (instrument === 'SBA 504' && removedSba504);

    if (shouldOrphan) {
      orphanedLoans.push({
        id: doc.id,
        lenderName: loan.lenderName || 'Unnamed Lender',
        instrument: loan.instrument,
        amountCents: loan.amountCents || 0,
      });
    }
  }

  // Check fractionalInvestors if equity is removed
  if (removedEquity) {
    const investors = projectData.fractionalInvestors || [];
    for (const inv of investors) {
      if (inv.status === 'archived' || inv.isArchived) continue;
      orphanedPartners.push({
        id: inv.id,
        name: inv.name || 'Unnamed Partner',
        contributionAmount: inv.contributionAmount || 0,
        status: inv.status,
      });
    }

    // Check commitments subcollection in Firestore
    const commitmentsSnap = await projectRef.collection('commitments').get();
    for (const doc of commitmentsSnap.docs) {
      const commitment = doc.data();
      if (commitment.status === 'Archived' || commitment.isArchived) continue;
      orphanedLedgerEntries.push({
        id: doc.id,
        partyName: commitment.partyName || commitment.investorName || 'Unnamed Commitment',
        amountCents: commitment.amountCents || (commitment.amount ? commitment.amount * 100 : 0),
        status: commitment.status,
      });
    }
  }

  const requiresReconciliation = orphanedLoans.length > 0 || orphanedPartners.length > 0 || orphanedLedgerEntries.length > 0;

  return {
    requiresReconciliation,
    orphanedLoans,
    orphanedPartners,
    orphanedLedgerEntries,
  };
}

/**
 * Confirms modality updates and archives any orphaned records.
 */
export async function confirmModalityReconciliation(
  idToken: string,
  projectId: string,
  nextModality: string[],
  confirmArchive: boolean
) {
  await verifyActionAuth(idToken);

  const projectRef = adminDb.collection('projects').doc(projectId);
  const projectSnap = await projectRef.get();
  if (!projectSnap.exists) throw new Error('Project not found.');

  const projectData = projectSnap.data()!;
  
  if (confirmArchive) {
    // 1. Check what needs archiving
    const reconciliation = await checkModalityReconciliation(idToken, projectId, nextModality);

    // Archive orphaned loans in Firestore
    for (const loan of reconciliation.orphanedLoans) {
      await projectRef.collection('loans').doc(loan.id).update({
        status: 'Archived',
        isArchived: true,
        updatedAt: new Date().toISOString(),
      });
    }

    // Archive orphaned partners in Firestore
    if (reconciliation.orphanedPartners.length > 0) {
      const investors = projectData.fractionalInvestors || [];
      const updatedInvestors = investors.map((inv: any) => {
        if (reconciliation.orphanedPartners.some(p => p.id === inv.id)) {
          return { ...inv, status: 'archived', isArchived: true };
        }
        return inv;
      });
      await projectRef.update({ fractionalInvestors: updatedInvestors });
    }

    // Archive orphaned commitments/ledger entries in Firestore
    for (const entry of reconciliation.orphanedLedgerEntries) {
      await projectRef.collection('commitments').doc(entry.id).update({
        status: 'Archived',
        isArchived: true,
      });
    }

    // ── Archive in Postgres (Prisma) ──
    try {
      const { prisma } = require('@/lib/prisma');

      // Archive orphaned loans in Postgres
      if (reconciliation.orphanedLoans.length > 0) {
        await prisma.reilLoanRecord.updateMany({
          where: {
            projectId,
            id: { in: reconciliation.orphanedLoans.map(l => l.id) },
          },
          data: {
            status: 'Archived',
          },
        });
      }

      // Archive orphaned contribution entries in Postgres
      if (reconciliation.orphanedLedgerEntries.length > 0) {
        await prisma.reilContributionEntry.updateMany({
          where: {
            projectId,
            id: { in: reconciliation.orphanedLedgerEntries.map(e => e.id) },
          },
          data: {
            status: 'Archived',
          },
        });
      }
    } catch (e) {
      console.error('Postgres archiving error (ignored for robustness):', e);
    }
  }

  // 2. Save new modality
  const currentPlan = projectData.fundingPlan || { id: projectId, projectId, modality: [], sources: [] };
  await projectRef.update({
    fundingPlan: {
      ...currentPlan,
      modality: nextModality,
      sources: currentPlan.sources || [],
    },
    updatedAt: new Date().toISOString(),
  });

  // ── Sync new modality to Postgres ──
  try {
    const { prisma } = require('@/lib/prisma');
    await prisma.reilFundingPlan.upsert({
      where: { projectId },
      update: {
        modality: nextModality,
      },
      create: {
        projectId,
        modality: nextModality,
      },
    });
  } catch (e) {
    console.error('Postgres modality update error (ignored for robustness):', e);
  }

  return { success: true };
}
