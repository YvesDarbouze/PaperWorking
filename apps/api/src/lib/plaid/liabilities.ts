export interface RawMortgageLiability {
  id: string;
  connectionId: string;
  accountId: string;
  lender?: string | null;
  balance?: bigint | number | null;
  originalBalance?: bigint | number | null;
  interestRatePct?: number | null;
  apr?: number | null;
  nextPaymentDueDate?: Date | null;
  nextPaymentAmount?: bigint | number | null;
  ytdInterestPaid?: bigint | number | null;
  escrowBalance?: bigint | number | null;
  lastPaymentAmount?: bigint | number | null;
  lastPaymentDate?: Date | null;
  fetchedAt: Date;
}

export interface RawBankConnectionWithLiabilities {
  id: string;
  institutionName?: string | null;
  mortgageLiabilities: RawMortgageLiability[];
}

function toNumber(value: bigint | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return Number(value);
}

export function formatMortgageLiabilityRow(
  conn: { id: string; institutionName?: string | null },
  ml: RawMortgageLiability,
): Record<string, unknown> {
  return {
    id: ml.id,
    connectionId: ml.connectionId,
    accountId: ml.accountId,
    institutionName: conn.institutionName,
    lender: ml.lender,
    balance: toNumber(ml.balance),
    originalBalance: toNumber(ml.originalBalance),
    interestRatePct: ml.interestRatePct,
    apr: ml.apr,
    nextPaymentDueDate: ml.nextPaymentDueDate?.toISOString() ?? null,
    nextPaymentAmount: toNumber(ml.nextPaymentAmount),
    ytdInterestPaid: toNumber(ml.ytdInterestPaid),
    escrowBalance: toNumber(ml.escrowBalance),
    lastPaymentAmount: toNumber(ml.lastPaymentAmount),
    lastPaymentDate: ml.lastPaymentDate?.toISOString() ?? null,
    fetchedAt: ml.fetchedAt.toISOString(),
  };
}

export function flattenMortgageLiabilities(
  connections: RawBankConnectionWithLiabilities[],
): Array<Record<string, unknown>> {
  return connections.flatMap((conn) =>
    conn.mortgageLiabilities.map((ml) =>
      formatMortgageLiabilityRow(
        { id: conn.id, institutionName: conn.institutionName },
        ml,
      ),
    ),
  );
}
