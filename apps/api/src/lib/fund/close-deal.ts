export interface CloseDealLineItem {
  amount: number;
}

export interface CloseDealBody {
  projectId?: unknown;
  finalPurchasePrice?: unknown;
  titleFees?: unknown;
  originationFees?: unknown;
  isEstimate?: unknown;
  sources?: unknown;
  uses?: unknown;
  justification?: unknown;
}

export interface ParsedCloseDealBody {
  projectId: string;
  finalPurchasePrice: number;
  titleFees: number;
  originationFees: number;
  isEstimate: boolean;
  sources?: Array<{ source: string; amount: number }>;
  uses?: Array<{ use: string; amount: number }>;
  justification: string;
}

export function parseCloseDealBody(body: CloseDealBody): ParsedCloseDealBody | null {
  const projectId = typeof body.projectId === 'string' ? body.projectId.trim() : '';
  if (!projectId) return null;

  return {
    projectId,
    finalPurchasePrice: typeof body.finalPurchasePrice === 'number' ? body.finalPurchasePrice : 250000,
    titleFees: typeof body.titleFees === 'number' ? body.titleFees : 2000,
    originationFees: typeof body.originationFees === 'number' ? body.originationFees : 3000,
    isEstimate: body.isEstimate === true,
    sources: Array.isArray(body.sources)
      ? body.sources.filter(
          (s): s is { source: string; amount: number } =>
            typeof s === 'object' &&
            s != null &&
            typeof (s as { source?: unknown }).source === 'string' &&
            typeof (s as { amount?: unknown }).amount === 'number',
        )
      : undefined,
    uses: Array.isArray(body.uses)
      ? body.uses.filter(
          (u): u is { use: string; amount: number } =>
            typeof u === 'object' &&
            u != null &&
            typeof (u as { use?: unknown }).use === 'string' &&
            typeof (u as { amount?: unknown }).amount === 'number',
        )
      : undefined,
    justification: typeof body.justification === 'string' ? body.justification : '',
  };
}

export function validateSourcesUsesBalance(
  parsed: ParsedCloseDealBody,
): { ok: true } | { ok: false; error: string; variance: number } {
  const sourcesSum = parsed.sources?.reduce((sum, s) => sum + s.amount, 0) ?? 0;
  const usesSum = parsed.uses?.reduce((sum, u) => sum + u.amount, 0) ?? 0;

  if (sourcesSum !== usesSum) {
    if (!parsed.justification.trim()) {
      const variance = Math.abs(sourcesSum - usesSum);
      return {
        ok: false,
        error: `Sources (${sourcesSum}) and Uses (${usesSum}) must balance. Variance: ${variance}`,
        variance,
      };
    }
  }

  return { ok: true };
}
