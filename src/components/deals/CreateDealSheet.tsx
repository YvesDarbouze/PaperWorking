'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Building2, Calculator, ShieldCheck, ArrowRight, Loader2, Lock } from 'lucide-react';
import { generateDealSlug, checkDuplicateDeal, createAnalyzerHandoffPayload, DealData } from '@/lib/deals/slugUtils';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

interface ResolvedAddressInfo {
  placeId?: string;
  formattedAddress: string;
  streetNumber?: string;
  route?: string;
  city?: string;
  state?: string;
  zip?: string;
  lat?: number;
  lng?: number;
}

interface CreateDealSheetProps {
  isOpen: boolean;
  onClose: () => void;
  initialAddress?: ResolvedAddressInfo | null;
  existingDeals?: DealData[];
  onDealCreated?: (deal: DealData) => void;
}

export default function CreateDealSheet({
  isOpen,
  onClose,
  initialAddress,
  existingDeals = [],
  onDealCreated,
}: CreateDealSheetProps) {
  const router = useRouter();
  const { user, profile } = useAuth();

  const [address, setAddress] = useState(initialAddress?.formattedAddress || '');
  const [placeId, setPlaceId] = useState(initialAddress?.placeId || '');
  const [city, setCity] = useState(initialAddress?.city || '');
  const [state, setState] = useState(initialAddress?.state || '');
  const [zip, setZip] = useState(initialAddress?.zip || '');
  const [lat, setLat] = useState(initialAddress?.lat || 0);
  const [lng, setLng] = useState(initialAddress?.lng || 0);

  const [price, setPrice] = useState<number | ''>(350000);
  const [rehabCost, setRehabCost] = useState<number | ''>(50000);
  const [arv, setArv] = useState<number | ''>(480000);
  const [estimatedRent, setEstimatedRent] = useState<number | ''>(3200);
  const [fundingTarget, setFundingTarget] = useState<number | ''>(200000);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<DealData | null>(null);

  useEffect(() => {
    if (initialAddress) {
      setAddress(initialAddress.formattedAddress || '');
      setPlaceId(initialAddress.placeId || '');
      setCity(initialAddress.city || '');
      setState(initialAddress.state || '');
      setZip(initialAddress.zip || '');
      setLat(initialAddress.lat || 0);
      setLng(initialAddress.lng || 0);
    }
  }, [initialAddress]);

  // Check for duplicate on address or placeId change
  useEffect(() => {
    if (!address) {
      setDuplicateWarning(null);
      return;
    }
    const slug = generateDealSlug(address);
    const dupCheck = checkDuplicateDeal(placeId, slug, existingDeals);
    if (dupCheck.isDuplicate && dupCheck.existingDeal) {
      setDuplicateWarning(dupCheck.existingDeal as DealData);
    } else {
      setDuplicateWarning(null);
    }
  }, [address, placeId, existingDeals]);

  if (!isOpen) return null;

  const handleGoToExistingDeal = () => {
    if (!duplicateWarning) return;
    toast.success('Redirecting to existing Deal at this property…', { id: 'dup-deal-redirect' });
    onClose();
    if (duplicateWarning.slug) {
      router.push(`/dashboard/deals?slug=${duplicateWarning.slug}`);
    } else if (duplicateWarning.id) {
      router.push(`/dashboard/deals?id=${duplicateWarning.id}`);
    }
  };

  const handleSubmit = async (targetStatus: 'DRAFT' | 'LISTED') => {
    if (!address.trim()) {
      toast.error('Please enter a valid property address.');
      return;
    }

    const slug = generateDealSlug(address);
    const dupCheck = checkDuplicateDeal(placeId, slug, existingDeals);

    // Prompt 2 requirement: Duplicate attempt -> route to existing Deal instead of erroring dead-end
    if (dupCheck.isDuplicate && dupCheck.existingDeal) {
      toast('A Deal already exists at this property address. Routing to existing Deal…', { icon: 'ℹ️' });
      onClose();
      if (dupCheck.existingDeal.slug) {
        router.push(`/dashboard/deals?slug=${dupCheck.existingDeal.slug}`);
      } else {
        router.push(`/dashboard/deals?id=${dupCheck.existingDeal.id}`);
      }
      return;
    }

    setIsSubmitting(true);

    try {
      const numPrice = Number(price) || 0;
      const numRehab = Number(rehabCost) || 0;
      const numArv = Number(arv) || 0;
      const numRent = Number(estimatedRent) || 0;
      const numTarget = Number(fundingTarget) || 0;

      const dealId = `deal_${Date.now()}`;
      const handoffPayload = createAnalyzerHandoffPayload({
        id: dealId,
        displayAddress: address,
        price: numPrice,
        rehabCost: numRehab,
        arv: numArv,
        estimatedRent: numRent,
        fundingTarget: numTarget,
      });

      const newDeal: DealData = {
        id: dealId,
        placeId: placeId || `place_${Date.now()}`,
        slug,
        displayAddress: address,
        city,
        state,
        zip,
        lat,
        lng,
        ownerId: user?.uid || 'user_demo',
        price: numPrice,
        rehabCost: numRehab,
        arv: numArv,
        estimatedRent: numRent,
        status: targetStatus,
        fundingTarget: numTarget,
        currency: 'USD',
        analyzerSnapshotId: handoffPayload.analyzerSnapshotId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Store analyzer snapshot payload in localStorage / sessionStorage for reciprocal entry
      if (typeof window !== 'undefined') {
        localStorage.setItem(`pw_analyzer_snap_${handoffPayload.analyzerSnapshotId}`, JSON.stringify(handoffPayload));
        sessionStorage.setItem('pw_last_created_deal', JSON.stringify(newDeal));
      }

      if (onDealCreated) {
        onDealCreated(newDeal);
      }

      toast.success(
        targetStatus === 'LISTED'
          ? 'Deal successfully listed to Marketplace!'
          : 'Deal saved as Draft.',
        { id: 'create-deal-success' }
      );

      onClose();
    } catch (err: any) {
      console.error('Failed to create deal:', err);
      toast.error('Failed to create deal. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenInAnalyzer = () => {
    const numPrice = Number(price) || 0;
    const numRehab = Number(rehabCost) || 0;
    const numArv = Number(arv) || 0;
    const numRent = Number(estimatedRent) || 0;

    const queryParams = new URLSearchParams({
      address,
      purchasePrice: numPrice.toString(),
      rehabCost: numRehab.toString(),
      arv: numArv.toString(),
      rent: numRent.toString(),
    });

    onClose();
    router.push(`/dashboard/deal-analyzer?${queryParams.toString()}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm p-0 md:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl h-full md:h-[90vh] bg-pw-bg border border-pw-border rounded-none md:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-pw-border bg-[var(--color-surface)]">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-slate-300" />
            <h2 className="text-base font-bold text-slate-100">Create New Deal Listing</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/5 transition-all"
            aria-label="Close creation sheet"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Duplicate Warning Alert */}
          {duplicateWarning && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Existing Deal Found at this Address</span>
              </div>
              <p className="leading-relaxed">
                A Deal for <strong>{duplicateWarning.displayAddress}</strong> is already active on PaperWorking.
              </p>
              <button
                onClick={handleGoToExistingDeal}
                className="mt-1 px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-all flex items-center gap-1"
              >
                <span>View Existing Deal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Address Section */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Property Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 123 Main St, Austin, TX 78701"
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-pw-border text-slate-100 text-sm focus:border-slate-700 focus:outline-none"
            />
            {address && (
              <p className="text-[11px] text-slate-400">
                Canonical Slug: <code className="text-slate-300 font-mono">{generateDealSlug(address)}</code>
              </p>
            )}
          </div>

          {/* Financial Inputs */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b border-pw-border pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-slate-300" />
                <span>Investor Decision Metrics</span>
              </h3>
              <button
                onClick={handleOpenInAnalyzer}
                type="button"
                className="text-xs font-bold text-slate-300 hover:text-slate-300 transition-all flex items-center gap-1"
              >
                <span>Open in Deal Analyzer</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Purchase Price ($)</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-pw-border text-slate-100 text-sm focus:border-slate-700 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Estimated Rehab ($)</label>
                <input
                  type="number"
                  value={rehabCost}
                  onChange={(e) => setRehabCost(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-pw-border text-slate-100 text-sm focus:border-slate-700 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">After Repair Value - ARV ($)</label>
                <input
                  type="number"
                  value={arv}
                  onChange={(e) => setArv(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-pw-border text-slate-100 text-sm focus:border-slate-700 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Monthly Rent ($)</label>
                <input
                  type="number"
                  value={estimatedRent}
                  onChange={(e) => setEstimatedRent(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-pw-border text-slate-100 text-sm focus:border-slate-700 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Funding Target ($)</label>
              <input
                type="number"
                value={fundingTarget}
                onChange={(e) => setFundingTarget(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-pw-border text-slate-100 text-sm focus:border-slate-700 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-pw-border bg-[var(--color-surface)] flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-all"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit('DRAFT')}
              className="px-4 py-2.5 rounded-xl border border-pw-border text-xs font-bold text-slate-200 hover:bg-white/5 transition-all disabled:opacity-50"
            >
              Save as Draft
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit('LISTED')}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-bold text-xs transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Publishing…</span>
                </>
              ) : (
                <span>List to Marketplace</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
