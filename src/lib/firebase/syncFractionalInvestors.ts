import { adminDb } from '@/lib/firebase/admin';
import type { FractionalInvestor, CommitmentStatus, CapitalPartyType, ContributionEntry } from '@/types/schema';

/* ═══════════════════════════════════════════════════════════════
   syncFractionalInvestors — Commitment → fractionalInvestors[] bridge

   The commitments subcollection is the source of truth for capital
   raises. Legacy equity/distribution calculators still read
   project.fractionalInvestors[], so API routes call these helpers
   after every commitment write to keep both views aligned.
   ═══════════════════════════════════════════════════════════════ */

export type CommitmentSyncInput = {
  id: string;
  name: string;
  email: string | null;
  amountCents: number;
  status: CommitmentStatus;
  partyType?: CapitalPartyType;
};

type LegacyInvestorStatus = FractionalInvestor['status'];

const STATUS_MAP: Record<CommitmentStatus, LegacyInvestorStatus> = {
  pledged: 'invited',
  'soft-committed': 'invited',
  transferred: 'pending_subscription',
  'docs-out': 'pending_subscription',
  signed: 'pending_subscription',
  cleared: 'confirmed',
  'funds-confirmed': 'confirmed',
};

function computeEquityPercentage(
  contributionAmount: number,
  fin: Record<string, number | undefined>,
): number {
  const equityBase =
    fin.capitalRaiseTarget || fin.purchasePrice || fin.projectedRehabCost || 0;
  if (equityBase <= 0) return 0;
  return Number(((contributionAmount / equityBase) * 100).toFixed(4));
}

function buildInvestorEntry(
  commitment: CommitmentSyncInput,
  fin: Record<string, number | undefined>,
): FractionalInvestor {
  const contributionAmount = commitment.amountCents / 100;

  return {
    id: commitment.id,
    email: commitment.email || '',
    name: commitment.name,
    equityPercentage: computeEquityPercentage(contributionAmount, fin),
    contributionAmount,
    status: STATUS_MAP[commitment.status],
    partyType: commitment.partyType || 'Investor',
  };
}

export async function syncFractionalInvestorFromCommitment(
  projectId: string,
  commitment: CommitmentSyncInput,
): Promise<void> {
  const projectRef = adminDb.collection('projects').doc(projectId);
  const snap = await projectRef.get();
  if (!snap.exists) return;

  const data = snap.data()!;
  const fin = (data.financials ?? {}) as Record<string, number | undefined>;
  const investor = buildInvestorEntry(commitment, fin);

  const list: FractionalInvestor[] = [...(data.fractionalInvestors ?? [])];
  const idx = list.findIndex((entry) => entry.id === commitment.id);

  if (idx >= 0) {
    list[idx] = { ...list[idx], ...investor };
  } else {
    list.push(investor);
  }

  // Sync project.contributions as ContributionEntry rows
  const contributions: ContributionEntry[] = [...(data.contributions ?? [])];
  const cIdx = contributions.findIndex((entry) => entry.id === commitment.id);
  const newContribution: ContributionEntry = {
    id: commitment.id,
    projectId,
    partyName: commitment.name,
    email: commitment.email,
    amountCents: commitment.amountCents,
    status: commitment.status,
    evidenceDocId: null,
    evidenceDocUrl: null,
    partyType: commitment.partyType || 'Investor',
    createdAt: data.createdAt ? new Date(data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt).toISOString() : new Date().toISOString(),
  };

  if (cIdx >= 0) {
    contributions[cIdx] = { ...contributions[cIdx], ...newContribution };
  } else {
    contributions.push(newContribution);
  }

  await projectRef.update({
    fractionalInvestors: list,
    contributions: contributions,
  });
}

export async function removeFractionalInvestorForCommitment(
  projectId: string,
  commitmentId: string,
): Promise<void> {
  const projectRef = adminDb.collection('projects').doc(projectId);
  const snap = await projectRef.get();
  if (!snap.exists) return;

  const data = snap.data()!;
  const list: FractionalInvestor[] = (data.fractionalInvestors ?? []).filter(
    (entry: FractionalInvestor) => entry.id !== commitmentId,
  );
  const contributions = (data.contributions ?? []).filter(
    (entry: any) => entry.id !== commitmentId,
  );

  await projectRef.update({
    fractionalInvestors: list,
    contributions: contributions,
  });
}
