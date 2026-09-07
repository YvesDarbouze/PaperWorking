'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  checkDealExistsFromBff,
  createDealFromBff,
  decodeDealSlugParam,
  getDealBySlugFromBff,
  updateDealFromBff,
} from '@/lib/deals/deal-api';
import { listProjectsFromBff, patchProjectFromBff } from '@/lib/projects/project-api';
import { buildProjectFinancialsFromDealBaseline } from '@/lib/projects/deal-financials-sync';
import { useMockData } from '@/lib/data';

export default function DealCreationPage() {
  const params = useParams();
  const slug = decodeDealSlugParam((params?.slug as string) || '');
  const router = useRouter();
  const searchParams = useSearchParams();

  const collisionWarning = searchParams.get('collisionWarning');
  const creatorName = searchParams.get('creatorName') || 'Lead Investor';
  const linkedProjectId = searchParams.get('fromProject');

  const [showWarning, setShowWarning] = useState(false);
  const [purchasePrice, setPurchasePrice] = useState('485000');
  const [rehabEstimate, setRehabEstimate] = useState('68000');
  const [arvEstimate, setArvEstimate] = useState('620000');
  const [estRent, setEstRent] = useState('3800');
  const [visibility, setVisibility] = useState<'marketplace' | 'invitation_only' | 'private'>('marketplace');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [dealProjectId, setDealProjectId] = useState<string | null>(linkedProjectId);
  const [dealAddress, setDealAddress] = useState<string | null>(null);

  useEffect(() => {
    if (collisionWarning === 'true') {
      setShowWarning(true);
    } else {
      setShowWarning(false);
    }
  }, [collisionWarning]);

  useEffect(() => {
    if (useMockData() || !slug) return;
    let cancelled = false;
    (async () => {
      try {
        const deal = await getDealBySlugFromBff(slug);
        if (cancelled) return;
        if (typeof deal.address === 'string' && deal.address.trim()) {
          setDealAddress(deal.address.trim());
        }
        if (deal.purchasePrice != null) setPurchasePrice(String(deal.purchasePrice));
        if (deal.rehabCost != null) setRehabEstimate(String(deal.rehabCost));
        if (deal.arv != null) setArvEstimate(String(deal.arv));
        if (deal.projectedMonthlyRent != null) setEstRent(String(deal.projectedMonthlyRent));
        else setEstRent('');
        if (
          deal.visibility === 'marketplace' ||
          deal.visibility === 'invitation_only' ||
          deal.visibility === 'private'
        ) {
          setVisibility(deal.visibility);
        }
        if (typeof deal.projectId === 'string' && deal.projectId.trim()) {
          setDealProjectId(deal.projectId);
        } else {
          try {
            const projects = await listProjectsFromBff();
            const linked = projects.find(
              (project) => project.dealId === deal.id || project.dealSlug === slug,
            );
            if (linked?.id) setDealProjectId(String(linked.id));
          } catch {
            /* Project sync is optional when no link can be resolved. */
          }
        }
      } catch {
        // New deal slug — keep form defaults.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const formattedAddress =
    dealAddress ||
    (slug
      ? slug.replace(/([0-9]+)([a-zA-Z]+)/, '$1 $2').replace(/st|ave|rd|dr|ln|ct|blvd/i, (m) => ` ${m.toUpperCase()}`)
      : 'Property Address');

  async function resolveLinkedProjectId(preferred?: string | null): Promise<string | null> {
    if (preferred && preferred.trim()) return preferred.trim();
    if (dealProjectId && dealProjectId.trim()) return dealProjectId.trim();
    if (linkedProjectId && linkedProjectId.trim()) return linkedProjectId.trim();
    try {
      const deal = await getDealBySlugFromBff(slug);
      if (typeof deal.projectId === 'string' && deal.projectId.trim()) {
        setDealProjectId(deal.projectId);
        return deal.projectId.trim();
      }
      const projects = await listProjectsFromBff();
      const linked = projects.find(
        (project) => project.dealId === deal.id || project.dealSlug === slug,
      );
      if (linked?.id) {
        const id = String(linked.id);
        setDealProjectId(id);
        return id;
      }
    } catch {
      /* Linked project may not exist yet for brand-new deal intake. */
    }
    return null;
  }

  function handleDismiss() {
    setShowWarning(false);
    router.replace(`/deals/${slug}`);
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', `/deals/${slug}`);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);

    const baseline = {
      purchasePrice: Number(purchasePrice),
      rehabCost: Number(rehabEstimate),
      arv: Number(arvEstimate),
      projectedMonthlyRent: Number(estRent),
    };

    try {
      const projectId = await resolveLinkedProjectId(dealProjectId ?? linkedProjectId);

      if (useMockData()) {
        setSavedSuccess(true);
        setTimeout(() => {
          router.push(projectId ? `/project/${projectId}/scorecard` : `/dashboard/deals`);
        }, 1200);
        return;
      }

      let existingDeal = null;
      try {
        existingDeal = await getDealBySlugFromBff(slug);
      } catch {
        existingDeal = null;
      }

      if (!existingDeal) {
        const exists = await checkDealExistsFromBff(slug);
        if (!exists.exists) {
          await createDealFromBff({
            slug,
            address: formattedAddress,
            ...baseline,
            visibility,
            projectId: projectId ?? undefined,
          });
        }
      }

      const updatedDeal = await updateDealFromBff(slug, {
        ...baseline,
        visibility,
        projectId: projectId ?? undefined,
      });

      const syncedProjectId =
        projectId ||
        (typeof updatedDeal.projectId === 'string' ? updatedDeal.projectId : null) ||
        (await resolveLinkedProjectId(null));

      if (syncedProjectId) {
        try {
          await patchProjectFromBff(syncedProjectId, {
            purchasePrice: baseline.purchasePrice,
            financials: buildProjectFinancialsFromDealBaseline(baseline),
          });
          setDealProjectId(syncedProjectId);
        } catch (syncError) {
          throw new Error(
            syncError instanceof Error
              ? `Deal saved, but linked project sync failed: ${syncError.message}`
              : 'Deal saved, but linked project sync failed.',
          );
        }
      }

      setSavedSuccess(true);
      setIsSaving(false);
      setTimeout(() => {
        router.push(syncedProjectId ? `/project/${syncedProjectId}/scorecard` : `/dashboard/deals`);
      }, 1200);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save deal baseline');
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-[840px] space-y-6 px-4 py-8 md:px-8">
      <div className="flex items-center justify-between">
        <Link href="/dashboard/deals" className="text-xs text-white/60 hover:text-white transition">
          ← Back to Deals Marketplace
        </Link>
        <Link
          href={`/deals/${slug}/detail`}
          className="text-xs text-[#00DD94] hover:underline"
        >
          View existing deal record →
        </Link>
      </div>

      {/* Amber Collision Warning Banner */}
      {showWarning ? (
        <div
          data-testid="collision-warning-banner"
          className="bg-amber-500/10 border border-amber-500/20 rounded-[8px] px-4 py-3 flex items-start gap-3"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.75}
            stroke="#fbbf24"
            className="h-5 w-5 shrink-0 text-[#fbbf24] mt-0.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>

          <p className="text-[14px] text-amber-400">
            Another deal exists at this address. Consider collaborating with{' '}
            <span className="font-semibold">{creatorName}</span> instead.
          </p>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss warning"
            className="ml-auto p-1 rounded text-amber-400/60 hover:text-amber-400 hover:bg-amber-500/10 transition"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      ) : null}

      <div className="rounded-2xl border border-white/10 bg-[#121014]/90 p-6 md:p-8 backdrop-blur-xl shadow-2xl">
        <div>
          <span className="font-[family-name:var(--font-jetbrains-mono)] text-[11px] font-semibold uppercase tracking-[0.1em] text-[#00DD94]">
            DEAL PIPELINE INTAKE
          </span>
          <h1 className="mt-1 text-2xl font-semibold text-white">
            Underwrite &amp; Create Deal
          </h1>
          <p className="mt-1 text-xs text-white/60">
            Target slug: <code className="text-[#00DD94]">{slug}</code> ({formattedAddress})
          </p>
        </div>

        {savedSuccess ? (
          <div className="mt-8 rounded-xl border border-[#00DD94]/30 bg-[#00DD94]/10 p-6 text-center">
            <span className="material-symbols-outlined text-4xl text-[#00DD94]">check_circle</span>
            <h3 className="mt-2 text-base font-semibold text-white">Deal Baseline Saved</h3>
            <p className="mt-1 text-xs text-white/70">
              Your deal has been stored into your acquisition pipeline. Redirecting to workspace…
            </p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="mt-6 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="deal-purchase-price" className="block text-xs font-medium text-white/70">
                  Target Purchase Price ($)
                </label>
                <input
                  id="deal-purchase-price"
                  type="number"
                  required
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white focus:border-[#00DD94] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="deal-rehab-estimate" className="block text-xs font-medium text-white/70">
                  Rehab Estimate ($)
                </label>
                <input
                  id="deal-rehab-estimate"
                  type="number"
                  required
                  value={rehabEstimate}
                  onChange={(e) => setRehabEstimate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white focus:border-[#00DD94] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="deal-arv-estimate" className="block text-xs font-medium text-white/70">
                  After Repair Value / ARV ($)
                </label>
                <input
                  id="deal-arv-estimate"
                  type="number"
                  required
                  value={arvEstimate}
                  onChange={(e) => setArvEstimate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white focus:border-[#00DD94] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="deal-projected-rent" className="block text-xs font-medium text-white/70">
                  Projected Monthly Rent ($)
                </label>
                <input
                  id="deal-projected-rent"
                  type="number"
                  required
                  value={estRent}
                  onChange={(e) => setEstRent(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white focus:border-[#00DD94] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-white/70">
                Deal Visibility
              </label>
              <select
                value={visibility}
                onChange={(e) =>
                  setVisibility(e.target.value as 'marketplace' | 'invitation_only' | 'private')
                }
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#16141a] px-3.5 py-2.5 text-sm text-white focus:border-[#00DD94] focus:outline-none"
              >
                <option value="marketplace">Marketplace (Public to verified network)</option>
                <option value="invitation_only">Invitation Only (Shared via links/email)</option>
                <option value="private">Private (Workspace &amp; Team only)</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
              {saveError ? (
                <p className="mr-auto text-xs text-red-300">{saveError}</p>
              ) : null}
              <button
                type="button"
                onClick={() => router.push('/dashboard/deals')}
                className="rounded-xl border border-white/10 px-5 py-2.5 text-xs font-medium text-white/70 hover:bg-white/5 transition"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#00DD94] px-6 py-2.5 text-xs font-semibold text-[#0a0a0f] hover:brightness-110 transition disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-[16px]">save</span>
                {isSaving ? 'Saving…' : 'Save to Pipeline as Baseline'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
