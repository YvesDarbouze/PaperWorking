'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Building2,
  Hammer,
  Repeat,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Edit3,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Percent,
  Calculator,
  ShieldAlert,
} from 'lucide-react';

import {
  FIELD_REGISTRY,
  Strategy,
  FieldDefinition,
  validateField,
  deriveFields,
  getFieldDefaultValue,
} from '@/lib/deal-analyzer/fieldRegistry';
import {
  WIZARD_STEP_MAPS,
  WizardStepDefinition,
  getWizardStepsForStrategy,
} from '@/lib/deal-analyzer/wizardStepMap';
import {
  saveWizardDraft,
  loadWizardDraft,
  clearWizardDraft,
  validateStepFields,
  canProceedToNextStep,
} from '@/lib/deal-analyzer/wizardState';
import {
  calculateRentalDeal,
  calculateFlipDeal,
  calculateBRRRRDeal,
} from '@/lib/deal-analyzer/calcEngine';
import { PropertyLookupResult, PropertyFacts } from '@/lib/deal-analyzer/propertyLookup';
import { DealAnalyzerResults } from './DealAnalyzerResults';
import posthog from 'posthog-js';

interface DealAnalyzerWizardProps {
  initialStrategy?: Strategy;
  onComplete?: (formData: Record<string, any>) => void;
}

/**
 * DealAnalyzerWizard.tsx
 * Multi-step wizard shell for Deal Underwriting Analyzer (PROMPT 2, 3, 4)
 */
