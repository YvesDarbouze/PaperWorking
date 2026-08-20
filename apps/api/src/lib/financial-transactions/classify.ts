export interface TransactionSplit {
  amount: number;
  category: string;
  reason: string;
}

export function validateSplitAmounts(
  splits: TransactionSplit[],
  originalAmount: number,
  tolerance = 0.05,
): { ok: true } | { ok: false; error: string } {
  const splitSum = splits.reduce((sum, s) => sum + Math.abs(s.amount), 0);
  const originalAmt = Math.abs(originalAmount);
  if (Math.abs(splitSum - originalAmt) > tolerance) {
    return {
      ok: false,
      error: `Splits sum ($${splitSum.toFixed(2)}) must equal original transaction amount ($${originalAmt.toFixed(2)})`,
    };
  }
  return { ok: true };
}

export function validateClassifyBody(body: {
  category?: unknown;
  isSplit?: unknown;
  splits?: unknown;
}): { ok: true } | { ok: false; error: string } {
  const isSplit = body.isSplit === true;
  const splits = Array.isArray(body.splits) ? body.splits : [];
  const hasCategory = typeof body.category === 'string' && body.category.length > 0;

  if (!hasCategory && (!isSplit || splits.length === 0)) {
    return { ok: false, error: 'Category or valid splits required' };
  }
  return { ok: true };
}
