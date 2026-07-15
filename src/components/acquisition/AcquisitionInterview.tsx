'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Project } from '@/types/schema';
import { projectsService } from '@/lib/firebase/projects';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';
import { ChevronLeft, ChevronRight, CheckCircle, Info, Calendar, AlertCircle, CircleDot } from 'lucide-react';
import { RentEstimateCard } from './steps/RentEstimateCard';

import { deriveAllMetrics } from '@/lib/metrics';

interface AcquisitionInterviewProps {
  deal: Project;
}

// ── Step Configuration Type ────────────────────────────────────────
interface InterviewStep {
  id: string;
  question: string;
  description: string;
  field: string;
  type: 'text' | 'select' | 'currency' | 'percentage' | 'date';
  placeholder?: string;
  required: boolean;
  options?: { label: string; value: string }[];
  condition?: (data: any) => boolean;
}

export default function AcquisitionInterview({ deal }: AcquisitionInterviewProps) {
  const { user } = useAuth();
  
  // ── Flatten initial data from project to state for interview editing ──
  const [formData, setFormData] = useState<any>({
    propertyName: deal.propertyName || '',
    address: deal.address || '',
    dispositionType: deal.dispositionType || 'SALE',
    subStrategy: deal.subStrategy || 'FLIP',
    financials: {
      // R1: Entry path & ownership
      entryPath: deal.financials?.entryPath || '',
      ownershipPercentage: deal.financials?.ownershipPercentage ?? 100,
      startingPhase: deal.currentPhase || 1,

      // Projected underwriting (new acquisition path)
      targetPrice: deal.financials?.targetPrice || deal.financials?.purchasePrice || '',
      projectedRent: deal.financials?.projectedRent || deal.financials?.projectedMonthlyRent || deal.financials?.monthlyGrossRent || '',
      projectedMonthlyRentSource: deal.financials?.projectedMonthlyRentSource || '',
      estimatedARV: deal.financials?.estimatedARV || deal.financials?.arv || '',
      projectedSalePrice: deal.financials?.projectedSalePrice || '',
      projectedOpex: deal.financials?.projectedOpex || '',

      // Crowdfunding / capital raise
      raisingOutsideCapital: deal.financials?.raiseTarget ? 'yes' : 'no',
      raiseTarget: deal.financials?.raiseTarget || deal.financials?.capitalRaiseTarget || '',
      equitySplit: deal.financials?.equitySplit || '',
      investorInvites: deal.financials?.investorInvites?.join(', ') || '',
      marketplaceListing: deal.financials?.marketplaceListing ? 'yes' : 'no',

      // Offer tracking
      offerStatus: deal.financials?.offerStatus || 'No',
      offerAmount: deal.financials?.offerAmount || '',
      offerDate: deal.financials?.offerDate 
        ? (typeof deal.financials.offerDate === 'object' && deal.financials.offerDate.toDate 
            ? deal.financials.offerDate.toDate().toISOString().split('T')[0]
            : new Date(deal.financials.offerDate).toISOString().split('T')[0])
        : '',

      // Backdated actuals (already-owned path)
      purchasePrice: deal.financials?.purchasePrice || '',
      acquisitionDate: deal.financials?.acquisitionDate
        ? (typeof deal.financials.acquisitionDate === 'object' && (deal.financials.acquisitionDate as any).toDate
            ? (deal.financials.acquisitionDate as any).toDate().toISOString().split('T')[0]
            : new Date(deal.financials.acquisitionDate as any).toISOString().split('T')[0])
        : '',
      rehabActual: deal.financials?.rehabActual || deal.financials?.actualRehabCost || '',
      rehabDoneDate: deal.financials?.rehabDoneDate
        ? (typeof deal.financials.rehabDoneDate === 'object' && deal.financials.rehabDoneDate.toDate
            ? deal.financials.rehabDoneDate.toDate().toISOString().split('T')[0]
            : new Date(deal.financials.rehabDoneDate).toISOString().split('T')[0])
        : '',
      actualSalePrice: deal.financials?.actualSalePrice || '',
      soldDate: deal.financials?.soldDate
        ? (typeof deal.financials.soldDate === 'object' && (deal.financials.soldDate as any).toDate
            ? (deal.financials.soldDate as any).toDate().toISOString().split('T')[0]
            : new Date(deal.financials.soldDate as any).toISOString().split('T')[0])
        : '',
    }
  });

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // ── Sync state if deal updates externally ──
  useEffect(() => {
    setFormData({
      propertyName: deal.propertyName || '',
      address: deal.address || '',
      dispositionType: deal.dispositionType || 'SALE',
      subStrategy: deal.subStrategy || 'FLIP',
      financials: {
        entryPath: deal.financials?.entryPath || '',
        ownershipPercentage: deal.financials?.ownershipPercentage ?? 100,
        startingPhase: deal.currentPhase || 1,
        targetPrice: deal.financials?.targetPrice || deal.financials?.purchasePrice || '',
        projectedRent: deal.financials?.projectedRent || deal.financials?.projectedMonthlyRent || deal.financials?.monthlyGrossRent || '',
        projectedMonthlyRentSource: deal.financials?.projectedMonthlyRentSource || '',
        estimatedARV: deal.financials?.estimatedARV || deal.financials?.arv || '',
        projectedSalePrice: deal.financials?.projectedSalePrice || '',
        projectedOpex: deal.financials?.projectedOpex || '',
        raisingOutsideCapital: (deal.financials?.raiseTarget || deal.financials?.equitySplit) ? 'yes' : 'no',
        raiseTarget: deal.financials?.raiseTarget || deal.financials?.capitalRaiseTarget || '',
        equitySplit: deal.financials?.equitySplit || '',
        investorInvites: deal.financials?.investorInvites?.join(', ') || '',
        marketplaceListing: deal.financials?.marketplaceListing ? 'yes' : 'no',
        offerStatus: deal.financials?.offerStatus || 'No',
        offerAmount: deal.financials?.offerAmount || '',
        offerDate: deal.financials?.offerDate 
          ? (typeof deal.financials.offerDate === 'object' && deal.financials.offerDate.toDate 
              ? deal.financials.offerDate.toDate().toISOString().split('T')[0]
              : new Date(deal.financials.offerDate).toISOString().split('T')[0])
          : '',
        purchasePrice: deal.financials?.purchasePrice || '',
        acquisitionDate: deal.financials?.acquisitionDate
          ? (typeof deal.financials.acquisitionDate === 'object' && (deal.financials.acquisitionDate as any).toDate
              ? (deal.financials.acquisitionDate as any).toDate().toISOString().split('T')[0]
              : new Date(deal.financials.acquisitionDate as any).toISOString().split('T')[0])
          : '',
        rehabActual: deal.financials?.rehabActual || deal.financials?.actualRehabCost || '',
        rehabDoneDate: deal.financials?.rehabDoneDate
          ? (typeof deal.financials.rehabDoneDate === 'object' && deal.financials.rehabDoneDate.toDate
              ? deal.financials.rehabDoneDate.toDate().toISOString().split('T')[0]
              : new Date(deal.financials.rehabDoneDate).toISOString().split('T')[0])
          : '',
        actualSalePrice: deal.financials?.actualSalePrice || '',
        soldDate: deal.financials?.soldDate
          ? (typeof deal.financials.soldDate === 'object' && (deal.financials.soldDate as any).toDate
              ? (deal.financials.soldDate as any).toDate().toISOString().split('T')[0]
              : new Date(deal.financials.soldDate as any).toISOString().split('T')[0])
          : '',
      }
    });
  }, [deal]);

  // ── Helpers ──
  const isAlreadyOwned = formData.financials.entryPath === 'already_owned';
  const isNewAcquisition = formData.financials.entryPath === 'new_acquisition';
  const startingPhase = Number(formData.financials.startingPhase) || 1;

  // ── Questions configuration with branching conditions ──────────────
  const steps: InterviewStep[] = useMemo(() => [
    // ━━━ Q1: Property Address (always) ━━━
    {
      id: 'address',
      question: "What's the property address?",
      description: "Enter the full street address. We'll use this to identify and name the deal folder.",
      field: 'address',
      type: 'text',
      placeholder: 'e.g., 123 Main St, New York, NY 10001',
      required: true,
    },

    // ━━━ Q2: Entry Path — "Do you already own this property?" (R1) ━━━
    {
      id: 'entryPath',
      question: "Do you already own this property?",
      description: "Select 'Yes' if you've already acquired this property — you'll enter actual numbers. Select 'No' if you're still prospecting or evaluating.",
      field: 'financials.entryPath',
      type: 'select',
      options: [
        { label: 'No — New acquisition (entering projected numbers)', value: 'new_acquisition' },
        { label: 'Yes — I already own it (entering actuals)', value: 'already_owned' },
      ],
      required: true,
    },

    // ━━━ Q3: Starting Phase (only when already owned) ━━━
    {
      id: 'startingPhase',
      question: "What stage is this property at right now?",
      description: "This determines which actual data fields we'll ask you to fill in. You can always update these later.",
      field: 'financials.startingPhase',
      type: 'select',
      options: [
        { label: 'Purchased — Awaiting rehab or renting', value: '2' },
        { label: 'Mid-rehab — Currently renovating', value: '3' },
        { label: 'Stabilized — Rented or ready to sell', value: '3' },
        { label: 'Sold / Exited — Property has been disposed', value: '4' },
      ],
      required: true,
      condition: (data: any) => data.financials.entryPath === 'already_owned',
    },

    // ━━━ Q4: Ownership % (always shown) ━━━
    {
      id: 'ownershipPercentage',
      question: "What percentage of this deal do you own?",
      description: "If you have co-investors or partners, enter your personal share. Default is 100%. This scales all investor-share metrics.",
      field: 'financials.ownershipPercentage',
      type: 'percentage',
      placeholder: '100',
      required: true,
    },

    // ━━━ Q5: Strategy (always shown) ━━━
    {
      id: 'dispositionType',
      question: "What is your disposition type?",
      description: "How you plan to exit the property (Sale / Rent / Lease).",
      field: 'dispositionType',
      type: 'select',
      options: [
        { label: 'Sale', value: 'SALE' },
        { label: 'Rent', value: 'RENT' },
        { label: 'Lease', value: 'LEASE' },
      ],
      required: true,
    },
    {
      id: 'subStrategySale',
      question: "Select Sale Strategy",
      description: "Specific strategy for selling the asset.",
      field: 'subStrategy',
      type: 'select',
      options: [
        { label: 'Fix & Flip', value: 'FLIP' },
        { label: 'Wholesale / Direct Sell', value: 'WHOLESALE' },
        { label: 'Build & Sell', value: 'BUILD_SELL' },
      ],
      required: true,
      condition: (data: any) => data.dispositionType === 'SALE',
    },
    {
      id: 'subStrategyRent',
      question: "Select Rental Strategy",
      description: "Specific strategy for renting the asset.",
      field: 'subStrategy',
      type: 'select',
      options: [
        { label: 'Long Term', value: 'LONG_TERM' },
        { label: 'Short Term', value: 'SHORT_TERM' },
        { label: 'Mid Term', value: 'MID_TERM' },
        { label: 'BRRRR (Buy, Rehab, Rent, Refinance, Repeat)', value: 'BRRRR' },
      ],
      required: true,
      condition: (data: any) => data.dispositionType === 'RENT',
    },
    {
      id: 'subStrategyLease',
      question: "Select Lease Strategy",
      description: "Specific strategy for leasing the asset.",
      field: 'subStrategy',
      type: 'select',
      options: [
        { label: 'Triple Net (NNN)', value: 'NNN' },
        { label: 'Ground Lease', value: 'GROUND' },
        { label: 'Lease Option', value: 'LEASE_OPTION' },
      ],
      required: true,
      condition: (data: any) => data.dispositionType === 'LEASE',
    },

    // ═══════════════════════════════════════════════════════
    // BACKDATED ACTUALS — Only when entryPath === 'already_owned'
    // ═══════════════════════════════════════════════════════

    // Actual Purchase Price (Phase 2+)
    {
      id: 'actualPurchasePrice',
      question: "What was the actual purchase price?",
      description: "The real closing price you paid for this property.",
      field: 'financials.purchasePrice',
      type: 'currency',
      placeholder: '0.00',
      required: true,
      condition: (data: any) => data.financials.entryPath === 'already_owned',
    },

    // Acquisition Date (Phase 2+)
    {
      id: 'acquisitionDate',
      question: "When did you acquire this property?",
      description: "The closing date — this anchors all time-based metrics (hold period, IRR, annualized returns).",
      field: 'financials.acquisitionDate',
      type: 'date',
      required: true,
      condition: (data: any) => data.financials.entryPath === 'already_owned',
    },

    // Actual Rehab Cost (Phase 3+)
    {
      id: 'rehabActual',
      question: "What was the total rehab cost?",
      description: "Actual total spent on renovations, including materials, labor, and permits.",
      field: 'financials.rehabActual',
      type: 'currency',
      placeholder: '0.00',
      required: false,
      condition: (data: any) =>
        data.financials.entryPath === 'already_owned' &&
        Number(data.financials.startingPhase) >= 3,
    },

    // Rehab Completion Date (Phase 3+)
    {
      id: 'rehabDoneDate',
      question: "When was the rehab completed?",
      description: "The date all renovation work was finished. Leave blank if still in progress.",
      field: 'financials.rehabDoneDate',
      type: 'date',
      required: false,
      condition: (data: any) =>
        data.financials.entryPath === 'already_owned' &&
        Number(data.financials.startingPhase) >= 3,
    },

    // Actual Sale Price (Phase 4 only)
    {
      id: 'actualSalePrice',
      question: "What was the actual sale price?",
      description: "The final disposition price the property sold for.",
      field: 'financials.actualSalePrice',
      type: 'currency',
      placeholder: '0.00',
      required: true,
      condition: (data: any) =>
        data.financials.entryPath === 'already_owned' &&
        Number(data.financials.startingPhase) >= 4,
    },

    // Sale Date (Phase 4 only)
    {
      id: 'soldDate',
      question: "When was the property sold?",
      description: "The closing date of the sale transaction.",
      field: 'financials.soldDate',
      type: 'date',
      required: true,
      condition: (data: any) =>
        data.financials.entryPath === 'already_owned' &&
        Number(data.financials.startingPhase) >= 4,
    },

    // ═══════════════════════════════════════════════════════
    // PROJECTED UNDERWRITING — Only when entryPath === 'new_acquisition'
    // ═══════════════════════════════════════════════════════

    // Projected Rent (Rental / BRRRR only)
    {
      id: 'projectedRent',
      question: "What monthly rent do you expect? (PROJECTED)",
      description: "Provide the expected monthly rental income for the property once occupied.",
      field: 'financials.projectedRent',
      type: 'currency',
      placeholder: '0.00',
      required: true,
      condition: (data: any) =>
        data.financials.entryPath === 'new_acquisition' &&
        data.dispositionType === 'RENT',
    },

    // Estimated ARV (Flip / Wholesale only)
    {
      id: 'estimatedARV',
      question: "What is the estimated After-Repair Value (ARV)? (PROJECTED)",
      description: "The projected market value of the property after all renovations are completed.",
      field: 'financials.estimatedARV',
      type: 'currency',
      placeholder: '0.00',
      required: true,
      condition: (data: any) =>
        data.financials.entryPath === 'new_acquisition' &&
        data.dispositionType === 'SALE',
    },

    // Projected Sale Price (Flip / Wholesale only)
    {
      id: 'projectedSalePrice',
      question: "What is your expected sale price? (PROJECTED)",
      description: "The projected final disposition price when you sell the property.",
      field: 'financials.projectedSalePrice',
      type: 'currency',
      placeholder: '0.00',
      required: true,
      condition: (data: any) =>
        data.financials.entryPath === 'new_acquisition' &&
        data.dispositionType === 'SALE',
    },

    // Target Purchase Price (new acquisition only)
    {
      id: 'targetPrice',
      question: "What's your target purchase price? (PROJECTED)",
      description: "Your target acquisition price. This serves as the basis for GRM and Cap Rate projections.",
      field: 'financials.targetPrice',
      type: 'currency',
      placeholder: '0.00',
      required: true,
      condition: (data: any) => data.financials.entryPath === 'new_acquisition',
    },

    // Projected Opex (new acquisition only)
    {
      id: 'projectedOpex',
      question: "Roughly what will monthly operating expenses run? (PROJECTED)",
      description: "Estimate monthly holding costs (taxes, insurance, utilities, HOA) and management fees.",
      field: 'financials.projectedOpex',
      type: 'currency',
      placeholder: '0.00',
      required: true,
      condition: (data: any) => data.financials.entryPath === 'new_acquisition',
    },

    // ═══════════════════════════════════════════════════════
    // CROWDFUNDING / CAPITAL RAISE — Both paths
    // ═══════════════════════════════════════════════════════

    {
      id: 'raisingOutsideCapital',
      question: "Are you raising outside capital?",
      description: "Decide if you will bring in partners or syndicators to fund this purchase.",
      field: 'financials.raisingOutsideCapital',
      type: 'select',
      options: [
        { label: 'Yes, raising outside capital', value: 'yes' },
        { label: 'No, funding with internal capital', value: 'no' },
      ],
      required: true,
    },

    {
      id: 'raiseTarget',
      question: "How much capital are you raising?",
      description: "Total funding amount requested from passive investors.",
      field: 'financials.raiseTarget',
      type: 'currency',
      placeholder: '0.00',
      required: true,
      condition: (data: any) => data.financials.raisingOutsideCapital === 'yes',
    },

    {
      id: 'equitySplit',
      question: "What equity % are you offering to investors?",
      description: "The percentage of ownership allocated to outside investors in exchange for their funding.",
      field: 'financials.equitySplit',
      type: 'percentage',
      placeholder: '0 - 100',
      required: true,
      condition: (data: any) => data.financials.raisingOutsideCapital === 'yes',
    },

    {
      id: 'investorInvites',
      question: "Who should we invite?",
      description: "Enter a comma-separated list of investor emails. We'll queue draft invitations.",
      field: 'financials.investorInvites',
      type: 'text',
      placeholder: 'investor1@example.com, investor2@example.com',
      required: false,
      condition: (data: any) => data.financials.raisingOutsideCapital === 'yes',
    },

    {
      id: 'marketplaceListing',
      question: "Post this project to the Deal Marketplace?",
      description: "Select whether to list this opportunity publicly to find external buyers or partners.",
      field: 'financials.marketplaceListing',
      type: 'select',
      options: [
        { label: 'Yes, list on Deal Marketplace', value: 'yes' },
        { label: 'No, keep private', value: 'no' },
      ],
      required: true,
      condition: (data: any) => data.financials.raisingOutsideCapital === 'yes',
    },

    // ═══════════════════════════════════════════════════════
    // OFFER TRACKING — New acquisition only
    // ═══════════════════════════════════════════════════════

    {
      id: 'offerStatus',
      question: "Have you made an offer on this property?",
      description: "Current status of offer negotiations. An accepted offer is required to advance to Purchase.",
      field: 'financials.offerStatus',
      type: 'select',
      options: [
        { label: 'No offer made yet', value: 'No' },
        { label: 'Drafting offer letter', value: 'Draft' },
        { label: 'Offer Sent (Pending response)', value: 'Sent' },
        { label: 'Countered by seller', value: 'Countered' },
        { label: 'Offer Accepted / Under Contract', value: 'Accepted' },
        { label: 'Offer Expired', value: 'Expired' },
        { label: 'Offer Withdrawn', value: 'Withdrawn' },
      ],
      required: true,
      condition: (data: any) => data.financials.entryPath === 'new_acquisition',
    },

    {
      id: 'offerAmount',
      question: "What is your offer amount?",
      description: "The purchase price submitted in your latest offer contract.",
      field: 'financials.offerAmount',
      type: 'currency',
      placeholder: '0.00',
      required: true,
      condition: (data: any) =>
        data.financials.entryPath === 'new_acquisition' &&
        data.financials.offerStatus !== 'No',
    },

    {
      id: 'offerDate',
      question: "When was the offer made?",
      description: "Select the date the offer letter was officially submitted.",
      field: 'financials.offerDate',
      type: 'date',
      required: true,
      condition: (data: any) =>
        data.financials.entryPath === 'new_acquisition' &&
        data.financials.offerStatus !== 'No',
    },
  ], [formData]);

  // ── Compute active questions based on current answers ──
  const activeQuestions = useMemo(() => {
    return steps.filter(s => !s.condition || s.condition(formData));
  }, [steps, formData]);

  const activeQuestion = activeQuestions[currentStepIndex] || null;

  // ── Extract nested values dynamically ──
  const getValue = (path: string) => {
    const parts = path.split('.');
    let current: any = formData;
    for (const part of parts) {
      if (current === undefined || current === null) return '';
      current = current[part];
    }
    return current ?? '';
  };

  // ── Set nested value ──
  const updateValue = (path: string, val: any) => {
    setFormData((prev: any) => {
      const copy = JSON.parse(JSON.stringify(prev)); // deep copy for nested mutations
      const parts = path.split('.');
      let current = copy;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) current[parts[i]] = {};
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = val;
      
      // Auto-set propertyName from street address if propertyName is empty
      if (path === 'address') {
        const street = val.split(',')[0]?.trim();
        if (street && !copy.propertyName) {
          copy.propertyName = `The ${street} Project`;
        }
      }
      
      return copy;
    });
  };

  // ── Navigation ──
  const handleNext = async () => {
    if (!activeQuestion) return;
    const value = getValue(activeQuestion.field);
    if (activeQuestion.required && (value === '' || value === undefined || value === null)) {
      toast.error("This field is required.");
      return;
    }

    // Save on-the-fly when clicking Next to avoid data loss
    await handleSave();

    if (currentStepIndex < activeQuestions.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      toast.success("Underwriting interview complete! Projections updated.");
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  // ── Save updates to backend Firestore ──
  const handleSave = async () => {
    if (!user) return;
    try {
      setIsSaving(true);
      
      // Prepare values converting strings to clean types
      const toNum = (v: any): number | undefined => {
        if (v === '' || v === null || v === undefined) return undefined;
        const n = Number(v);
        return isNaN(n) ? undefined : n;
      };

      const toDate = (v: any): Date | null => {
        if (!v) return null;
        return new Date(v);
      };

      const invites = formData.financials.investorInvites
        ? formData.financials.investorInvites.split(',').map((e: string) => e.trim()).filter(Boolean)
        : [];

      const isOwned = formData.financials.entryPath === 'already_owned';
      const selectedPhase = Number(formData.financials.startingPhase) || 1;

      const dispositionType = formData.dispositionType;
      const subStrategy = formData.subStrategy;

      const updates: Partial<Project> = {
        propertyName: formData.propertyName || `The ${formData.address.split(',')[0]?.trim() || 'Untitled'} Project`,
        address: formData.address,
        dispositionType: dispositionType as any,
        subStrategy: subStrategy as any,
        financials: {
          ...deal.financials,
          // R1: Entry path & ownership
          entryPath: formData.financials.entryPath || undefined,
          ownershipPercentage: toNum(formData.financials.ownershipPercentage) ?? 100,

          // Projected underwriting fields
          targetPrice: toNum(formData.financials.targetPrice),
          purchasePrice: isOwned
            ? (toNum(formData.financials.purchasePrice) ?? deal.financials?.purchasePrice ?? 0)
            : (toNum(formData.financials.targetPrice) ?? deal.financials?.purchasePrice ?? 0),
          projectedRent: toNum(formData.financials.projectedRent),
          projectedMonthlyRent: toNum(formData.financials.projectedRent),
          projectedMonthlyRentSource: formData.financials.projectedMonthlyRentSource || undefined,
          estimatedARV: toNum(formData.financials.estimatedARV) ?? deal.financials?.estimatedARV ?? 0,
          arv: toNum(formData.financials.estimatedARV),
          projectedSalePrice: toNum(formData.financials.projectedSalePrice),
          projectedOpex: toNum(formData.financials.projectedOpex),

          // Capital raise
          raiseTarget: toNum(formData.financials.raiseTarget),
          capitalRaiseTarget: toNum(formData.financials.raiseTarget),
          equitySplit: toNum(formData.financials.equitySplit),
          investorInvites: invites,
          marketplaceListing: formData.financials.marketplaceListing === 'yes',

          // Offer tracking
          offerStatus: formData.financials.offerStatus,
          offerAmount: toNum(formData.financials.offerAmount),
          offerDate: toDate(formData.financials.offerDate),

          // Backdated actuals
          acquisitionDate: toDate(formData.financials.acquisitionDate) ?? undefined,
          rehabActual: toNum(formData.financials.rehabActual),
          actualRehabCost: toNum(formData.financials.rehabActual),
          rehabDoneDate: toDate(formData.financials.rehabDoneDate) ?? undefined,
          actualSalePrice: toNum(formData.financials.actualSalePrice),
          soldDate: toDate(formData.financials.soldDate) ?? undefined,

          // Preserve existing arrays
          costs: deal.financials?.costs ?? [],
        }
      };

      // ── Auto-set phase and status based on entry path ──
      if (isOwned) {
        // Already-owned: jump to the selected phase
        const phaseMap: Record<number, { phase: string; status: string }> = {
          2: { phase: 'Phase 2: Acquisition', status: 'Under Contract' },
          3: { phase: 'Phase 3: Holding & Rehab', status: 'Renovating' },
          4: { phase: 'Phase 4: Closing & Exit', status: 'Sold' },
        };
        const mapping = phaseMap[selectedPhase];
        if (mapping) {
          updates.currentPhase = selectedPhase;
          updates.phaseStatus = mapping.phase as any;
          updates.status = mapping.status as any;
        }
      } else {
        // New acquisition: auto update status to Under Contract if offer accepted
        if (formData.financials.offerStatus === 'Accepted' && deal.status !== 'Under Contract') {
          updates.status = 'Under Contract';
          updates.phaseStatus = 'Phase 2: Acquisition';
          updates.currentPhase = 2;
        }
      }

      await projectsService.updateProject(deal.id, updates);
    } catch (e) {
      console.error(e);
      toast.error("Failed to save progress.");
    } finally {
      setIsSaving(false);
    }
  };

  const isLastStep = currentStepIndex === activeQuestions.length - 1;

  // ── Render question component based on type ──
  const renderInput = () => {
    if (!activeQuestion) return null;
    const value = getValue(activeQuestion.field);

    switch (activeQuestion.type) {
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => updateValue(activeQuestion.field, e.target.value)}
            className="pw-input text-lg py-3 px-4 w-full max-w-lg border border-pw-border focus:outline-none"
          >
            <option value="" disabled>Select an option</option>
            {activeQuestion.options?.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        );
      case 'currency':
        if (activeQuestion.id === 'projectedRent') {
          return (
            <RentEstimateCard
              projectId={deal.id}
              value={value}
              onChange={(val, source) => {
                updateValue(activeQuestion.field, val);
                updateValue('financials.projectedMonthlyRentSource', source);
              }}
              initialSource={formData.financials.projectedMonthlyRentSource}
            />
          );
        }
        return (
          <div className="relative w-full max-w-lg">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-medium text-text-secondary">$</span>
            <input
              type="number"
              value={value}
              onChange={(e) => updateValue(activeQuestion.field, e.target.value)}
              placeholder={activeQuestion.placeholder}
              className="pw-input text-lg py-3 pl-10 pr-4 w-full border border-pw-border focus:outline-none tabular-nums"
            />
          </div>
        );
      case 'percentage':
        return (
          <div className="relative w-full max-w-lg">
            <input
              type="number"
              value={value}
              onChange={(e) => updateValue(activeQuestion.field, e.target.value)}
              placeholder={activeQuestion.placeholder}
              className="pw-input text-lg py-3 pl-4 pr-10 w-full border border-pw-border focus:outline-none tabular-nums"
              min="0"
              max="100"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-medium text-text-secondary">%</span>
          </div>
        );
      case 'date':
        return (
          <div className="relative w-full max-w-lg">
            <input
              type="date"
              value={value}
              onChange={(e) => updateValue(activeQuestion.field, e.target.value)}
              className="pw-input text-lg py-3 px-4 w-full border border-pw-border focus:outline-none"
            />
          </div>
        );
      case 'text':
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => updateValue(activeQuestion.field, e.target.value)}
            placeholder={activeQuestion.placeholder}
            className="pw-input text-lg py-3 px-4 w-full max-w-lg border border-pw-border focus:outline-none"
          />
        );
    }
  };

  // ── Preview inline calculations for Max Offer (70% Rule) ──
  const isARVandRehabPopulated = formData.dispositionType === 'SALE' && formData.subStrategy === 'FLIP' && formData.financials.estimatedARV && deal.financials?.projectedRehabCost;
  const computedMAO = useMemo(() => {
    if (!isARVandRehabPopulated) return 0;
    const arv = Number(formData.financials.estimatedARV) || 0;
    const rehab = deal.financials?.projectedRehabCost || 0;
    const tempFinancials = {
      estimatedARV: arv,
      projectedRehabCost: rehab,
    };
    const metrics = deriveAllMetrics(tempFinancials as any);
    return metrics.mao ?? 0;
  }, [formData.financials.estimatedARV, deal.financials?.projectedRehabCost, isARVandRehabPopulated]);

  // ── Crowdfunding ownership preview ──
  const equitySplitNum = Number(formData.financials.equitySplit) || 0;
  const projectedOwnershipAfterSplit = Math.max(0, 100 - equitySplitNum);

  // ── Advance Criteria Checklist ──
  const advanceCriteria = useMemo(() => {
    const hasAddress = !!formData.address?.trim();
    const hasOwnership = (Number(formData.financials.ownershipPercentage) || 0) > 0;
    const hasStrategy = !!formData.dispositionType && !!formData.subStrategy;
    const hasEntryPath = !!formData.financials.entryPath;

    if (isAlreadyOwned) {
      const hasPurchasePrice = (Number(formData.financials.purchasePrice) || 0) > 0;
      const hasAcqDate = !!formData.financials.acquisitionDate;
      return [
        { label: 'Property Address', met: hasAddress },
        { label: 'Entry Path Selected', met: hasEntryPath },
        { label: 'Ownership % Set', met: hasOwnership },
        { label: 'Strategy Selected', met: hasStrategy },
        { label: 'Actual Purchase Price', met: hasPurchasePrice },
        { label: 'Acquisition Date', met: hasAcqDate },
      ];
    }

    // New acquisition criteria
    const hasTargetPrice = (Number(formData.financials.targetPrice) || 0) > 0;
    const offerAccepted = formData.financials.offerStatus === 'Accepted';
    return [
      { label: 'Property Address', met: hasAddress },
      { label: 'Entry Path Selected', met: hasEntryPath },
      { label: 'Ownership % Set', met: hasOwnership },
      { label: 'Strategy Selected', met: hasStrategy },
      { label: 'Target Purchase Price', met: hasTargetPrice },
      { label: 'Accepted Offer (Advances to Purchase)', met: offerAccepted },
    ];
  }, [formData, isAlreadyOwned]);

  const allCriteriaMet = advanceCriteria.every(c => c.met);

  return (
    <div className="bg-pw-white border border-pw-border p-6 md:p-8 text-left shadow-sm mb-8 w-full max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-pw-border pb-4 mb-6">
        <div>
          <h2 className="text-xs font-black uppercase tracking-[0.18em] text-text-primary">Acquisition Interview</h2>
          <p className="text-[10px] text-text-secondary font-semibold uppercase mt-0.5 tracking-wider">
            {isAlreadyOwned ? 'ENTERING ACTUALS' : isNewAcquisition ? 'PROJECTED UNDERWRITING' : 'GETTING STARTED'}
          </p>
        </div>
        <div className="text-[11px] font-mono text-text-secondary bg-pw-bg px-2.5 py-1 border border-pw-border">
          STEP {currentStepIndex + 1} OF {activeQuestions.length}
        </div>
      </div>

      {/* Main Questionnaire */}
      {activeQuestion && (
        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-xl font-light tracking-tight text-text-primary">
              {activeQuestion.question}
            </h3>
            {activeQuestion.description && (
              <p className="text-sm text-text-secondary max-w-xl">{activeQuestion.description}</p>
            )}
          </div>

          <div className="pt-2">
            {renderInput()}
          </div>

          {/* Inline MAO preview callout */}
          {activeQuestion.id === 'estimatedARV' && isARVandRehabPopulated && (
            <div className="flex items-start gap-3 p-4 bg-pw-bg border border-pw-border max-w-lg text-xs leading-relaxed text-text-secondary">
              <Info className="w-4 h-4 text-text-primary flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-text-primary">70% Rule MAO Preview:</span> Under current assumptions (ARV: ${Number(formData.financials.estimatedARV).toLocaleString()}, Rehab: ${(deal.financials?.projectedRehabCost || 0).toLocaleString()}), your Maximum Allowable Offer (MAO) is <span className="font-bold text-text-primary">${computedMAO.toLocaleString()}</span>.
              </div>
            </div>
          )}

          {/* Crowdfunding ownership preview callout */}
          {activeQuestion.id === 'equitySplit' && equitySplitNum > 0 && (
            <div className="flex items-start gap-3 p-4 bg-pw-bg border border-pw-border max-w-lg text-xs leading-relaxed text-text-secondary">
              <Info className="w-4 h-4 text-text-primary flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-text-primary">Projected Ownership Preview:</span> If {equitySplitNum}% equity is committed by investors, your projected ownership will be <span className="font-bold text-text-primary">{projectedOwnershipAfterSplit}%</span>. This updates automatically when investors confirm.
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-6 border-t border-pw-border mt-8">
            <button
              onClick={handleBack}
              disabled={currentStepIndex === 0 && isSaving}
              className="pw-btn pw-btn--sm pw-btn--secondary font-bold uppercase tracking-widest text-[11px] flex items-center gap-1.5"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Back
            </button>
            <div className="flex items-center gap-3">
              {!activeQuestion.required && (
                <button
                  onClick={() => setCurrentStepIndex(prev => prev + 1)}
                  className="text-xs text-text-secondary hover:text-text-primary px-3 py-1 font-medium"
                >
                  Skip
                </button>
              )}
              <button
                onClick={handleNext}
                disabled={isSaving}
                className="pw-btn pw-btn--sm pw-btn--primary font-bold uppercase tracking-widest text-[11px] flex items-center gap-1.5"
              >
                {isLastStep ? 'Complete Interview' : 'Next'}
                {!isLastStep && <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          ADVANCE CRITERIA — Readiness Panel (always visible)
          ═══════════════════════════════════════════════════════ */}
      <div className="mt-8 pt-6 border-t border-pw-border">
        <div className="flex items-center gap-2 mb-4">
          <CircleDot className="w-4 h-4 text-text-primary" />
          <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-text-primary">
            {isAlreadyOwned ? 'Entry Readiness' : 'Advance to Purchase — Requirements'}
          </h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {advanceCriteria.map((c) => (
            <div
              key={c.label}
              className={`flex items-center gap-2.5 px-3 py-2 border text-xs font-medium transition-colors ${
                c.met
                  ? 'border-pw-border/20 bg-pw-bg text-text-primary'
                  : 'border-pw-border bg-pw-white text-text-secondary'
              }`}
            >
              {c.met ? (
                <CheckCircle className="w-3.5 h-3.5 text-text-primary flex-shrink-0" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-text-secondary/50 flex-shrink-0" />
              )}
              <span>{c.label}</span>
            </div>
          ))}
        </div>
        {allCriteriaMet && (
          <div className="mt-3 flex items-center gap-2 text-xs font-bold text-text-primary">
            <CheckCircle className="w-4 h-4" />
            <span>
              {isAlreadyOwned
                ? `Ready — property will enter Phase ${startingPhase} on save.`
                : 'All criteria met — ready to advance to Purchase phase.'
              }
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