export function DealAnalyzerWizardInner({ initialStrategy, onComplete }: DealAnalyzerWizardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [strategy, setStrategy] = useState<Strategy | null>(initialStrategy ?? null);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasDraft, setHasDraft] = useState<boolean>(false);
  const [showDraftPrompt, setShowDraftPrompt] = useState<boolean>(false);

  // Progressive Disclosure Toggles
  const [showAdvancedDetails, setShowAdvancedDetails] = useState<boolean>(false);
  const [showExpenseItemization, setShowExpenseItemization] = useState<boolean>(false);
  const [showHoldingItemization, setShowHoldingItemization] = useState<boolean>(false);

  // Unit mode state for percentage fields (% vs $/mo vs $/yr vs $)
  const [unitModes, setUnitModes] = useState<Record<string, '%' | '$/mo' | '$/yr' | '$'>>({});

  // PROMPT 4 — Address Lookup, Provenance Badges & Replace Prompts State
  const [isLookupLoading, setIsLookupLoading] = useState<boolean>(false);
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);
  const [propertyFacts, setPropertyFacts] = useState<PropertyFacts | null>(null);
  const [prefilledBadges, setPrefilledBadges] = useState<Record<string, { source: string; retrievedAt: string }>>({});
  const [replacePrompts, setReplacePrompts] = useState<Record<string, {
    fetchedValue: any;
    userValue: any;
    lookupValue: any;
    label: string;
    fieldLabel: string;
    source: string;
  }>>({});
  const [showResults, setShowResults] = useState<boolean>(false);

  const handleSubmitAnalysis = () => {
    setShowResults(true);
    if (onComplete) {
      onComplete(formData);
    }
  };

  const headingRef = useRef<HTMLHeadingElement>(null);

  // Sync with URL query parameters for browser back/forward history support
  useEffect(() => {
    const s = (searchParams?.get('strategy') as Strategy | null) || (initialStrategy ?? null);
    const stepStr = searchParams?.get('step');
    const step = stepStr ? parseInt(stepStr, 10) : 1;

    if (s && ['rental', 'flip', 'brrrr'].includes(s)) {
      setStrategy(s);
      setCurrentStepIndex(step > 0 ? step - 1 : 0);
    }
  }, [searchParams, initialStrategy]);

  // Check for existing draft when strategy changes
  useEffect(() => {
    if (!strategy) return;
    const existing = loadWizardDraft(strategy);
    if (existing && Object.keys(existing.formData).length > 0) {
      setHasDraft(true);
      setShowDraftPrompt(true);
    } else {
      initializeStrategyDefaults(strategy);
    }
  }, [strategy]);

  // Focus header on step transition for screen reader accessibility (WCAG 2.4.3)
  useEffect(() => {
    if (headingRef.current) {
      headingRef.current.focus();
    }
  }, [currentStepIndex, strategy]);

  // ── STEP-LEVEL ANALYTICS TRACKING ──
  const stepStartTimeRef = useRef<number>(Date.now());
  const fieldFocusTimeRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!strategy) return;
    const durationSec = Math.round((Date.now() - stepStartTimeRef.current) / 1000);
    const steps = getWizardStepsForStrategy(strategy, { needsRehab: !!formData.needsRehab });
    try {
      posthog.capture('deal_analyzer_step_viewed', {
        strategy,
        stepIndex: currentStepIndex,
        stepTitle: steps[currentStepIndex]?.title ?? 'Review',
        previousStepDurationSec: durationSec,
      });
    } catch (e) {}
    stepStartTimeRef.current = Date.now();
  }, [currentStepIndex, strategy]);

  const trackDisclosureToggle = (disclosureKey: string, isOpen: boolean) => {
    try {
      posthog.capture('deal_analyzer_disclosure_toggled', {
        strategy: strategy ?? 'none',
        stepIndex: currentStepIndex,
        disclosureKey,
        isOpen,
      });
    } catch (e) {}
  };

  const initializeStrategyDefaults = (strat: Strategy) => {
    const steps = WIZARD_STEP_MAPS[strat];
    const initial: Record<string, any> = {
      isCashPurchase: false,
      needsRehab: false,
      isSelfManaged: false,
      quickExpenseMode: false,
      vacancyRate: 5,
      repairsPercent: 5,
      capexPercent: 5,
      propertyMgmtPercent: 10,
      monthlyHOA: 0,
      insuranceAnnual: 1200,
      rentGrowthAnnual: 3,
      expenseGrowthAnnual: 3,
      appreciationAnnual: 3,
      holdPeriodYears: 10,
      sellingCostsPercent: 8,
    };

    steps.forEach((step) => {
      step.fieldKeys.forEach((key) => {
        const def = FIELD_REGISTRY[key];
        if (def && initial[key] === undefined) {
          initial[key] = getFieldDefaultValue(key, strat);
        }
      });
    });

    const derived = deriveFields(initial, strat);
    setFormData(derived);
    setErrors({});
    setTouchedFields({});
    setShowDraftPrompt(false);
  };

  const handleResumeDraft = () => {
    if (!strategy) return;
    const draft = loadWizardDraft(strategy);
    if (draft) {
      setFormData(draft.formData);
      setCurrentStepIndex(draft.currentStepIndex ?? 0);
      setTouchedFields(draft.touchedFields ?? {});
    }
    setShowDraftPrompt(false);
  };

  const handleStartNewDraft = () => {
    if (!strategy) return;
    clearWizardDraft(strategy);
    setCurrentStepIndex(0);
    updateUrlHistory(strategy, 0);
    initializeStrategyDefaults(strategy);
  };

  const updateUrlHistory = (strat: Strategy, stepIdx: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set('strategy', strat);
    params.set('step', String(stepIdx + 1));
    window.history.pushState(
      { strategy: strat, step: stepIdx },
      '',
      `${window.location.pathname}?${params.toString()}`
    );
  };

  const handleSelectStrategy = (selected: Strategy) => {
    setStrategy(selected);
    setCurrentStepIndex(0);
    updateUrlHistory(selected, 0);
  };

  const handleFieldChange = (key: string, value: any) => {
    const updated = { ...formData, [key]: value };
    const derived = deriveFields(updated, strategy ?? undefined);
    setFormData(derived);

    // Dismiss provenance badge on manual user edit
    if (prefilledBadges[key]) {
      setPrefilledBadges((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }

    if (replacePrompts[key]) {
      setReplacePrompts((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }

    if (touchedFields[key]) {
      const res = validateField(key, value);
      setErrors((prev) => ({
        ...prev,
        [key]: res.valid ? '' : (res.error ?? ''),
      }));
    }

    if (strategy) {
      saveWizardDraft({
        strategy,
        currentStepIndex,
        formData: derived,
        touchedFields,
        advancedDisclosures: {},
        lastSavedAt: new Date().toISOString(),
      });
    }
  };

  const handleLookupAddress = async (addressToLookup?: string) => {
    const inputEl = typeof document !== 'undefined' ? (document.getElementById('field-input-address') as HTMLInputElement | null) : null;
    const addr = addressToLookup ?? (inputEl?.value ? inputEl.value : formData.address);
    if (!addr || !addr.trim()) {
      setLookupMessage('Please enter a street address to search public records.');
      return;
    }

    setIsLookupLoading(true);
    setLookupMessage(null);
    try {
      const res = await fetch('/api/deal-analyzer/property-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: addr }),
      });
      const json = await res.json();

      if (!json.success || !json.data) {
        setLookupMessage("We couldn't find data for this address — enter values manually.");
        setPropertyFacts(null);
        return;
      }

      const data: PropertyLookupResult = json.data;
      const source = data.provenance.source;
      const retrievedAt = data.provenance.retrievedAt;

      if (data.propertyFacts) {
        setPropertyFacts(data.propertyFacts);
      }

      const updates: Record<string, any> = {};
      const newBadges = { ...prefilledBadges };
      const newPrompts = { ...replacePrompts };

      const rentKey = strategy === 'brrrr' ? 'monthlyRentPostRehab' : 'monthlyRent';

      const fieldMap: Array<{ key: string; label: string; val?: number }> = [
        { key: 'propertyTaxesAnnual', label: 'Annual Property Taxes', val: data.propertyTaxesAnnual },
        { key: rentKey, label: 'Monthly Rent', val: data.rentEstimate },
        { key: 'arv', label: 'After-Repair Value (ARV)', val: (strategy === 'flip' || strategy === 'brrrr') ? data.valueEstimate : undefined },
        { key: 'monthlyHOA', label: 'Monthly HOA Fee', val: data.hoaMonthly },
      ];

      fieldMap.forEach(({ key, label, val }) => {
        if (val === undefined || val === null) return;

        const currentVal = formData[key];
        const defaultVal = getFieldDefaultValue(key, strategy ?? undefined);
        const hasUserTyped = currentVal !== undefined && currentVal !== null && currentVal !== '' && currentVal !== defaultVal && currentVal !== 0;

        if (hasUserTyped && Number(currentVal) !== Number(val)) {
          // DO NOT OVERWRITE — ask user via Replace prompt card
          newPrompts[key] = {
            label,
            fieldLabel: label,
            userValue: Number(currentVal),
            lookupValue: Number(val),
            fetchedValue: Number(val),
            source,
          };
        } else {
          // Apply prefill directly and badge it
          updates[key] = val;
          newBadges[key] = { source, retrievedAt };
        }
      });

      if (Object.keys(updates).length > 0) {
        const nextForm = deriveFields({ ...formData, ...updates }, strategy ?? undefined);
        setFormData(nextForm);
        if (strategy) {
          saveWizardDraft({
            strategy,
            currentStepIndex,
            formData: nextForm,
            touchedFields,
            advancedDisclosures: {},
            lastSavedAt: new Date().toISOString(),
          });
        }
      }

      setPrefilledBadges(newBadges);
      setReplacePrompts(newPrompts);
    } catch (err: any) {
      setLookupMessage("We couldn't find data for this address — enter values manually.");
    } finally {
      setIsLookupLoading(false);
    }
  };

  const handleGeolocationAssist = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLookupMessage('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const hintText = `${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)}`;
        handleFieldChange('address', hintText);
      },
      () => {
        setLookupMessage('Location access denied — enter address manually.');
      }
    );
  };

  const handleAcceptReplace = (key: string, lookupValue: number, source: string) => {
    const updated = deriveFields({ ...formData, [key]: lookupValue }, strategy ?? undefined);
    setFormData(updated);
    setPrefilledBadges((prev) => ({
      ...prev,
      [key]: { source, retrievedAt: new Date().toISOString() },
    }));
    setReplacePrompts((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleKeepUserValue = (key: string) => {
    setReplacePrompts((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleFieldFocus = (key: string) => {
    fieldFocusTimeRef.current[key] = Date.now();
  };

  const handleFieldBlur = (key: string) => {
    setTouchedFields((prev) => ({ ...prev, [key]: true }));
    const val = formData[key];
    const res = validateField(key, val);
    setErrors((prev) => ({
      ...prev,
      [key]: res.valid ? '' : (res.error ?? ''),
    }));

    // Track per-field hesitation time (>2s)
    const start = fieldFocusTimeRef.current[key];
    if (start) {
      const hesitationMs = Date.now() - start;
      if (hesitationMs > 2000) {
        try {
          posthog.capture('deal_analyzer_field_hesitation', {
            strategy: strategy ?? 'none',
            stepIndex: currentStepIndex,
            fieldKey: key,
            hesitationMs,
          });
        } catch (e) {}
      }
      delete fieldFocusTimeRef.current[key];
    }
  };

  const toggleSelfManage = () => {
    const nextSelf = !formData.isSelfManaged;
    const nextMgmt = nextSelf ? 0 : 10;
    handleFieldChange('isSelfManaged', nextSelf);
    handleFieldChange('propertyMgmtPercent', nextMgmt);
  };

  const toggleQuickExpenseMode = () => {
    const nextQuick = !formData.quickExpenseMode;
    handleFieldChange('quickExpenseMode', nextQuick);
    trackDisclosureToggle('50% Rule Mode', nextQuick);
  };

  const currentSteps = strategy
    ? getWizardStepsForStrategy(strategy, { needsRehab: !!formData.needsRehab })
    : [];
  const totalSteps = currentSteps.length;
  const isReviewStep = currentStepIndex === totalSteps;

  const handleNext = () => {
    if (!strategy) return;
    if (!canProceedToNextStep(strategy, currentStepIndex, formData)) {
      const stepErrors = validateStepFields(strategy, currentStepIndex, formData);
      setErrors((prev) => ({ ...prev, ...stepErrors }));
      const currentStepKeys = currentSteps[currentStepIndex]?.fieldKeys || [];
      const touchedMap = { ...touchedFields };
      currentStepKeys.forEach((k) => { touchedMap[k] = true; });
      setTouchedFields(touchedMap);

      try {
        posthog.capture('deal_analyzer_validation_error', {
          strategy,
          stepIndex: currentStepIndex,
          invalidFields: Object.keys(stepErrors),
          errorCount: Object.keys(stepErrors).length,
        });
      } catch (e) {}
      return;
    }

    const nextIdx = currentStepIndex + 1;
    setCurrentStepIndex(nextIdx);
    updateUrlHistory(strategy, nextIdx);
  };

  const handleBack = () => {
    if (!strategy) return;
    if (currentStepIndex === 0) {
      setStrategy(null);
      return;
    }
    const prevIdx = currentStepIndex - 1;
    setCurrentStepIndex(prevIdx);
    updateUrlHistory(strategy, prevIdx);
  };

  const handleJumpToStep = (stepIdx: number) => {
    if (!strategy || stepIdx >= currentStepIndex) return;
    setCurrentStepIndex(stepIdx);
    updateUrlHistory(strategy, stepIdx);
  };

  if (showResults && strategy) {
    return (
      <DealAnalyzerResults
        formData={formData}
        strategy={strategy}
        prefilledBadges={prefilledBadges}
        onEditWizard={() => setShowResults(false)}
        onUpdateFormData={(updated) => setFormData(updated)}
      />
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // COMPUTED CALCULATIONS FOR CARDS & WARNINGS (via calcEngine.ts)
  // ───────────────────────────────────────────────────────────────────────────
  const purchasePrice = Number(formData.purchasePrice || 0);
  const monthlyRent = Number(formData.monthlyRent || formData.monthlyRentPostRehab || 0);
  const arv = Number(formData.arv || 0);
  const rehabBudget = Number(formData.rehabBudget || formData.upfrontRehabCost || 0);

  // Flip Calculations
  const flipResults = calculateFlipDeal({
    purchasePrice,
    arv,
    rehabBudget,
    holdPeriodMonths: Number(formData.holdPeriodMonths || 6),
    hardMoneyLTC: Number(formData.hardMoneyLTC || 85),
    hardMoneyInterestRate: Number(formData.hardMoneyInterestRate || 11.5),
    hardMoneyPoints: Number(formData.hardMoneyPoints || 2),
    buyClosingCostsPercent: Number(formData.purchaseClosingCostsPercent || 2),
    sellingCostsPercent: Number(formData.sellingCostsPercent || 8),
    monthlyHoldingCosts: Number(formData.monthlyHoldingCosts || 475),
    isCashPurchase: formData.financingType === 'Cash',
  });

  const flipMAO70 = flipResults.mao70;
  const hardMoneyLoanAmount = flipResults.hardMoneyLoanAmount;
  const ltarvRatio = flipResults.ltarv;
  const isLTARVBreached = flipResults.isLTARVBreached;

  // BRRRR Refinance Live Calculations
  const brrrrResults = calculateBRRRRDeal({
    purchasePrice,
    rehabBudget,
    arv,
    monthlyRentPostRehab: monthlyRent,
    bridgeLTC: Number(formData.bridgeLTC || 85),
    bridgeInterestRate: Number(formData.bridgeInterestRate || 11.5),
    bridgePoints: Number(formData.bridgePoints || 2),
    holdPeriodMonths: Number(formData.holdPeriodMonths || 6),
    monthlyHoldingCosts: Number(formData.monthlyHoldingCosts || 475),
    buyClosingCostsPercent: Number(formData.purchaseClosingCostsPercent || 2),
    refiLTV: Number(formData.refiLTV || 75),
    refiInterestRate: Number(formData.refiInterestRate || 8.5),
    refiTermYears: Number(formData.refiTermYears || 30),
    refiClosingCostsPercent: Number(formData.refiClosingCostsPercent || 2),
    vacancyRate: Number(formData.vacancyRate ?? 5),
    propertyTaxesAnnual: Number(formData.propertyTaxesAnnual ?? 1800),
    insuranceAnnual: Number(formData.insuranceAnnual ?? 1200),
    repairsPercent: Number(formData.repairsPercent ?? 5),
    capexPercent: Number(formData.capexPercent ?? 5),
    propertyMgmtPercent: Number(formData.propertyMgmtPercent ?? 10),
  });

  const newRefiLoanAmount = brrrrResults.newRefiLoanAmount;
  const refiClosingCosts = brrrrResults.refiClosingCosts;
  const bridgePayoff = brrrrResults.bridgePayoff;
  const netCashOut = brrrrResults.cashOut;
  const totalCashInvested = brrrrResults.initialCashInvested;
  const cashLeftInDeal = brrrrResults.cashLeftInDeal;
  const refiLTV = Number(formData.refiLTV || 75);
  const bridgeLTC = Number(formData.bridgeLTC || 85);
  const refiClosingCostsPercent = Number(formData.refiClosingCostsPercent || 2);

  // Rental Calculations & Operating Expenses Stack Total
  const rentalResults = calculateRentalDeal({
    purchasePrice,
    monthlyRent,
    vacancyRate: Number(formData.vacancyRate ?? 5),
    propertyTaxesAnnual: Number(formData.propertyTaxesAnnual ?? 1800),
    insuranceAnnual: Number(formData.insuranceAnnual ?? 1200),
    utilitiesMonthly: Number(formData.utilitiesMonthly ?? 0),
    hoaMonthly: Number(formData.hoaMonthly ?? 0),
    repairsPercent: Number(formData.repairsPercent ?? 5),
    capexPercent: Number(formData.capexPercent ?? 5),
    propertyMgmtPercent: Number(formData.propertyMgmtPercent ?? 10),
    downPaymentPercent: Number(formData.downPaymentPercent ?? 25),
    interestRate: Number(formData.interestRate ?? 6.5),
    loanTermYears: Number(formData.loanTermYears ?? 30),
    closingCostsPercent: Number(formData.purchaseClosingCostsPercent ?? 3),
    upfrontRehabCost: rehabBudget,
    isCashPurchase: formData.financingType === 'Cash',
    quickExpenseMode: !!formData.quickExpenseMode,
  });

  const monthlyExpenseDollars = Math.round(rentalResults.operatingExpensesAnnual / 12);

  // ───────────────────────────────────────────────────────────────────────────
  // STEP 0: STRATEGY CHOOSER
  // ───────────────────────────────────────────────────────────────────────────
  if (!strategy) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-8 flex flex-col gap-8">
        <div className="text-center flex flex-col gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-950/40 border border-emerald-800 text-emerald-400 self-center">
            <Sparkles size={13} />
            Step 0 · Select Strategy
          </div>
          <h1 tabIndex={-1} ref={headingRef} className="text-3xl font-black text-white outline-none">
            Choose Investment Strategy
          </h1>
          <p className="text-sm text-slate-400 max-w-lg mx-auto">
            Select how you plan to execute this real estate deal. The wizard will present only the fields needed for your strategy.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Rental */}
          <div
            id="card-strategy-rental"
            onClick={() => handleSelectStrategy('rental')}
            className="p-6 rounded-2xl cursor-pointer transition-all duration-200 hover:border-emerald-500/50 hover:bg-emerald-950/10 flex flex-col gap-4 group"
            style={{ background: 'rgba(18,16,20,0.97)', border: '1px solid rgba(253,255,252,0.10)' }}
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-950/60 border border-emerald-900 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
              <Building2 size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Buy &amp; Hold Rental</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Long-term residential rental property. Analyzes NOI, Cash-on-Cash Return, Cap Rate, and DSCR.
              </p>
            </div>
            <button
              id="btn-select-rental"
              type="button"
              className="mt-auto flex items-center text-xs font-bold text-emerald-400 group-hover:translate-x-1 transition-transform"
            >
              Select Rental <ArrowRight size={14} className="ml-1" />
            </button>
          </div>

          {/* Card 2: Fix & Flip */}
          <div
            id="card-strategy-flip"
            onClick={() => handleSelectStrategy('flip')}
            className="p-6 rounded-2xl cursor-pointer transition-all duration-200 hover:border-amber-500/50 hover:bg-amber-950/10 flex flex-col gap-4 group"
            style={{ background: 'rgba(18,16,20,0.97)', border: '1px solid rgba(253,255,252,0.10)' }}
          >
            <div className="w-12 h-12 rounded-xl bg-amber-950/60 border border-amber-900 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
              <Hammer size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Fix &amp; Flip</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Short-term renovation and resale project. Analyzes ARV, rehab budget, hard money debt, and Net Profit.
              </p>
            </div>
            <button
              id="btn-select-flip"
              type="button"
              className="mt-auto flex items-center text-xs font-bold text-amber-400 group-hover:translate-x-1 transition-transform"
            >
              Select Fix &amp; Flip <ArrowRight size={14} className="ml-1" />
            </button>
          </div>

          {/* Card 3: BRRRR */}
          <div
            id="card-strategy-brrrr"
            onClick={() => handleSelectStrategy('brrrr')}
            className="p-6 rounded-2xl cursor-pointer transition-all duration-200 hover:border-indigo-500/50 hover:bg-indigo-950/10 flex flex-col gap-4 group"
            style={{ background: 'rgba(18,16,20,0.97)', border: '1px solid rgba(253,255,252,0.10)' }}
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-950/60 border border-indigo-900 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
              <Repeat size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">BRRRR Strategy</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Buy, Rehab, Rent, Refinance, Repeat. Analyzes bridge financing, takeout refi LTV, and capital returned.
              </p>
            </div>
            <div className="mt-auto flex items-center text-xs font-bold text-indigo-400 group-hover:translate-x-1 transition-transform">
              Select BRRRR <ArrowRight size={14} className="ml-1" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // DRAFT RESUME PROMPT
  // ───────────────────────────────────────────────────────────────────────────
  if (showDraftPrompt) {
    return (
      <div className="w-full max-w-md mx-auto p-6 rounded-2xl border border-slate-800 bg-slate-950 text-white flex flex-col gap-6 shadow-2xl my-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-900 flex items-center justify-center text-emerald-400">
            <RotateCcw size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold">Resume Saved Draft?</h3>
            <p className="text-xs text-slate-400">An in-progress draft was found for this strategy.</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleResumeDraft}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-2"
          >
            Resume Saved Draft <ArrowRight size={14} />
          </button>

          <button
            onClick={handleStartNewDraft}
            className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs border border-white/10 transition-colors"
          >
            Start Fresh Deal
          </button>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // WIZARD SHELL: NAVIGATION & STEPS
  // ───────────────────────────────────────────────────────────────────────────
  const currentStep = currentSteps[currentStepIndex];

  try {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">

      {/* ── Progress Bar & Header ── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400" aria-live="polite">
            Step {isReviewStep ? totalSteps + 1 : currentStepIndex + 1} of {totalSteps + 1}
          </span>
          <button
            onClick={() => setStrategy(null)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            Change Strategy ({strategy.toUpperCase()})
          </button>
        </div>

        {/* Progress filled bar */}
        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${((currentStepIndex + 1) / (totalSteps + 1)) * 100}%` }}
          />
        </div>

        {/* Clickable Step Breadcrumbs */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {currentSteps.map((step, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;
            return (
              <button
                key={step.id}
                onClick={() => handleJumpToStep(idx)}
                disabled={!isCompleted}
                className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                  isCurrent
                    ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                    : isCompleted
                    ? 'bg-white/5 text-slate-300 hover:bg-white/10 cursor-pointer'
                    : 'text-slate-600 cursor-not-allowed'
                }`}
              >
                {idx + 1}. {step.title}
              </button>
            );
          })}
          <span className={`px-3 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap ${
            isReviewStep
              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
              : 'text-slate-600'
          }`}>
            {totalSteps + 1}. Review
          </span>
        </div>
      </div>

      {/* ── Landmark Step Container ── */}
      <section
        aria-labelledby="wizard-step-title"
        className="p-6 md:p-8 rounded-2xl flex flex-col gap-6"
        style={{ background: 'rgba(18,16,20,0.97)', border: '1px solid rgba(253,255,252,0.10)' }}
      >
        {!isReviewStep && currentStep && (
          <>
            <div>
              <h2
                id="wizard-step-title"
                tabIndex={-1}
                ref={headingRef}
                className="text-xl font-black text-white outline-none"
              >
                {currentStep.title}
              </h2>
              <p className="text-xs text-slate-400 mt-1">{currentStep.subtitle}</p>
            </div>

            {/* ── CONDITIONAL CARDS & READOUTS ── */}

            {/* Flip Step 1 / 3: Live 70% MAO Readout */}
            {strategy === 'flip' && (currentStep.id === 'acquisition' || currentStep.id === 'financing') && arv > 0 && (
              <div className="p-4 rounded-xl border border-amber-900/50 bg-amber-950/30 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2 text-amber-400 font-bold">
                  <Calculator size={16} />
                  <span>70% Rule MAO Target:</span>
                </div>
                <div className="text-base font-black text-white">
                  ${flipMAO70.toLocaleString()}
                  <span className="text-[10px] text-slate-400 font-normal ml-1">
                    (ARV ${arv.toLocaleString()} × 70% - Rehab ${rehabBudget.toLocaleString()})
                  </span>
                </div>
              </div>
            )}

            {/* Flip Step 3: LTARV Warning Check */}
            {strategy === 'flip' && currentStep.id === 'financing' && ltarvRatio > 0 && (
              <div className={`p-4 rounded-xl border flex items-center justify-between text-xs font-mono ${
                isLTARVBreached
                  ? 'border-red-900/80 bg-red-950/40 text-red-200'
                  : 'border-emerald-900/50 bg-emerald-950/30 text-emerald-300'
              }`}>
                <div className="flex items-center gap-2 font-bold">
                  {isLTARVBreached ? <ShieldAlert size={16} className="text-red-400" /> : <CheckCircle2 size={16} className="text-emerald-400" />}
                  <span>Loan-to-ARV Ratio (LTARV):</span>
                </div>
                <div className="font-bold text-sm">
                  {ltarvRatio.toFixed(1)}% {isLTARVBreached ? '(Exceeds 70% Ceiling Warning)' : '(Within 70% Ceiling)'}
                </div>
              </div>
            )}

            {/* BRRRR Step 5: Live Takeout Refinance Readout Card */}
            {strategy === 'brrrr' && currentStep.id === 'refi-takeout' && arv > 0 && (
              <div className="p-4 rounded-xl border border-indigo-900/50 bg-indigo-950/30 flex flex-col gap-2 font-mono text-xs">
                <div className="flex items-center justify-between font-bold text-indigo-300 border-b border-indigo-900/40 pb-2">
                  <span className="flex items-center gap-1.5"><Repeat size={14} /> Refinance Payoff &amp; Capital Returned</span>
                  <span className="text-emerald-400 font-black">Cash Left in Deal: ${cashLeftInDeal.toLocaleString()}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1">
                  <div>
                    <span className="text-[10px] text-slate-400 block">New Refi Loan ({refiLTV}% LTV)</span>
                    <span className="text-white font-bold">${newRefiLoanAmount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Bridge Payoff ({bridgeLTC}% LTC)</span>
                    <span className="text-amber-400 font-bold">${bridgePayoff.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Refi Costs ({refiClosingCostsPercent}%)</span>
                    <span className="text-slate-300 font-bold">${refiClosingCosts.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Net Cash-Out</span>
                    <span className={`font-bold ${netCashOut >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      ${netCashOut.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ── Cash vs Financed Mode Switcher (Rental Step 2, Flip Step 3, BRRRR Step 3) ── */}
            {(currentStep.id === 'financing' || currentStep.id === 'bridge-financing') && (
              <div className="p-4 rounded-xl border border-white/10 bg-white/5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Funding Method</span>
                  <span className="text-[11px] text-slate-400">Choose cash or loan financing for initial purchase.</span>
                </div>
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-white/10 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => handleFieldChange('isCashPurchase', false)}
                    className={`px-3 py-1.5 rounded-md transition-all ${
                      !formData.isCashPurchase
                        ? 'bg-emerald-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Financed (Loan)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFieldChange('isCashPurchase', true)}
                    className={`px-3 py-1.5 rounded-md transition-all ${
                      formData.isCashPurchase
                        ? 'bg-emerald-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Pay All Cash
                  </button>
                </div>
              </div>
            )}

            {formData.isCashPurchase && (currentStep.id === 'financing' || currentStep.id === 'bridge-financing') && (
              <div className="p-3 rounded-lg border border-emerald-900/40 bg-emerald-950/20 text-emerald-300 text-xs font-mono flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-400" />
                All Cash purchase selected — loan fields are hidden and debt service is set to $0.
              </div>
            )}

            {/* Rental Step 1: Rehab Needs Checkbox */}
            {strategy === 'rental' && currentStep.id === 'purchase' && (
              <label className="p-3.5 rounded-xl border border-white/10 bg-white/5 flex items-center gap-3 cursor-pointer hover:border-emerald-500/40 transition-colors">
                <input
                  type="checkbox"
                  checked={!!formData.needsRehab}
                  onChange={(e) => handleFieldChange('needsRehab', e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                />
                <div>
                  <span className="text-xs font-bold text-white block">This property needs work before renting</span>
                  <span className="text-[10px] text-slate-400">Enables Step 4 (Renovation &amp; Rehab) in the wizard flow.</span>
                </div>
              </label>
            )}

            {/* Single-column Field Stack */}
            <div className="flex flex-col gap-5">
              {currentStep.fieldKeys.map((key) => {

                // Hide loan fields when cash purchase is selected
                if (
                  formData.isCashPurchase &&
                  ['downPaymentPercent', 'interestRate', 'loanTermYears', 'hardMoneyLTC', 'hardMoneyRate', 'hardMoneyPoints', 'bridgeLTC', 'bridgeRate', 'bridgePoints'].includes(key)
                ) {
                  return null;
                }

                // ── COMPOSITE FIELD: RENTAL OPERATING EXPENSE BLOCK ──
                if (key === 'rentalExpenseBlock') {
                  const vacancyRate = Number(formData.vacancyRate ?? 5);
                  const repairsPercent = Number(formData.repairsPercent ?? 5);
                  const capexPercent = Number(formData.capexPercent ?? 5);
                  const propertyMgmtPercent = Number(formData.propertyMgmtPercent ?? 10);
                  const totalExpensePct = Math.round(
                    vacancyRate + repairsPercent + capexPercent + (formData.isSelfManaged ? 0 : propertyMgmtPercent)
                  );
                  return (
                    <div key={key} className="p-5 rounded-2xl border border-white/10 bg-white/5 flex flex-col gap-4">
                      <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <div>
                          <span className="text-xs font-bold text-white block">Operating Expense Stack</span>
                          <span className="text-[11px] text-slate-400">
                            Pre-filled composite stack: {totalExpensePct}% of rent (${monthlyExpenseDollars}/mo)
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={toggleQuickExpenseMode}
                            className={`px-2.5 py-1 rounded-md text-[10px] font-bold border transition-all ${
                              formData.quickExpenseMode
                                ? 'bg-amber-950/60 text-amber-400 border-amber-800'
                                : 'bg-slate-900 text-slate-400 border-white/10 hover:text-white'
                            }`}
                          >
                            50% Rule Mode
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const next = !showExpenseItemization;
                              setShowExpenseItemization(next);
                              trackDisclosureToggle('Itemize Stack', next);
                            }}
                            className="flex items-center gap-1 px-3 py-1 rounded-md bg-emerald-950/60 text-emerald-400 border border-emerald-800 text-xs font-bold hover:bg-emerald-900/40 transition-colors"
                          >
                            {showExpenseItemization ? 'Collapse Stack' : 'Itemize Stack'}
                            {showExpenseItemization ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </div>
                      </div>

                      {/* Summary Display Card (Collapsed) */}
                      {!showExpenseItemization && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono pt-1">
                          <div className="p-2.5 rounded-lg bg-black/30 border border-white/5">
                            <span className="text-[10px] text-slate-500 block">Vacancy</span>
                            <span className="text-white font-bold">{vacancyRate}%</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-black/30 border border-white/5">
                            <span className="text-[10px] text-slate-500 block">Repairs &amp; Maint.</span>
                            <span className="text-white font-bold">{repairsPercent}%</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-black/30 border border-white/5">
                            <span className="text-[10px] text-slate-500 block">CapEx Reserve</span>
                            <span className="text-white font-bold">{capexPercent}%</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-black/30 border border-white/5">
                            <span className="text-[10px] text-slate-500 block">Management</span>
                            <span className="text-white font-bold">{formData.isSelfManaged ? '0% (Self)' : `${propertyMgmtPercent}%`}</span>
                          </div>
                        </div>
                      )}

                      {/* Expanded Itemized Controls */}
                      {showExpenseItemization && (
                        <div className="flex flex-col gap-4 pt-2 border-t border-white/5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-300">Self-Management Toggle</label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!formData.isSelfManaged}
                                onChange={toggleSelfManage}
                                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                              />
                              <span className="text-xs font-bold text-emerald-400">I self-manage (0% management fee)</span>
                            </label>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(() => {
                              const vacancyRate = Number(formData.vacancyRate ?? 5);
                              const repairsPercent = Number(formData.repairsPercent ?? 5);
                              const capexPercent = Number(formData.capexPercent ?? 5);
                              const propertyMgmtPercent = Number(formData.propertyMgmtPercent ?? 10);
                              return (
                                <>
                                  <div>
                                    <label className="text-xs text-slate-300 font-bold block mb-1">Vacancy Allowance (%)</label>
                                    <input
                                      type="number"
                                      value={vacancyRate}
                                      onChange={(e) => handleFieldChange('vacancyRate', parseFloat(e.target.value) || 0)}
                                      className="w-full h-10 px-3 rounded-lg font-mono text-xs bg-white/5 border border-white/10 text-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-slate-300 font-bold block mb-1">Maintenance &amp; Repairs (%)</label>
                                    <input
                                      type="number"
                                      value={repairsPercent}
                                      onChange={(e) => handleFieldChange('repairsPercent', parseFloat(e.target.value) || 0)}
                                      className="w-full h-10 px-3 rounded-lg font-mono text-xs bg-white/5 border border-white/10 text-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-slate-300 font-bold block mb-1">CapEx Reserve Fund (%)</label>
                                    <input
                                      type="number"
                                      value={capexPercent}
                                      onChange={(e) => handleFieldChange('capexPercent', parseFloat(e.target.value) || 0)}
                                      className="w-full h-10 px-3 rounded-lg font-mono text-xs bg-white/5 border border-white/10 text-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-slate-300 font-bold block mb-1">Property Management (%)</label>
                                    <input
                                      type="number"
                                      disabled={!!formData.isSelfManaged}
                                      value={formData.isSelfManaged ? 0 : propertyMgmtPercent}
                                      onChange={(e) => handleFieldChange('propertyMgmtPercent', parseFloat(e.target.value) || 0)}
                                      className="w-full h-10 px-3 rounded-lg font-mono text-xs bg-white/5 border border-white/10 text-white disabled:opacity-50"
                                    />
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }

                // ── COMPOSITE FIELD: MONTHLY HOLDING COSTS STACK ──
                if (key === 'monthlyHoldingCosts') {
                  const holdingVal = Number(formData.monthlyHoldingCosts || getFieldDefaultValue('monthlyHoldingCosts', strategy ?? undefined));
                  return (
                    <div key={key} className="p-5 rounded-2xl border border-white/10 bg-white/5 flex flex-col gap-4">
                      <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <div>
                          <span className="text-xs font-bold text-white block">Monthly Holding Cost Stack</span>
                          <span className="text-[11px] text-slate-400">
                            Pre-filled holding stack: ${holdingVal}/mo (Taxes/12 + Insurance + Utilities)
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowHoldingItemization(!showHoldingItemization)}
                          className="flex items-center gap-1 px-3 py-1 rounded-md bg-emerald-950/60 text-emerald-400 border border-emerald-800 text-xs font-bold hover:bg-emerald-900/40 transition-colors"
                        >
                          {showHoldingItemization ? 'Collapse Stack' : 'Itemize Stack'}
                          {showHoldingItemization ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>

                      {/* Summary Display Card (Collapsed) */}
                      {!showHoldingItemization && (
                        <div className="p-3 rounded-xl bg-black/30 border border-white/5 flex items-center justify-between font-mono text-xs">
                          <span className="text-slate-400">Total Monthly Holding Expenses:</span>
                          <span className="text-emerald-400 font-bold text-sm">${holdingVal.toLocaleString()}/mo</span>
                        </div>
                      )}

                      {/* Expanded Itemized Controls */}
                      {showHoldingItemization && (
                        <div className="flex flex-col gap-3 pt-2">
                          <div>
                            <label className="text-xs text-slate-300 font-bold block mb-1">Monthly Holding Total ($/mo)</label>
                            <input
                              type="number"
                              value={holdingVal}
                              onChange={(e) => handleFieldChange('monthlyHoldingCosts', parseFloat(e.target.value) || 0)}
                              className="w-full h-10 px-3 rounded-lg font-mono text-xs bg-white/5 border border-white/10 text-white"
                            />
                            <p className="text-[10px] text-slate-500 mt-1">
                              Stack breakdown: Taxes/12 + Insurance (${strategy === 'brrrr' ? '100' : '250'}/mo) + Utilities ($225/mo) + HOA ($0).
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }

                // Standard Single Field Renderer
                const def = FIELD_REGISTRY[key];
                if (!def) return null;

                const val = formData[key] ?? getFieldDefaultValue(key, strategy ?? undefined);
                const err = errors[key];
                const isTouched = touchedFields[key];
                const isRequired = def.class === 'R';
                const isValid = isTouched && !err && isRequired;

                return (
                  <div key={key} className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                      <span>
                        {def.label} {isRequired ? <span className="text-emerald-400">*</span> : <span className="text-slate-500 font-normal">(optional)</span>}
                      </span>

                      {/* Live $ equivalent display for percentage down payment */}
                      {key === 'downPaymentPercent' && (
                        <span className="text-emerald-400 font-mono">
                          =${Math.round(formData.downPaymentAmount || 0).toLocaleString()}
                        </span>
                      )}
                    </label>

                    <div className="relative flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          id={`field-input-${key}`}
                          name={key}
                          inputMode={key === 'address' ? 'text' : 'decimal'}
                          value={val}
                          onChange={(e) => handleFieldChange(key, e.target.value)}
                          onBlur={() => handleFieldBlur(key)}
                          autoComplete={
                            key === 'investorName' || key === 'fullName'
                              ? 'name'
                              : key === 'email'
                              ? 'email'
                              : key === 'address'
                              ? 'street-address'
                              : 'off'
                          }
                          className={`w-full h-12 px-4 rounded-xl font-mono text-sm font-bold bg-white/5 border transition-all ${
                            err
                              ? 'border-red-500/80 text-red-200 focus:ring-1 focus:ring-red-500'
                              : isValid
                              ? 'border-emerald-500/50 text-white focus:ring-1 focus:ring-emerald-500'
                              : 'border-white/10 text-white focus:border-emerald-500/50'
                          }`}
                        />

                        {/* Validation State Icon */}
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                          {isValid && <CheckCircle2 size={16} className="text-emerald-400" />}
                          {err && <AlertCircle size={16} className="text-red-400" />}
                        </div>
                      </div>

                      {/* Address Lookup Action Button */}
                      {key === 'address' && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleLookupAddress()}
                            disabled={isLookupLoading}
                            className="h-12 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                            id="btn-autofill-address"
                          >
                            <Sparkles size={14} className={isLookupLoading ? 'animate-spin' : ''} />
                            {isLookupLoading ? 'Autofilling...' : 'Autofill Data'}
                          </button>
                          <button
                            type="button"
                            onClick={handleGeolocationAssist}
                            className="h-12 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs border border-white/10 transition-colors"
                            id="btn-use-location"
                            title="Suggest location hint"
                          >
                            Use my location
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Address Privacy Copy & Fallback / Facts Banners */}
                    {key === 'address' && (
                      <>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Used only to prefill public-record data for this analysis.
                        </p>

                        {propertyFacts && Object.values(propertyFacts).some((v) => v !== undefined && v !== null) && (
                          <div
                            className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-xs text-emerald-200 mt-1 font-mono flex items-center gap-2"
                            id="property-facts-banner"
                          >
                            <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                            <span>
                              <strong>Confirmed Public Record:</strong>{' '}
                              {[
                                propertyFacts.beds ? `${propertyFacts.beds} Beds` : null,
                                propertyFacts.baths ? `${propertyFacts.baths} Baths` : null,
                                propertyFacts.sqft ? `${propertyFacts.sqft.toLocaleString()} sqft` : null,
                                propertyFacts.yearBuilt ? `Built ${propertyFacts.yearBuilt}` : null,
                                propertyFacts.propertyType,
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </span>
                          </div>
                        )}

                        {lookupMessage && (
                          <div
                            className="p-3 rounded-xl border border-amber-500/30 bg-amber-950/20 text-xs text-amber-200 mt-1 font-medium flex items-center gap-2"
                            id="lookup-fallback-message"
                          >
                            <AlertCircle size={15} className="text-amber-400 shrink-0" />
                            <span>{lookupMessage}</span>
                          </div>
                        )}
                      </>
                    )}

                    {/* Provenance Badge */}
                    {prefilledBadges[key] && (
                      <div
                        className="text-[10px] text-emerald-400 font-mono flex items-center gap-1.5 mt-0.5"
                        id={`provenance-badge-${key}`}
                      >
                        <Sparkles size={12} className="text-emerald-400 shrink-0" />
                        <span>Prefilled from {prefilledBadges[key].source} — edit if needed</span>
                      </div>
                    )}

                    {/* Replace Prompt Card */}
                    {replacePrompts[key] && (
                      <div
                        className="p-3 rounded-xl border border-amber-500/30 bg-amber-950/20 flex flex-col gap-2 text-xs mt-1"
                        id={`replace-prompt-${key}`}
                      >
                        <div className="text-amber-200 font-semibold">
                          We found ${replacePrompts[key].lookupValue.toLocaleString()} from public records for{' '}
                          {replacePrompts[key].label}. Replace your entry (${replacePrompts[key].userValue.toLocaleString()})?
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleAcceptReplace(key, replacePrompts[key].fetchedValue, replacePrompts[key].source)
                            }
                            className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors"
                            id={`btn-accept-replace-${key}`}
                          >
                            Replace with ${Number(replacePrompts[key].fetchedValue || 0).toLocaleString()}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleKeepUserValue(key)}
                            className="px-3 py-1.5 rounded-lg bg-white/10 text-slate-300 font-semibold text-xs hover:bg-white/20 transition-colors"
                            id={`btn-keep-user-val-${key}`}
                          >
                            Keep My ${Number(formData[key] || 0).toLocaleString()}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Error message */}
                    {err && <p className="text-[11px] text-red-400 mt-0.5">{err}</p>}

                    {/* Hint text */}
                    {def.description && !err && <p className="text-[10px] text-slate-500">{def.description}</p>}
                  </div>
                );
              })}
            </div>

            {/* ── Progressive Disclosure Toggles ("Add extra details" / "Advanced assumptions") ── */}
            <div className="border-t border-white/10 pt-4 mt-2">
              <button
                type="button"
                onClick={() => {
                  const next = !showAdvancedDetails;
                  setShowAdvancedDetails(next);
                  trackDisclosureToggle('Advanced Details', next);
                }}
                className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-emerald-400 transition-colors"
              >
                {showAdvancedDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {currentStep.id === 'long-term' ? 'Advanced assumptions (Growth, Hold & Exit)' : 'Add extra details / optional assumptions'}
              </button>

              {showAdvancedDetails && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 rounded-xl border border-white/10 bg-black/40">
                  {currentStep.id === 'financing' && (
                    <>
                      <div>
                        <label className="text-xs text-slate-300 font-bold block mb-1">Points / Origination Fee (%)</label>
                        <input
                          type="number"
                          value={formData.pointsPct ?? 0}
                          onChange={(e) => handleFieldChange('pointsPct', parseFloat(e.target.value) || 0)}
                          className="w-full h-10 px-3 rounded-lg font-mono text-xs bg-white/5 border border-white/10 text-white"
                        />
                      </div>
                      <div className="flex items-center gap-2 pt-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!formData.interestOnly}
                            onChange={(e) => handleFieldChange('interestOnly', e.target.checked)}
                            className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500"
                          />
                          <span className="text-xs font-bold text-slate-300">Interest-Only Amortization</span>
                        </label>
                      </div>
                    </>
                  )}

                  {currentStep.id === 'long-term' && (
                    <>
                      <div>
                        <label className="text-xs text-slate-300 font-bold block mb-1">Annual Rent Growth (%)</label>
                        <input
                          type="number"
                          value={formData.rentGrowthAnnual ?? 3}
                          onChange={(e) => handleFieldChange('rentGrowthAnnual', parseFloat(e.target.value) || 0)}
                          className="w-full h-10 px-3 rounded-lg font-mono text-xs bg-white/5 border border-white/10 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-300 font-bold block mb-1">Annual Expense Inflation (%)</label>
                        <input
                          type="number"
                          value={formData.expenseGrowthAnnual ?? 3}
                          onChange={(e) => handleFieldChange('expenseGrowthAnnual', parseFloat(e.target.value) || 0)}
                          className="w-full h-10 px-3 rounded-lg font-mono text-xs bg-white/5 border border-white/10 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-300 font-bold block mb-1">Annual Property Appreciation (%)</label>
                        <input
                          type="number"
                          value={formData.appreciationAnnual ?? 3}
                          onChange={(e) => handleFieldChange('appreciationAnnual', parseFloat(e.target.value) || 0)}
                          className="w-full h-10 px-3 rounded-lg font-mono text-xs bg-white/5 border border-white/10 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-300 font-bold block mb-1">Target Hold Horizon (Years)</label>
                        <input
                          type="number"
                          value={formData.holdPeriodYears ?? 10}
                          onChange={(e) => handleFieldChange('holdPeriodYears', parseInt(e.target.value, 10) || 10)}
                          className="w-full h-10 px-3 rounded-lg font-mono text-xs bg-white/5 border border-white/10 text-white"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* ─────────────────────────────────────────────────────────────────────────
            REVIEW STEP
           ───────────────────────────────────────────────────────────────────────── */}
        {isReviewStep && (
          <div className="flex flex-col gap-6">
            <div>
              <h2
                id="wizard-step-title"
                tabIndex={-1}
                ref={headingRef}
                className="text-xl font-black text-white outline-none"
              >
                Review &amp; Execute Deal Analysis
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Review your entered deal inputs. Click "Edit" on any section to adjust values before running analysis.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {currentSteps.map((step, idx) => (
                <div
                  key={step.id}
                  className="p-4 rounded-xl border border-white/5 bg-white/5 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-xs font-bold text-emerald-400">
                      Step {idx + 1}: {step.title}
                    </span>
                    <button
                      onClick={() => handleJumpToStep(idx)}
                      className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 font-semibold"
                    >
                      <Edit3 size={12} /> Edit
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    {step.fieldKeys.map((key) => {
                      const def = FIELD_REGISTRY[key];
                      if (!def) return null;
                      return (
                        <div key={key} className="flex flex-col">
                          <span className="text-[10px] text-slate-500 font-sans">{def.label}</span>
                          <span className="text-white font-bold">
                            {def.unit === '$' ? `$${Number(formData[key] || 0).toLocaleString()}` : `${formData[key] ?? def.defaultValue}${def.unit}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              id="btn-run-instant-analysis"
              onClick={handleSubmitAnalysis}
              className="w-full py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40"
            >
              Run Instant Analysis <Sparkles size={16} />
            </button>
          </div>
        )}
      </section>

      {/* ── Navigation Actions Row ── */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 px-5 py-3 rounded-xl border border-white/10 text-xs font-bold text-slate-300 hover:bg-white/5 transition-colors"
        >
          <ArrowLeft size={15} /> Back
        </button>

        {!isReviewStep && (
          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors"
          >
            Next Step <ArrowRight size={15} />
          </button>
        )}
      </div>

    </div>
  );
  } catch (err) {
    console.error('WIZARD RENDER ERROR Trace:', err);
    throw err;
  }
}

export function DealAnalyzerWizard(props: DealAnalyzerWizardProps) {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-slate-400 text-sm">Loading Deal Analyzer...</div>}>
      <DealAnalyzerWizardInner {...props} />
    </React.Suspense>
  );
}
