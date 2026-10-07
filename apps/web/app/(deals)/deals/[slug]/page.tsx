'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle,
  ArrowsClockwise,
  WarningCircle,
  X,
  FileText,
} from '@/components/icons/PhosphorIcons';

export default function DealCreationPage() {
  const params = useParams();
  const slug = (params?.slug as string) || '';
  const router = useRouter();
  const searchParams = useSearchParams();

  const collisionWarning = searchParams.get('collisionWarning');
  const creatorName = searchParams.get('creatorName') || 'Lead Investor';

  const [showWarning, setShowWarning] = useState(false);
  const [purchasePrice, setPurchasePrice] = useState('485000');
  const [rehabEstimate, setRehabEstimate] = useState('68000');
  const [arvEstimate, setArvEstimate] = useState('620000');
  const [estRent, setEstRent] = useState('3800');
  const [holdPeriod, setHoldPeriod] = useState('3–5 Years');
  const [disposition, setDisposition] = useState<'SALE' | 'RENT' | 'BRRRR' | 'WHOLESALE'>('SALE');
  const [visibility, setVisibility] = useState<'marketplace' | 'invitation_only' | 'private'>('marketplace');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (collisionWarning === 'true') {
      setShowWarning(true);
    } else {
      setShowWarning(false);
    }
  }, [collisionWarning]);

  function handleDismiss() {
    setShowWarning(false);
    router.replace(`/deals/${slug}`);
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', `/deals/${slug}`);
    }
  }

  const formattedAddress = slug
    ? slug.replace(/([0-9]+)([a-zA-Z]+)/, '$1 $2').replace(/st|ave|rd|dr|ln|ct|blvd/i, (m) => ` ${m.toUpperCase()}`)
    : 'Property Address';

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);

    try {
      const priceNum = Number(purchasePrice) || 0;
      const rehabNum = Number(rehabEstimate) || 0;
      const arvNum = arvEstimate ? Number(arvEstimate) : null;
      const rentNum = estRent ? Number(estRent) : 0;
      const strategyResolved =
        disposition === 'SALE'
          ? 'FIX_AND_FLIP'
          : disposition === 'RENT'
            ? 'VALUE_ADD'
            : disposition;

      const payload = {
        slug: slug || undefined,
        name: formattedAddress,
        title: formattedAddress,
        address: formattedAddress,
        purchasePrice: priceNum,
        rehabCost: rehabNum,
        arv: arvNum,
        holdingCosts: Math.round(priceNum * 0.02),
        holdPeriod,
        strategy: strategyResolved,
        disposition,
        visibility,
        status: 'published',
        dealType: 'syndication',
        calculatorResults: {
          purchasePrice: priceNum,
          rehabBudget: rehabNum,
          arv: arvNum ?? undefined,
          grossMonthlyRent: rentNum,
          holdPeriod,
          strategy: strategyResolved,
        },
      };

      const res = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save deal to pipeline');
      }

      setSavedSuccess(true);
      setTimeout(() => {
        router.push('/marketplace');
      }, 1000);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full max-w-[840px] mx-auto space-y-6 px-4 py-8 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/marketplace"
          className="min-h-[44px] inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Deals Marketplace</span>
        </Link>
        <Link
          href={`/deals/${slug}/detail`}
          className="min-h-[44px] inline-flex items-center text-xs text-foreground font-medium hover:underline"
        >
          View existing deal record →
        </Link>
      </div>

      {/* Amber Collision Warning Banner */}
      {showWarning ? (
        <div
          data-testid="collision-warning-banner"
          className="bg-amber-500/10 border border-amber-500/20 rounded-none px-4 py-3 flex items-start gap-3"
        >
          <WarningCircle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
          <p className="text-sm text-amber-400">
            Another deal exists at this address. Consider collaborating with{' '}
            <span className="font-semibold">{creatorName}</span> instead.
          </p>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss warning"
            className="ml-auto min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-1 text-amber-400/60 hover:text-amber-400 hover:bg-amber-500/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : null}

      <div className="rounded-none border border-border bg-card p-6 md:p-8">
        <div>
          <span className="text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">
            DEAL PIPELINE INTAKE
          </span>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">
            Underwrite &amp; Create Deal
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Target slug: <code className="text-foreground font-mono">{slug}</code> ({formattedAddress})
          </p>
        </div>

        {savedSuccess ? (
          <div className="mt-8 rounded-none border border-border bg-muted/40 p-6 text-center">
            <CheckCircle className="mx-auto w-10 h-10 text-emerald-400" />
            <h3 className="mt-2 text-base font-semibold text-foreground">Deal Baseline Saved</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Your deal has been stored into your acquisition pipeline. Redirecting to Deals Marketplace…
            </p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="mt-6 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="deal-target-purchase-price" className="block text-xs font-medium text-muted-foreground">
                  Target Purchase Price ($)
                </label>
                <input
                  id="deal-target-purchase-price"
                  type="number"
                  required
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-none border border-input bg-background/50 px-3.5 py-2 text-base md:text-sm text-foreground focus:border-ring focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="deal-rehab-estimate" className="block text-xs font-medium text-muted-foreground">
                  Rehab Estimate ($)
                </label>
                <input
                  id="deal-rehab-estimate"
                  type="number"
                  required
                  value={rehabEstimate}
                  onChange={(e) => setRehabEstimate(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-none border border-input bg-background/50 px-3.5 py-2 text-base md:text-sm text-foreground focus:border-ring focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="deal-arv-estimate" className="block text-xs font-medium text-muted-foreground">
                  After Repair Value / ARV ($)
                </label>
                <input
                  id="deal-arv-estimate"
                  type="number"
                  required
                  value={arvEstimate}
                  onChange={(e) => setArvEstimate(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-none border border-input bg-background/50 px-3.5 py-2 text-base md:text-sm text-foreground focus:border-ring focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="deal-projected-monthly-rent" className="block text-xs font-medium text-muted-foreground">
                  Projected Monthly Rent ($)
                </label>
                <input
                  id="deal-projected-monthly-rent"
                  type="number"
                  required
                  value={estRent}
                  onChange={(e) => setEstRent(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-none border border-input bg-background/50 px-3.5 py-2 text-base md:text-sm text-foreground focus:border-ring focus:outline-none"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="deal-planned-hold-period" className="block text-xs font-medium text-muted-foreground">
                  Planned Hold Period
                </label>
                <select
                  id="deal-planned-hold-period"
                  value={holdPeriod}
                  onChange={(e) => setHoldPeriod(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-none border border-input bg-background px-3.5 py-2 text-base md:text-sm text-foreground focus:border-ring focus:outline-none"
                >
                  <option value="6–12 Months">6–12 Months (Short-term / Flip)</option>
                  <option value="1–2 Years">1–2 Years (Bridge / Quick Hold)</option>
                  <option value="3–5 Years">3–5 Years (Standard Value-Add)</option>
                  <option value="5–7 Years">5–7 Years (Core-Plus)</option>
                  <option value="7–10 Years">7–10 Years (Long-term Wealth / Legacy)</option>
                </select>
              </div>

              <div>
                <label htmlFor="deal-exit-disposition" className="block text-xs font-medium text-muted-foreground">
                  Exit / Disposition Strategy
                </label>
                <select
                  id="deal-exit-disposition"
                  value={disposition}
                  onChange={(e) =>
                    setDisposition(e.target.value as 'SALE' | 'RENT' | 'BRRRR' | 'WHOLESALE')
                  }
                  className="mt-1 min-h-[44px] w-full rounded-none border border-input bg-background px-3.5 py-2 text-base md:text-sm text-foreground focus:border-ring focus:outline-none"
                >
                  <option value="SALE">Outright Sale (Fix &amp; Flip / Capital Gain)</option>
                  <option value="RENT">Hold as Rental (Cash Flow / Section 8)</option>
                  <option value="BRRRR">BRRRR (Refinance Capital Return)</option>
                  <option value="WHOLESALE">Wholesale (Contract Assignment)</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="deal-visibility-setting" className="block text-xs font-medium text-muted-foreground">
                Deal Visibility
              </label>
              <select
                id="deal-visibility-setting"
                value={visibility}
                onChange={(e) =>
                  setVisibility(e.target.value as 'marketplace' | 'invitation_only' | 'private')
                }
                className="mt-1 min-h-[44px] w-full rounded-none border border-input bg-background px-3.5 py-2 text-base md:text-sm text-foreground focus:border-ring focus:outline-none"
              >
                <option value="marketplace">Marketplace (Public to verified network)</option>
                <option value="invitation_only">Invitation Only (Shared via links/email)</option>
                <option value="private">Private (Workspace &amp; Team only)</option>
              </select>
            </div>

            {saveError && (
              <div
                role="alert"
                className="rounded-none border border-destructive/40 bg-destructive/10 px-3.5 py-2.5 text-xs text-destructive font-medium"
              >
                {saveError}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => router.push('/marketplace')}
                className="min-h-[44px] px-4 py-2 rounded-none border border-border text-xs font-medium text-muted-foreground hover:bg-muted transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-none bg-primary px-5 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/80 transition disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <ArrowsClockwise className="w-4 h-4 animate-spin" />
                    <span>Saving to Pipeline…</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>Save to Pipeline as Baseline</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
