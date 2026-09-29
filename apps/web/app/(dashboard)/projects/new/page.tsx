'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AddressSearch from '@/components/deals/AddressSearch';
import PropertySatelliteViewer from '@/components/maps/PropertySatelliteViewer';
import { useOptionalAuth } from '@/context/AuthContext';
import {
  getStrategyTemplateDefaults,
  type PropertyType,
  type InvestmentStrategy as StrategyTemplateType,
} from '@paperworking/validation';
import {
  reconcileAcquisitionUnderwriting,
  computeMAO,
} from '@paperworking/financial-engine';
import type { DraftProjectData } from '@/lib/projects/drafts-store';
import {
  ArrowLeft,
  ArrowRight,
  WarningCircle,
  Info,
  Calculator,
  ChartLineUp,
  CheckCircle,
  RocketLaunch,
  CaretDown,
  CaretRight,
  ArrowsClockwise,
  MapPin,
  CircleNotch,
} from '@/components/icons/PhosphorIcons';

const STORAGE_KEY = 'pw_new_project_draft_v1';

const STRATEGY_OPTIONS: Array<{
  id: StrategyTemplateType;
  label: string;
  badge: string;
  description: string;
  disposition: string;
  vacancyNotice: string;
  defaultCategories: string[];
}> = [
  {
    id: 'flip',
    label: 'Fix & Flip',
    badge: 'Sale',
    description: 'Capital improvement for rapid resale. Short 6-12 month hold.',
    disposition: 'SALE',
    vacancyNotice: '0% vacancy during active rehab',
    defaultCategories: [
      'Kitchen & Bath Modernization',
      'Roof & Structural Repairs',
      'HVAC & Electrical Updates',
      'Flooring & Interior Paint',
      'Exterior Curb Appeal',
    ],
  },
  {
    id: 'brrrr',
    label: 'BRRRR',
    badge: 'Refinance',
    description: 'Buy, Rehab, Rent, Refinance, Repeat. Post-rehab equity extraction.',
    disposition: 'RENT',
    vacancyNotice: '7.0% institutional vacancy floor',
    defaultCategories: [
      'Value-Add Renovation',
      'Tenant Turnover Upgrades',
      'HVAC & Energy Efficiency',
      'Appraisal-Targeted Finishes',
      'Safety & Code Compliance',
    ],
  },
  {
    id: 'buy_and_hold_rental',
    label: 'Buy & Hold Rental',
    badge: 'Cash Flow',
    description: 'Long-term residential rental for durable monthly yield and appreciation.',
    disposition: 'RENT',
    vacancyNotice: '6.0% institutional vacancy floor',
    defaultCategories: [
      'Make-Ready Maintenance',
      'Durable Flooring & Paint',
      'Appliance Replacements',
      'Plumbing & Electrical Servicing',
    ],
  },
  {
    id: 'short_term_rental_airbnb',
    label: 'Short-Term / Airbnb',
    badge: 'Hospitality',
    description: 'High-yield furnished vacation or executive rental property.',
    disposition: 'RENT',
    vacancyNotice: '25.0% vacancy (75% occupancy target)',
    defaultCategories: [
      'Full Designer Furnishings',
      'Smart Locks & Security',
      'Guest Amenities & Hot Tub',
      'Photography & Staging',
      'High-Speed Wi-Fi & Sound',
    ],
  },
  {
    id: 'commercial_value_add',
    label: 'Commercial Value-Add',
    badge: 'Commercial',
    description: 'Multi-tenant commercial or mixed-use lease-up and repositioning.',
    disposition: 'MIXED',
    vacancyNotice: '8.0% institutional vacancy floor',
    defaultCategories: [
      'Facade & Storefront Facelift',
      'Tenant Improvement Allowances',
      'Common Area Upgrades',
      'Parking & ADA Compliance',
      'Submetering & MEP Upgrades',
    ],
  },
];

const DEFAULT_TEAM_MEMBERS: Array<{
  id: string;
  name: string;
  role: string;
  email?: string;
}> = [
  {
    id: 'lead-1',
    name: 'Lead Underwriter (You)',
    role: 'Lead Underwriter',
    email: 'underwriting@paperworking.local',
  },
];

export default function NewProjectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useOptionalAuth();

  const queryAddress = searchParams.get('address') ?? '';
  const queryPrice = searchParams.get('price') ? Number(searchParams.get('price')) : 0;
  const queryRehab = searchParams.get('rehab') ? Number(searchParams.get('rehab')) : 0;
  const queryArv = searchParams.get('arv') ? Number(searchParams.get('arv')) : 0;
  const queryRent = searchParams.get('rent') ? Number(searchParams.get('rent')) : 0;
  const queryStrategy = (searchParams.get('strategy') as StrategyTemplateType) ?? 'flip';
  const fromCalculator = searchParams.get('fromCalculator') === 'true';

  // Wizard Navigation
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(fromCalculator ? 5 : 1);
  const [hasDraftResumePrompt, setHasDraftResumePrompt] = useState(false);
  const [draftLoadedAddress, setDraftLoadedAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Step 1: Property Facts
  const [address, setAddress] = useState(queryAddress);
  const [unit, setUnit] = useState('');
  const [city, setCity] = useState('Austin');
  const [state, setState] = useState('TX');
  const [zipCode, setZipCode] = useState('78702');
  const [sourceType, setSourceType] = useState<
    'MLS' | 'off-market' | 'wholesaler' | 'referral' | 'other'
  >('off-market');
  const [sourceContactName, setSourceContactName] = useState('');
  const [sourceContactPhone, setSourceContactPhone] = useState('');
  const [propertyType, setPropertyType] = useState<PropertyType>('single_family');
  const [beds, setBeds] = useState<number | undefined>(3);
  const [baths, setBaths] = useState<number | undefined>(2);
  const [squareFeet, setSquareFeet] = useState<number | undefined>(1850);
  const [yearBuilt, setYearBuilt] = useState<number | undefined>(1995);

  // Step 2: Strategy Template
  const [strategy, setStrategy] = useState<StrategyTemplateType>(queryStrategy);

  // Step 3: Numbers (Underwriting)
  const [purchasePrice, setPurchasePrice] = useState<number>(queryPrice || 485000);
  const [rehabBudget, setRehabBudget] = useState<number>(queryRehab || 50000);
  const [estimatedARV, setEstimatedARV] = useState<number | null>(queryArv || null);
  const [grossRentMonthly, setGrossRentMonthly] = useState<number>(queryRent || 3800);
  const [targetLtvPct, setTargetLtvPct] = useState<number>(75);
  const [interestRatePct, setInterestRatePct] = useState<number>(6.5);
  const [amortizationYears, setAmortizationYears] = useState<number>(30);
  const [operatingExpenseRatioPct, setOperatingExpenseRatioPct] = useState<number>(35);
  const [vacancyRatePct, setVacancyRatePct] = useState<number>(6.0);
  const [buyerClosingCostsPct, setBuyerClosingCostsPct] = useState<number>(2.0);
  const [capExReservePct, setCapExReservePct] = useState<number>(5.0);
  const [exitCapRatePct, setExitCapRatePct] = useState<number>(6.5);
  const [showAdvancedAssumptions, setShowAdvancedAssumptions] = useState(false);

  // Step 4: Team & Deadlines
  const [targetContractDate, setTargetContractDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0] ?? '';
  });
  const [targetClosingDate, setTargetClosingDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0] ?? '';
  });
  const [inspectionDays, setInspectionDays] = useState<number>(10);
  const [financingDays, setFinancingDays] = useState<number>(21);
  const [teamMembers, setTeamMembers] = useState(DEFAULT_TEAM_MEMBERS);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('Acquisitions Agent');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [dealNotes, setDealNotes] = useState('');

  // Validation States (On-Blur)
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  const handleBlur = (field: string) => {
    setTouchedFields((prev) => ({ ...prev, [field]: true }));
  };

  // Strategy Template Defaults Application
  const applyStrategyDefaults = useCallback(
    (selectedStrategy: StrategyTemplateType, basePrice: number) => {
      const template = getStrategyTemplateDefaults(selectedStrategy);
      setOperatingExpenseRatioPct(template.operatingExpenseRatioPct);
      setVacancyRatePct(template.vacancyRatePct);
      setTargetLtvPct(template.targetLtvPct);
      setInterestRatePct(template.interestRatePct);
      setAmortizationYears(template.amortizationYears);

      if (basePrice > 0) {
        if (selectedStrategy === 'flip') {
          setRehabBudget(Math.round(basePrice * 0.12));
          setGrossRentMonthly(0);
        } else if (selectedStrategy === 'brrrr') {
          setRehabBudget(Math.round(basePrice * 0.15));
          setGrossRentMonthly(Math.round(basePrice * 0.009));
        } else if (selectedStrategy === 'short_term_rental_airbnb') {
          setRehabBudget(Math.round(basePrice * 0.08));
          setGrossRentMonthly(Math.round(basePrice * 0.014));
        } else {
          setRehabBudget(Math.round(basePrice * 0.05));
          setGrossRentMonthly(Math.round(basePrice * 0.008));
        }
      }
    },
    [],
  );

  const handleStrategyChange = (newStrategy: StrategyTemplateType) => {
    setStrategy(newStrategy);
    applyStrategyDefaults(newStrategy, purchasePrice);
  };

  // Check for Saved Draft on Mount (Server API first, fallback to localStorage)
  useEffect(() => {
    let cancelled = false;

    async function checkDraft() {
      if (queryAddress) return; // If loaded with specific query address, do not prompt

      try {
        const res = await fetch('/api/projects/drafts');
        if (res.ok) {
          const json = (await res.json()) as { draft: DraftProjectData | null };
          if (json.draft && json.draft.address && !cancelled) {
            setDraftLoadedAddress(json.draft.address);
            setHasDraftResumePrompt(true);
            return;
          }
        }
      } catch {
        // Fallback to localStorage
      }

      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          try {
            const parsed = JSON.parse(saved) as DraftProjectData;
            if (parsed.address && !cancelled) {
              setDraftLoadedAddress(parsed.address);
              setHasDraftResumePrompt(true);
            }
          } catch {
            // Ignore
          }
        }
      }
    }

    checkDraft();
    return () => {
      cancelled = true;
    };
  }, [queryAddress]);

  // Autosave Draft (Server + LocalStorage)
  const saveDraft = useCallback(
    async (targetStep: number) => {
      if (!address.trim()) return;

      const draftPayload: DraftProjectData = {
        step: targetStep,
        address,
        unit,
        city,
        state,
        zipCode,
        sourceType,
        sourceContactName,
        sourceContactPhone,
        propertyType,
        beds,
        baths,
        squareFeet,
        yearBuilt,
        strategy,
        purchasePrice,
        rehabBudget,
        estimatedARV: estimatedARV ?? undefined,
        grossRentMonthly,
        targetLtvPct,
        interestRatePct,
        amortizationYears,
        operatingExpenseRatioPct,
        vacancyRatePct,
        buyerClosingCostsPct,
        capExReservePct,
        exitCapRatePct,
        targetContractDate,
        targetClosingDate,
        inspectionDays,
        financingDays,
        teamMembers,
        dealNotes,
        source: fromCalculator ? 'deal_calculator' : 'manual',
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(draftPayload));
      }

      try {
        await fetch('/api/projects/drafts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(draftPayload),
        });
      } catch {
        // LocalStorage serves as fallback
      }
    },
    [
      address,
      unit,
      city,
      state,
      zipCode,
      sourceType,
      sourceContactName,
      sourceContactPhone,
      propertyType,
      beds,
      baths,
      squareFeet,
      yearBuilt,
      strategy,
      purchasePrice,
      rehabBudget,
      estimatedARV,
      grossRentMonthly,
      targetLtvPct,
      interestRatePct,
      amortizationYears,
      operatingExpenseRatioPct,
      vacancyRatePct,
      buyerClosingCostsPct,
      capExReservePct,
      exitCapRatePct,
      targetContractDate,
      targetClosingDate,
      inspectionDays,
      financingDays,
      teamMembers,
      dealNotes,
      fromCalculator,
    ],
  );

  // Autosave whenever currentStep changes
  useEffect(() => {
    if (address.trim()) {
      saveDraft(currentStep);
    }
  }, [currentStep, saveDraft, address]);

  const resumeDraft = async () => {
    let draft: DraftProjectData | null = null;

    try {
      const res = await fetch('/api/projects/drafts');
      if (res.ok) {
        const json = await res.json();
        if (json.draft) draft = json.draft;
      }
    } catch {
      // ignore
    }

    if (!draft && typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          draft = JSON.parse(saved);
        } catch {
          // ignore
        }
      }
    }

    if (!draft) return;

    setAddress(draft.address || '');
    setUnit(draft.unit || '');
    setCity(draft.city || 'Austin');
    setState(draft.state || 'TX');
    setZipCode(draft.zipCode || '78702');
    setSourceType(draft.sourceType || 'off-market');
    setSourceContactName(draft.sourceContactName || '');
    setSourceContactPhone(draft.sourceContactPhone || '');
    setPropertyType(draft.propertyType || 'single_family');
    setBeds(draft.beds ?? 3);
    setBaths(draft.baths ?? 2);
    setSquareFeet(draft.squareFeet ?? 1850);
    setYearBuilt(draft.yearBuilt ?? 1995);
    setStrategy(draft.strategy || 'flip');
    setPurchasePrice(draft.purchasePrice || 485000);
    setRehabBudget(draft.rehabBudget ?? 50000);
    setEstimatedARV(draft.estimatedARV ?? null);
    setGrossRentMonthly(draft.grossRentMonthly ?? 3800);
    setTargetLtvPct(draft.targetLtvPct ?? 75);
    setInterestRatePct(draft.interestRatePct ?? 6.5);
    setAmortizationYears(draft.amortizationYears ?? 30);
    setOperatingExpenseRatioPct(draft.operatingExpenseRatioPct ?? 35);
    setVacancyRatePct(draft.vacancyRatePct ?? 6.0);
    setBuyerClosingCostsPct(draft.buyerClosingCostsPct ?? 2.0);
    setCapExReservePct(draft.capExReservePct ?? 5.0);
    setExitCapRatePct(draft.exitCapRatePct ?? 6.5);
    if (draft.targetContractDate) setTargetContractDate(draft.targetContractDate);
    if (draft.targetClosingDate) setTargetClosingDate(draft.targetClosingDate);
    if (draft.inspectionDays) setInspectionDays(draft.inspectionDays);
    if (draft.financingDays) setFinancingDays(draft.financingDays);
    if (draft.teamMembers && draft.teamMembers.length > 0) setTeamMembers(draft.teamMembers as any);
    if (draft.dealNotes) setDealNotes(draft.dealNotes);

    const targetStep = (draft.step as 1 | 2 | 3 | 4 | 5) || 1;
    setCurrentStep(targetStep);
    setHasDraftResumePrompt(false);
  };

  const discardDraft = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    try {
      await fetch('/api/projects/drafts', { method: 'DELETE' });
    } catch {
      // ignore
    }
    setHasDraftResumePrompt(false);
  };

  // Add Closing Team Member
  const handleAddTeamMember = () => {
    if (!newMemberName.trim()) return;
    setTeamMembers((prev) => [
      ...prev,
      {
        id: `team-${Date.now()}`,
        name: newMemberName.trim(),
        role: newMemberRole,
        email: newMemberEmail.trim() || undefined,
      },
    ]);
    setNewMemberName('');
    setNewMemberEmail('');
  };

  const handleRemoveTeamMember = (index: number) => {
    setTeamMembers((prev) => prev.filter((_, i) => i !== index));
  };

  // Canonical Financial Engine Calculations
  const metrics = useMemo(() => {
    if (!purchasePrice || purchasePrice <= 0 || !estimatedARV || estimatedARV <= 0) return null;
    try {
      return reconcileAcquisitionUnderwriting({
        purchasePrice,
        rehabBudget,
        estimatedARV,
        grossRentMonthly,
        operatingExpenseRatioPct,
        vacancyRatePct,
        targetLtvPct,
        interestRatePct,
        amortizationYears,
        strategy,
        exitCapRatePct,
        costOfSalePct: 5.0,
        holdPeriodYears: strategy === 'flip' ? 1 : 5,
        terminalValueMethod: 'appreciation_pct',
        allowDefaultTerminalMethod: true,
      });
    } catch {
      return null;
    }
  }, [
    purchasePrice,
    rehabBudget,
    estimatedARV,
    grossRentMonthly,
    operatingExpenseRatioPct,
    vacancyRatePct,
    targetLtvPct,
    interestRatePct,
    amortizationYears,
    strategy,
    exitCapRatePct,
  ]);

  const maoCalc = useMemo(() => {
    if (!estimatedARV || estimatedARV <= 0) return null;
    try {
      return computeMAO(
        estimatedARV,
        rehabBudget,
        0.70,
        Math.round(purchasePrice * (buyerClosingCostsPct / 100)),
      );
    } catch {
      return null;
    }
  }, [estimatedARV, rehabBudget, purchasePrice, buyerClosingCostsPct]);

  // Validation Checks (Low-Friction Rule)
  const isAddressValid = address.trim().length > 0;
  const isStrategyValid = !!strategy;
  const isPriceValid = purchasePrice > 0;

  const isStep1Valid = isAddressValid;
  const isStep2Valid = isStrategyValid && isPriceValid;
  const isStep3Valid = true;
  const isStep4Valid = true; // sensible defaults
  const isReadyToLaunch = isStep1Valid && isStep2Valid;

  // Step Progression Handler
  const handleContinue = () => {
    setSubmissionError(null);
    if (currentStep === 1) {
      if (!isAddressValid) {
        setTouchedFields((prev) => ({ ...prev, address: true }));
        setSubmissionError('Property address is required to locate the deal.');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!isPriceValid) {
        setTouchedFields((prev) => ({ ...prev, purchasePrice: true }));
        setSubmissionError('Target purchase price must be greater than $0.');
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setCurrentStep(4);
    } else if (currentStep === 4) {
      setCurrentStep(5);
    }
  };

  // Handle Project Creation & Launch
  const handleCreateProject = async () => {
    if (!isAddressValid) {
      setCurrentStep(1);
      setSubmissionError('Property address is required.');
      return;
    }
    if (!isPriceValid) {
      setCurrentStep(2);
      setSubmissionError('Target purchase price must be greater than zero.');
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);

    const projectPayload = {
      address: address.trim(),
      projectName: address.split(',')[0]?.trim() || 'New Investment Project',
      purchasePrice,
      rehabBudget,
      estimatedARV,
      grossRentMonthly,
      operatingExpenseRatioPct,
      targetLtvPct,
      interestRatePct,
      amortizationYears,
      strategy,
      terminalValueMethod: 'appreciation_pct',
      assumptionsNotes: dealNotes.trim() || 'Created via 5-Step Acquisition Wizard',
    };

    try {
      const response = await fetch('/api/projects/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create project');
      }

      const data = await response.json();
      const projectId = data.projectId || data.project_id;

      // Seed Team Members if added
      if (teamMembers.length > 0 && projectId) {
        for (const member of teamMembers) {
          try {
            await fetch(`/api/projects/${projectId}/team`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(member),
            });
          } catch {
            // non-fatal
          }
        }
      }

      // Seed Initial Contingency Deadlines
      if (projectId) {
        try {
          await fetch(`/api/projects/${projectId}/contingencies`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'inspection',
              label: 'General Property Inspection',
              deadline: new Date(Date.now() + inspectionDays * 86400000).toISOString(),
              daysFromEffective: inspectionDays,
            }),
          });
          await fetch(`/api/projects/${projectId}/contingencies`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'financing',
              label: 'Lender Loan Approval Contingency',
              deadline: new Date(Date.now() + financingDays * 86400000).toISOString(),
              daysFromEffective: financingDays,
            }),
          });
        } catch {
          // non-fatal
        }
      }

      // Clear Drafts
      await discardDraft();

      // Navigate to project workspace
      router.push(`/project/${projectId}`);
    } catch (err: unknown) {
      setSubmissionError(
        err instanceof Error ? err.message : 'Failed to create project. Please verify inputs.',
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen px-4 pb-28 pt-6 md:px-8 max-w-4xl mx-auto text-[#fdfffc]">
      {/* Top Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/projects"
            className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-semibold text-foreground hover:underline mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Create New Project</h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            REIL Phase 01: Acquisition: define property intake, strategy templates, underwriting, and closing deadlines.
          </p>
        </div>

        {/* Low-Friction Rule Indicator */}
        <div className="flex items-center gap-2 rounded-none border border-border bg-card px-3.5 py-2 text-xs text-muted-foreground shrink-0">
          <span className="h-2 w-2 rounded-none bg-primary animate-pulse" />
          <span>Only 3 required fields to launch</span>
        </div>
      </div>

      {/* Resume Draft Banner */}
      {hasDraftResumePrompt && (
        <div
          data-testid="resume-draft-banner"
          className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-none border border-border bg-card p-4 text-sm text-foreground shadow-sm"
        >
          <div className="flex items-center gap-3">
            <ArrowsClockwise className="h-5 w-5 text-foreground" />
            <div>
              <p className="font-semibold text-white">Resume Saved Project Draft?</p>
              <p className="text-xs text-white/70">
                You have an unfinished draft for{' '}
                <strong className="text-white">{draftLoadedAddress || 'a property'}</strong>.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 self-end sm:self-center">
            <button
              type="button"
              onClick={resumeDraft}
              className="inline-flex min-h-[44px] items-center rounded-none bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 shadow-sm transition"
            >
              Resume Draft
            </button>
            <button
              type="button"
              onClick={discardDraft}
              className="inline-flex min-h-[44px] items-center rounded-none border border-border bg-card px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition"
            >
              Start Fresh
            </button>
          </div>
        </div>
      )}

      {/* 5-Step Progress Stepper (Desktop) */}
      <nav aria-label="Wizard Steps" className="mb-8 hidden sm:grid grid-cols-5 gap-2">
        {(
          [
            { step: 1, label: 'Address', sub: 'Property Intake' },
            { step: 2, label: 'Deal Calc', sub: 'Underwriting' },
            { step: 3, label: 'Scope', sub: 'Execution Plan' },
            { step: 4, label: 'Team', sub: 'Deadlines' },
            { step: 5, label: 'Review', sub: 'Launch' },
          ] as const
        ).map(({ step, label, sub }) => {
          const isActive = currentStep === step;
          const isDone = currentStep > step;
          return (
            <button
              key={step}
              type="button"
              onClick={() => setCurrentStep(step)}
              className={`flex min-h-[44px] items-center gap-2.5 rounded-none p-2.5 text-left transition-all border ${
                isActive
                  ? 'border-primary bg-primary/10 text-white shadow-sm'
                  : isDone
                  ? 'border-border bg-card text-foreground'
                  : 'border-border/40 bg-card/40 text-muted-foreground hover:border-border'
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-none text-xs font-bold border ${
                  isActive
                    ? 'border-primary bg-primary text-primary-foreground'
                    : isDone
                    ? 'border-border bg-muted text-foreground'
                    : 'border-border/40 bg-card text-muted-foreground'
                }`}
              >
                {isDone ? '✓' : step}
              </span>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold truncate">{label}</div>
                <div className="text-[10px] text-muted-foreground truncate">{sub}</div>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Mobile Step Indicator Dots */}
      <div className="sm:hidden mb-6 flex items-center justify-between rounded-none border border-border bg-card p-3">
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <span
              key={s}
              className={`h-2 rounded-none transition-all ${
                s === currentStep
                  ? 'w-6 bg-primary'
                  : s < currentStep
                  ? 'w-2 bg-muted-foreground'
                  : 'w-2 bg-muted/40'
              }`}
            />
          ))}
        </div>
        <span className="text-xs font-mono font-medium text-white/70">
          Step {currentStep} of 5:{' '}
          <strong className="text-white">
            {currentStep === 1
              ? 'Address Intake'
              : currentStep === 2
              ? 'Deal Calculation'
              : currentStep === 3
              ? 'Scope & Specs'
              : currentStep === 4
              ? 'Team & Deadlines'
              : 'Review & Launch'}
          </strong>
        </span>
      </div>

      {/* Submission / Validation Error Notice */}
      {submissionError && (
        <div
          role="alert"
          className="mb-6 rounded-none border border-destructive/40 bg-destructive/10 p-4 text-xs sm:text-sm text-destructive-foreground shadow-lg"
        >
          <div className="flex items-center gap-2 font-semibold">
            <WarningCircle className="h-5 w-5 text-destructive" />
            {submissionError}
          </div>
        </div>
      )}

      {/* Step 1: Property Address Intake */}
      {currentStep === 1 && (
        <div className="space-y-6" data-testid="step-1-address-intake">
          <div className="rounded-none border border-border bg-card p-5 sm:p-7 shadow-sm">
            <div className="flex items-start justify-between gap-2 mb-4">
              <div>
                <h2 className="text-lg font-bold text-white">Step 1: Property Address Intake</h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  The Deal is created inside the Project. The first step is the property address, followed immediately by deal calculation to model returns and power the 33 Underwriting Datapoints.
                </p>
              </div>
              <span className="rounded-none bg-muted border border-border px-2.5 py-0.5 text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                Step 1: Required
              </span>
            </div>

            <div className="mb-4 rounded-none border border-border bg-muted/20 p-3 text-xs text-neutral-300 flex items-start gap-2.5">
              <Info className="h-4.5 w-4.5 text-foreground shrink-0 mt-0.5" />
              <div>
                <strong className="text-white font-semibold block">Deal Inside Project Architecture:</strong>
                <span>The first step is the property address, establishing the physical asset and Deal serial number. Step 2 immediately performs deal calculation across the 33 Underwriting Datapoints.</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="address-input" className="block text-xs font-semibold text-white/70 mb-1.5">
                  Street Address <span className="text-foreground">*</span>
                </label>
                <div className="space-y-2">
                  <AddressSearch
                    mode="select"
                    value={address}
                    placeholder="Search Google Places or type street address…"
                    onSearchChange={(val) => {
                      setAddress(val);
                      const parts = val.split(',').map((s) => s.trim());
                      if (parts.length >= 2 && parts[1]) setCity(parts[1]);
                    }}
                    onSelectAddress={(selected) => {
                      setAddress(selected);
                      const parts = selected.split(',').map((s) => s.trim());
                      if (parts.length >= 2 && parts[1]) setCity(parts[1]);
                    }}
                  />
                </div>

                {touchedFields.address && !isAddressValid && (
                  <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                    <WarningCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                    Property address is required to locate the deal and pull comps.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label htmlFor="unit-input" className="block text-xs font-semibold text-white/70 mb-1">Unit / Suite (Opt.)</label>
                  <input
                    id="unit-input"
                    type="text"
                    placeholder="e.g. Apt 4B"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full min-h-[44px] rounded-none border border-border bg-background px-3 py-2 text-base sm:text-xs text-foreground focus:border-ring focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="city-input" className="block text-xs font-semibold text-white/70 mb-1">City</label>
                  <input
                    id="city-input"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full min-h-[44px] rounded-none border border-border bg-background px-3 py-2 text-base sm:text-xs text-foreground focus:border-ring focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="state-input" className="block text-xs font-semibold text-white/70 mb-1">State</label>
                  <input
                    id="state-input"
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full min-h-[44px] rounded-none border border-border bg-background px-3 py-2 text-base sm:text-xs text-foreground focus:border-ring focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="zip-input" className="block text-xs font-semibold text-white/70 mb-1">Zip Code</label>
                  <input
                    id="zip-input"
                    type="text"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    className="w-full min-h-[44px] rounded-none border border-border bg-background px-3 py-2 text-base sm:text-xs text-foreground focus:border-ring focus:outline-none"
                  />
                </div>
              </div>

              {address && address.trim().length > 3 && (
                <div className="pt-2">
                  <span className="block text-xs font-semibold text-white/70 mb-1.5 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-foreground" />
                    <span>Satellite Aerial Parcel Screencap</span>
                  </span>
                  <PropertySatelliteViewer
                    address={address}
                    aspectRatio="16/9"
                    title={address}
                    className="rounded-none border border-border"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Sourcing Channel & Property Snapshot (Optional / Non-Blocking) */}
          <div className="rounded-none border border-border bg-card p-5 sm:p-7 shadow-sm space-y-5">
            <div>
              <h2 className="text-base font-bold text-white">Sourcing & Property Facts (Optional)</h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Pre-populate deal sourcing details and physical characteristics. Editable post-create.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="sourcing-channel-select" className="block text-xs font-semibold text-white/70 mb-1">Sourcing Channel</label>
                <select
                  id="sourcing-channel-select"
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value as any)}
                  className="w-full min-h-[44px] rounded-none border border-border bg-background p-2 text-base sm:text-xs text-foreground focus:border-ring focus:outline-none"
                >
                  <option value="off-market" className="bg-[#141416]">Off-Market Direct</option>
                  <option value="wholesaler" className="bg-[#141416]">Wholesaler Assignment</option>
                  <option value="MLS" className="bg-[#141416]">MLS Listed</option>
                  <option value="referral" className="bg-[#141416]">Investor Referral</option>
                  <option value="other" className="bg-[#141416]">Other</option>
                </select>
              </div>
              <div>
                <label htmlFor="source-contact-name" className="block text-xs font-semibold text-white/70 mb-1">Contact / Wholesaler Name</label>
                <input
                  id="source-contact-name"
                  type="text"
                  placeholder="e.g. Austin Wholesalers LLC"
                  value={sourceContactName}
                  onChange={(e) => setSourceContactName(e.target.value)}
                  className="w-full min-h-[44px] rounded-none border border-border bg-background px-3 py-2 text-base sm:text-xs text-foreground focus:border-ring focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="source-contact-phone" className="block text-xs font-semibold text-white/70 mb-1">Contact Phone / Email</label>
                <input
                  id="source-contact-phone"
                  type="text"
                  placeholder="e.g. 512-555-0199"
                  value={sourceContactPhone}
                  onChange={(e) => setSourceContactPhone(e.target.value)}
                  className="w-full min-h-[44px] rounded-none border border-border bg-background px-3 py-2 text-base sm:text-xs text-foreground focus:border-ring focus:outline-none"
                />
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <label htmlFor="property-type-select" className="block text-xs font-semibold text-white/70 mb-2">Property Type</label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {(
                  [
                    { id: 'single_family', label: 'Single Family' },
                    { id: 'multi_family_2_4', label: 'Multi-Family' },
                    { id: 'condo', label: 'Condo' },
                    { id: 'townhouse', label: 'Townhouse' },
                    { id: 'commercial', label: 'Commercial' },
                  ] as const
                ).map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPropertyType(id)}
                    className={`min-h-[44px] rounded-none border p-2 text-xs font-semibold transition ${
                      propertyType === id
                        ? 'border-primary bg-primary/15 text-primary-foreground'
                        : 'border-border bg-card/40 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label htmlFor="beds-input" className="block text-xs font-semibold text-white/70 mb-1">Beds</label>
                <input
                  id="beds-input"
                  type="number"
                  inputMode="decimal"
                  value={beds ?? ''}
                  onChange={(e) => setBeds(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full min-h-[44px] rounded-none border border-border bg-background px-3 py-2 text-base sm:text-xs text-foreground focus:border-ring focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="baths-input" className="block text-xs font-semibold text-white/70 mb-1">Baths</label>
                <input
                  id="baths-input"
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  value={baths ?? ''}
                  onChange={(e) => setBaths(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full min-h-[44px] rounded-none border border-border bg-background px-3 py-2 text-base sm:text-xs text-foreground focus:border-ring focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="sqft-input" className="block text-xs font-semibold text-white/70 mb-1">Square Feet</label>
                <input
                  id="sqft-input"
                  type="number"
                  inputMode="decimal"
                  value={squareFeet ?? ''}
                  onChange={(e) => setSquareFeet(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full min-h-[44px] rounded-none border border-border bg-background px-3 py-2 text-base sm:text-xs text-foreground focus:border-ring focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="year-built-input" className="block text-xs font-semibold text-white/70 mb-1">Year Built</label>
                <input
                  id="year-built-input"
                  type="number"
                  inputMode="decimal"
                  value={yearBuilt ?? ''}
                  onChange={(e) => setYearBuilt(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full min-h-[44px] rounded-none border border-border bg-background px-3 py-2 text-base sm:text-xs text-foreground focus:border-ring focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Deal Calculation & Financial Underwriting */}
      {currentStep === 2 && (
        <div className="space-y-6" data-testid="step-2-deal-calculation">
          <div className="rounded-none border border-border bg-card p-5 sm:p-7 shadow-sm">
            <div className="flex items-start justify-between gap-2 mb-4">
              <div>
                <h2 className="text-lg font-bold text-white">Step 2: Deal Calculation &amp; Financial Underwriting</h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  The Deal is inside the Project. Calibrate investment strategy, underwriting assumptions, and compute real-time returns across the 33 Underwriting Datapoints.
                </p>
              </div>
              <span className="rounded-none bg-muted border border-border px-2.5 py-0.5 text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                Price Required
              </span>
            </div>

            <div className="mb-5 rounded-none border border-border bg-muted/20 p-3 text-xs text-neutral-300 flex items-start gap-2.5">
              <Calculator className="h-4.5 w-4.5 text-foreground shrink-0 mt-0.5" />
              <div>
                <strong className="text-white font-semibold block">Deal Calculation Inside Project:</strong>
                <span>Address established in Step 1. Calibrate strategy and financing parameters to establish baseline metrics for the 33 Underwriting Datapoints.</span>
              </div>
            </div>

            {/* Strategy Selection inside Deal Calculation */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-white/70 mb-2">
                Investment Strategy Template <span className="text-foreground">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                {STRATEGY_OPTIONS.map((opt) => {
                  const isSelected = strategy === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleStrategyChange(opt.id)}
                      className={`min-h-[44px] rounded-none border p-3 text-left transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/10 shadow-sm text-foreground'
                          : 'border-border bg-card/40 text-muted-foreground hover:text-foreground hover:border-border'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-bold truncate">{opt.label}</span>
                        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded-none border border-border font-mono">
                          {opt.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">{opt.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="purchase-price-input" className="block text-xs font-semibold text-white/70 mb-1">
                  Target Purchase Price <span className="text-foreground">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <input
                    id="purchase-price-input"
                    type="number"
                    inputMode="decimal"
                    value={purchasePrice || ''}
                    onChange={(e) => setPurchasePrice(Number(e.target.value))}
                    onBlur={() => handleBlur('purchasePrice')}
                    placeholder="450000"
                    className={`w-full min-h-[44px] rounded-none border bg-background py-2.5 pl-8 pr-3.5 text-base sm:text-xs font-semibold text-foreground focus:outline-none ${
                      touchedFields.purchasePrice && !isPriceValid
                        ? 'border-destructive focus:border-destructive'
                        : 'border-border focus:border-ring'
                    }`}
                  />
                </div>
                {touchedFields.purchasePrice && !isPriceValid && (
                  <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                    <WarningCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                    Target purchase price must be greater than $0.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="rehab-budget-input" className="block text-xs font-semibold text-white/70 mb-1">Estimated Rehab Budget</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <input
                    id="rehab-budget-input"
                    type="number"
                    inputMode="decimal"
                    value={rehabBudget || ''}
                    onChange={(e) => setRehabBudget(Number(e.target.value))}
                    placeholder="50000"
                    className="w-full min-h-[44px] rounded-none border border-border bg-background py-2.5 pl-8 pr-3.5 text-base sm:text-xs font-semibold text-foreground focus:border-ring focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="arv-input" className="block text-xs font-semibold text-white/70">Estimated ARV (After Repair Value)</label>
                  {!estimatedARV && (
                    <span className="text-[10px] font-medium text-amber-400">ARV not provided: enter ARV to compute equity/MAO.</span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <input
                    id="arv-input"
                    type="number"
                    inputMode="decimal"
                    value={estimatedARV ?? ''}
                    onChange={(e) => setEstimatedARV(e.target.value === '' ? null : Number(e.target.value))}
                    placeholder="Enter explicit ARV"
                    className="w-full min-h-[44px] rounded-none border border-border bg-background py-2.5 pl-8 pr-3.5 text-base sm:text-xs font-semibold text-foreground focus:border-ring focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="gross-rent-input" className="block text-xs font-semibold text-white/70 mb-1">
                  Gross Monthly Rent {strategy === 'flip' ? '(N/A for flip)' : ''}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <input
                    id="gross-rent-input"
                    type="number"
                    inputMode="decimal"
                    disabled={strategy === 'flip'}
                    value={grossRentMonthly || ''}
                    onChange={(e) => setGrossRentMonthly(Number(e.target.value))}
                    placeholder="3800"
                    className="w-full min-h-[44px] rounded-none border border-border bg-background py-2.5 pl-8 pr-3.5 text-base sm:text-xs font-semibold text-foreground focus:border-ring focus:outline-none disabled:opacity-40"
                  />
                </div>
              </div>
            </div>

            {/* Collapsible Advanced Financial Assumptions (Collapsed by Default) */}
            <div className="mt-6 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setShowAdvancedAssumptions((prev) => !prev)}
                className="flex min-h-[44px] items-center justify-between w-full text-left py-2 text-xs font-bold text-foreground hover:text-foreground/80"
              >
                <span className="flex items-center gap-2">
                  {showAdvancedAssumptions ? (
                    <CaretDown className="h-4.5 w-4.5 text-foreground" />
                  ) : (
                    <CaretRight className="h-4.5 w-4.5 text-foreground" />
                  )}
                  Advanced Financial Assumptions (Institutional Ratios &amp; Financing)
                </span>
                <span className="rounded-none border border-border bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                  {showAdvancedAssumptions ? 'Collapse' : '8 Defaults Applied'}
                </span>
              </button>

              {showAdvancedAssumptions && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/20 p-4 rounded-none border border-border">
                  <div>
                    <label htmlFor="target-ltv-input" className="block text-[11px] text-muted-foreground mb-1">Target LTV %</label>
                    <input
                      id="target-ltv-input"
                      type="number"
                      inputMode="decimal"
                      value={targetLtvPct}
                      onChange={(e) => setTargetLtvPct(Number(e.target.value))}
                      className="w-full min-h-[44px] rounded-none border border-border bg-background p-2 text-base sm:text-xs text-foreground"
                    />
                  </div>
                  <div>
                    <label htmlFor="interest-rate-input" className="block text-[11px] text-muted-foreground mb-1">Interest Rate %</label>
                    <input
                      id="interest-rate-input"
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      value={interestRatePct}
                      onChange={(e) => setInterestRatePct(Number(e.target.value))}
                      className="w-full min-h-[44px] rounded-none border border-border bg-background p-2 text-base sm:text-xs text-foreground"
                    />
                  </div>
                  <div>
                    <label htmlFor="amort-years-input" className="block text-[11px] text-muted-foreground mb-1">Amortization (Yrs)</label>
                    <input
                      id="amort-years-input"
                      type="number"
                      inputMode="decimal"
                      value={amortizationYears}
                      onChange={(e) => setAmortizationYears(Number(e.target.value))}
                      className="w-full min-h-[44px] rounded-none border border-border bg-background p-2 text-base sm:text-xs text-foreground"
                    />
                  </div>
                  <div>
                    <label htmlFor="opex-ratio-input" className="block text-[11px] text-muted-foreground mb-1">Operating Exp. %</label>
                    <input
                      id="opex-ratio-input"
                      type="number"
                      inputMode="decimal"
                      value={operatingExpenseRatioPct}
                      onChange={(e) => setOperatingExpenseRatioPct(Number(e.target.value))}
                      className="w-full min-h-[44px] rounded-none border border-border bg-background p-2 text-base sm:text-xs text-foreground"
                    />
                  </div>
                  <div>
                    <label htmlFor="vacancy-rate-input" className="block text-[11px] text-muted-foreground mb-1">Vacancy Rate %</label>
                    <input
                      id="vacancy-rate-input"
                      type="number"
                      inputMode="decimal"
                      value={vacancyRatePct}
                      onChange={(e) => setVacancyRatePct(Number(e.target.value))}
                      className="w-full min-h-[44px] rounded-none border border-border bg-background p-2 text-base sm:text-xs text-foreground"
                    />
                  </div>
                  <div>
                    <label htmlFor="buyer-closing-input" className="block text-[11px] text-muted-foreground mb-1">Buyer Closing Costs %</label>
                    <input
                      id="buyer-closing-input"
                      type="number"
                      inputMode="decimal"
                      step="0.5"
                      value={buyerClosingCostsPct}
                      onChange={(e) => setBuyerClosingCostsPct(Number(e.target.value))}
                      className="w-full min-h-[44px] rounded-none border border-border bg-background p-2 text-base sm:text-xs text-foreground"
                    />
                  </div>
                  <div>
                    <label htmlFor="capex-reserve-input" className="block text-[11px] text-muted-foreground mb-1">CapEx Reserve %</label>
                    <input
                      id="capex-reserve-input"
                      type="number"
                      inputMode="decimal"
                      value={capExReservePct}
                      onChange={(e) => setCapExReservePct(Number(e.target.value))}
                      className="w-full min-h-[44px] rounded-none border border-border bg-background p-2 text-base sm:text-xs text-foreground"
                    />
                  </div>
                  <div>
                    <label htmlFor="exit-cap-input" className="block text-[11px] text-muted-foreground mb-1">Exit Cap Rate %</label>
                    <input
                      id="exit-cap-input"
                      type="number"
                      inputMode="decimal"
                      step="0.25"
                      value={exitCapRatePct}
                      onChange={(e) => setExitCapRatePct(Number(e.target.value))}
                      className="w-full min-h-[44px] rounded-none border border-border bg-background p-2 text-base sm:text-xs text-foreground"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Live Financial Engine Strip */}
          {metrics && (
            <div className="rounded-none border border-border bg-card p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <ChartLineUp className="h-4.5 w-4.5 text-foreground" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Live 33 Underwriting Datapoints Engine
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">Engine v{metrics?.engineVersion ?? 3}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-none border border-border bg-background/50 p-3">
                  <span className="block text-[10px] uppercase text-muted-foreground">MAO (70% Rule)</span>
                  <span className="text-base font-bold text-foreground">
                    {maoCalc ? `$${maoCalc.mao.toLocaleString()}` : 'N/A'}
                  </span>
                  <span className="block text-[9.5px] text-muted-foreground mt-0.5">
                    {maoCalc
                      ? purchasePrice <= maoCalc.mao
                        ? '✓ Within MAO threshold'
                        : '⚠️ Exceeds 70% rule'
                      : 'ARV not provided: enter ARV to compute equity/MAO.'}
                  </span>
                </div>
                <div className="rounded-none border border-border bg-background/50 p-3">
                  <span className="block text-[10px] uppercase text-muted-foreground">Cash Required</span>
                  <span className="text-base font-bold text-white">
                    {metrics ? `$${metrics.cashRequired.toLocaleString()}` : 'N/A'}
                  </span>
                  <span className="block text-[9.5px] text-muted-foreground mt-0.5">Down pmt + rehab + closing</span>
                </div>
                <div className="rounded-none border border-border bg-background/50 p-3">
                  <span className="block text-[10px] uppercase text-muted-foreground">
                    {strategy === 'flip' ? 'Expected Net Margin' : 'Cash-on-Cash Return'}
                  </span>
                  <span className="text-base font-bold text-foreground">
                    {strategy === 'flip'
                      ? estimatedARV && metrics
                        ? `$${Math.round(estimatedARV * 0.95 - metrics.totalCostBasis).toLocaleString()}`
                        : 'N/A'
                      : metrics
                        ? `${metrics.cashOnCashReturnPct.toFixed(1)}%`
                        : 'N/A'}
                  </span>
                  <span className="block text-[9.5px] text-muted-foreground mt-0.5">
                    {strategy === 'flip' ? 'Net profit on sale' : 'Annual cash yield'}
                  </span>
                </div>
                <div className="rounded-none border border-border bg-background/50 p-3">
                  <span className="block text-[10px] uppercase text-muted-foreground">Cap Rate on Cost</span>
                  <span className="text-base font-bold text-white">
                    {metrics ? `${metrics.capRateOnCost.toFixed(2)}%` : 'N/A'}
                  </span>
                  <span className="block text-[9.5px] text-muted-foreground mt-0.5">NOI / Total Cost Basis</span>
                </div>
              </div>
              {metrics?.isNegativeLeverage && (
                <div className="mt-3 flex items-center justify-between rounded-none border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs text-amber-200">
                  <span className="font-semibold">Negative Leverage Detected</span>
                  <span className="text-[11px] text-amber-300/80">
                    Debt Constant ({metrics.loanConstantPct.toFixed(2)}%) &gt; Yield on Cost ({metrics.yieldOnCostPct.toFixed(1)}%)
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Execution Scope & Property Specifications */}
      {currentStep === 3 && (
        <div className="space-y-6" data-testid="step-3-scope-and-specs">
          <div className="rounded-none border border-border bg-card p-5 sm:p-7 shadow-sm">
            <div className="flex items-center justify-between mb-3 border-b border-border pb-3">
              <div>
                <h2 className="text-lg font-bold text-white">Step 3: Execution Scope &amp; Property Specifications</h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Review standard rehab categories for {STRATEGY_OPTIONS.find((s) => s.id === strategy)?.label} and confirm physical asset specifications.
                </p>
              </div>
              <span className="text-xs text-primary font-mono">Hold Phase Seed</span>
            </div>

            <div className="mt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Auto-Seeded Scope Categories (Hold Phase Module)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(STRATEGY_OPTIONS.find((s) => s.id === strategy)?.defaultCategories || []).map((cat, idx) => (
                  <div key={idx} className="flex items-center gap-2 rounded-none border border-border bg-muted/20 p-2.5 text-xs text-foreground">
                    <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                    <span>{cat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-border pt-5 mt-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Physical Property Specifications
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label htmlFor="step3-beds-input" className="block text-xs font-semibold text-white/70 mb-1">Beds</label>
                  <input
                    id="step3-beds-input"
                    type="number"
                    inputMode="decimal"
                    value={beds ?? ''}
                    onChange={(e) => setBeds(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full min-h-[44px] rounded-none border border-border bg-background px-3 py-2 text-base sm:text-xs text-foreground focus:border-ring focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="step3-baths-input" className="block text-xs font-semibold text-white/70 mb-1">Baths</label>
                  <input
                    id="step3-baths-input"
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    value={baths ?? ''}
                    onChange={(e) => setBaths(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full min-h-[44px] rounded-none border border-border bg-background px-3 py-2 text-base sm:text-xs text-foreground focus:border-ring focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="step3-sqft-input" className="block text-xs font-semibold text-white/70 mb-1">Square Feet</label>
                  <input
                    id="step3-sqft-input"
                    type="number"
                    inputMode="decimal"
                    value={squareFeet ?? ''}
                    onChange={(e) => setSquareFeet(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full min-h-[44px] rounded-none border border-border bg-background px-3 py-2 text-base sm:text-xs text-foreground focus:border-ring focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="step3-year-built-input" className="block text-xs font-semibold text-white/70 mb-1">Year Built</label>
                  <input
                    id="step3-year-built-input"
                    type="number"
                    inputMode="decimal"
                    value={yearBuilt ?? ''}
                    onChange={(e) => setYearBuilt(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full min-h-[44px] rounded-none border border-border bg-background px-3 py-2 text-base sm:text-xs text-foreground focus:border-ring focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Team and Deadlines */}
      {currentStep === 4 && (
        <div className="space-y-6">
          <div className="rounded-none border border-border bg-card p-5 sm:p-7 shadow-sm space-y-5">
            <div>
              <h2 className="text-lg font-bold text-white">4. Transaction Deadlines & Closing Team</h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Establish target dates and assign team members. Dynamic tasks and contingency alerts will attach automatically.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="target-psa-date" className="block text-xs font-semibold text-white/70 mb-1">Target Contract (PSA) Date</label>
                <input
                  id="target-psa-date"
                  type="date"
                  value={targetContractDate}
                  onChange={(e) => setTargetContractDate(e.target.value)}
                  className="w-full min-h-[44px] rounded-none border border-border bg-background px-3.5 py-2.5 text-base sm:text-xs text-foreground focus:border-ring focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="target-closing-date" className="block text-xs font-semibold text-white/70 mb-1">Target Closing Date</label>
                <input
                  id="target-closing-date"
                  type="date"
                  value={targetClosingDate}
                  onChange={(e) => setTargetClosingDate(e.target.value)}
                  className="w-full min-h-[44px] rounded-none border border-border bg-background px-3.5 py-2.5 text-base sm:text-xs text-foreground focus:border-ring focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="inspection-days-input" className="block text-xs font-semibold text-white/70 mb-1">Inspection Period (Days)</label>
                <input
                  id="inspection-days-input"
                  type="number"
                  inputMode="decimal"
                  value={inspectionDays}
                  onChange={(e) => setInspectionDays(Number(e.target.value))}
                  className="w-full min-h-[44px] rounded-none border border-border bg-background px-3.5 py-2.5 text-base sm:text-xs text-foreground focus:border-ring focus:outline-none"
                />
                <p className="mt-1 text-[10px] text-muted-foreground">Standard 10-day physical inspection</p>
              </div>

              <div>
                <label htmlFor="financing-days-input" className="block text-xs font-semibold text-white/70 mb-1">Financing Contingency (Days)</label>
                <input
                  id="financing-days-input"
                  type="number"
                  inputMode="decimal"
                  value={financingDays}
                  onChange={(e) => setFinancingDays(Number(e.target.value))}
                  className="w-full min-h-[44px] rounded-none border border-border bg-background px-3.5 py-2.5 text-base sm:text-xs text-foreground focus:border-ring focus:outline-none"
                />
                <p className="mt-1 text-[10px] text-muted-foreground">Standard 21-day loan approval window</p>
              </div>
            </div>

            {/* Closing Team Section */}
            <div className="border-t border-border pt-5">
              <h3 className="text-sm font-bold text-white mb-3">Project Closing Team</h3>

              <div className="space-y-2 mb-4">
                {teamMembers.map((member, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-none border border-border bg-muted/20 p-3 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-white">{member.name}</span>
                      <span className="ml-2 text-muted-foreground">({member.role})</span>
                      {member.email && <span className="ml-2 text-muted-foreground/80">{member.email}</span>}
                    </div>
                    {idx > 0 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTeamMember(idx)}
                        className="text-red-400 hover:text-red-300 text-[11px]"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Team Member Inline Form */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <input
                  type="text"
                  placeholder="Team member name"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="min-h-[44px] rounded-none border border-border bg-background px-3 py-2 text-base sm:text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
                />
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                  className="min-h-[44px] rounded-none border border-border bg-background px-3 py-2 text-base sm:text-xs text-foreground focus:border-ring focus:outline-none"
                >
                  <option value="Acquisitions Agent">Acquisitions Agent</option>
                  <option value="Escrow / Title Officer">Escrow / Title Officer</option>
                  <option value="Lender">Lender</option>
                  <option value="General Contractor">General Contractor</option>
                  <option value="Property Manager">Property Manager</option>
                </select>
                <input
                  type="email"
                  placeholder="Email (optional)"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  className="min-h-[44px] rounded-none border border-border bg-background px-3 py-2 text-base sm:text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddTeamMember}
                  disabled={!newMemberName.trim()}
                  className="min-h-[44px] rounded-none bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition"
                >
                  + Add Member
                </button>
              </div>
            </div>

            {/* Deal Notes */}
            <div className="border-t border-border pt-4">
              <label htmlFor="deal-notes-textarea" className="block text-xs font-semibold text-white/70 mb-1">Deal Notes & Sourcing Context</label>
              <textarea
                id="deal-notes-textarea"
                rows={2}
                placeholder="Seller motivation, access notes, or special contract conditions…"
                value={dealNotes}
                onChange={(e) => setDealNotes(e.target.value)}
                className="w-full rounded-none border border-border bg-background p-3 text-base sm:text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 5: Review and Launch */}
      {currentStep === 5 && (
        <div className="space-y-6">
          <div className="rounded-none border border-border bg-card p-5 sm:p-7 shadow-sm space-y-6">
            <div className="flex items-start justify-between gap-2 border-b border-border pb-4">
              <div>
                <h2 className="text-lg font-bold text-white">5. Review & Launch Project</h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Confirm project setup. Launches into REIL Phase 01: Acquisition pipeline as an active Lead.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-none bg-muted border border-border px-3 py-1 text-xs font-bold text-foreground">
                <CheckCircle className="h-4 w-4 text-primary" />
                Ready to Launch
              </div>
            </div>

            {/* Readiness & Zero-Surprise Checklist */}
            <div className="rounded-none border border-border bg-muted/20 p-4 text-xs">
              <h3 className="font-bold text-white mb-2 uppercase tracking-wider text-[11px]">
                Pre-Flight Validation Check (Zero Surprises)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="flex items-center gap-2 text-neutral-300">
                  <span className="text-primary font-bold">✓</span>
                  <span>Address: <strong className="text-white">{address || 'Missing'}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-neutral-300">
                  <span className="text-primary font-bold">✓</span>
                  <span>Strategy: <strong className="text-white">{STRATEGY_OPTIONS.find((s) => s.id === strategy)?.label}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-neutral-300">
                  <span className="text-primary font-bold">✓</span>
                  <span>Purchase Price: <strong className="text-white">${purchasePrice.toLocaleString()}</strong></span>
                </div>
              </div>
            </div>

            {/* Comprehensive Scorecard */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Property & Strategy Card */}
              <div className="rounded-none border border-border bg-card/40 p-4 text-xs space-y-2">
                <h4 className="font-bold text-white text-[12px] border-b border-border pb-1.5 mb-2">
                  Property & Strategy
                </h4>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Address:</span>
                  <input
                    type="text"
                    required
                    readOnly
                    value={address}
                    className="font-medium text-white text-right max-w-[220px] truncate bg-transparent border-none p-0 focus:outline-none"
                    aria-label="Confirmed Property Address"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Deal Inside Project:</span>
                  <span className="font-semibold text-white truncate max-w-[220px]">
                    {address ? address.split(',')[0] : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Deal Serial Number:</span>
                  <span className="font-mono text-[11px] text-neutral-300 truncate max-w-[220px]" title={address}>
                    {address || 'Missing Address'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">33 Underwriting KPIs:</span>
                  <span className="text-foreground font-semibold">Ready for Analysis</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type & Specs:</span>
                  <span className="text-neutral-300">{propertyType} · {beds}b/{baths}ba · {squareFeet} sqft</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sourcing Channel:</span>
                  <span className="text-neutral-300">{sourceType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Disposition:</span>
                  <span className="text-foreground font-semibold">
                    {STRATEGY_OPTIONS.find((s) => s.id === strategy)?.disposition}
                  </span>
                </div>
              </div>

              {/* Financial & Underwriting Card */}
              <div className="rounded-none border border-border bg-card/40 p-4 text-xs space-y-2">
                <h4 className="font-bold text-white text-[12px] border-b border-border pb-1.5 mb-2">
                  Underwriting Highlights
                </h4>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Purchase Price:</span>
                  <span className="font-semibold text-white">${purchasePrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rehab Budget:</span>
                  <span className="text-neutral-300">${rehabBudget.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estimated ARV:</span>
                  <span className="text-neutral-300">
                    {estimatedARV ? `$${estimatedARV.toLocaleString()}` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">MAO (70% Rule):</span>
                  <span className="text-foreground font-semibold">
                    {maoCalc ? `$${maoCalc.mao.toLocaleString()}` : 'N/A'}
                  </span>
                </div>
                {metrics && (
                  <div className="flex justify-between border-t border-border pt-1">
                    <span className="text-muted-foreground">Projected Return:</span>
                    <span className="text-foreground font-bold">
                      {strategy === 'flip'
                        ? estimatedARV
                          ? `$${Math.round(estimatedARV * 0.95 - metrics.totalCostBasis).toLocaleString()} Net Profit`
                          : 'N/A'
                        : `${metrics.cashOnCashReturnPct.toFixed(1)}% CoC Return`}
                    </span>
                  </div>
                )}
              </div>

              {/* Deadlines & Timeline Card */}
              <div className="rounded-none border border-border bg-card/40 p-4 text-xs space-y-2">
                <h4 className="font-bold text-white text-[12px] border-b border-border pb-1.5 mb-2">
                  Transaction Milestones
                </h4>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Target Contract:</span>
                  <span className="text-neutral-300">{targetContractDate || 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Target Close:</span>
                  <span className="text-neutral-300">{targetClosingDate || 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Inspection Contingency:</span>
                  <span className="text-neutral-300">{inspectionDays} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Financing Contingency:</span>
                  <span className="text-neutral-300">{financingDays} days</span>
                </div>
              </div>

              {/* Team Members Card */}
              <div className="rounded-none border border-border bg-card/40 p-4 text-xs space-y-2">
                <h4 className="font-bold text-white text-[12px] border-b border-border pb-1.5 mb-2">
                  Assigned Team ({teamMembers.length})
                </h4>
                {teamMembers.map((m, i) => (
                  <div key={i} className="flex justify-between text-neutral-300">
                    <span>{m.name}</span>
                    <span className="text-muted-foreground font-mono text-[11px]">{m.role}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Bottom Actions Bar (Desktop & Mobile) */}
      <div className="fixed bottom-0 left-0 right-0 z-[60] border-t border-border bg-background/95 p-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <button
            type="button"
            disabled={currentStep === 1 || isSubmitting}
            onClick={() => setCurrentStep((prev) => (Math.max(1, prev - 1) as any))}
            className="flex min-h-[44px] items-center gap-1.5 rounded-none border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted/50 disabled:opacity-30 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="flex items-center gap-3">
            {currentStep < 5 ? (
              <button
                type="button"
                data-testid="wizard-continue-btn"
                onClick={handleContinue}
                className="flex min-h-[44px] items-center gap-2 rounded-none bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 shadow-sm transition active:scale-95 touch-press"
              >
                <span>
                  {currentStep === 1
                    ? 'Continue to Step 2: Deal Calculation'
                    : currentStep === 2
                    ? 'Continue to Step 3: Execution Scope'
                    : currentStep === 3
                    ? 'Continue to Step 4: Team & Deadlines'
                    : 'Continue to Step 5: Review & Launch'}
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                data-testid="create-project-submit-btn"
                disabled={!isReadyToLaunch || isSubmitting}
                onClick={handleCreateProject}
                className="flex min-h-[44px] items-center gap-2 rounded-none bg-primary px-7 py-2.5 text-xs sm:text-sm font-bold text-primary-foreground hover:bg-primary/90 shadow-sm disabled:opacity-40 transition active:scale-95 touch-press"
              >
                {isSubmitting ? (
                  <>
                    <CircleNotch className="h-4 w-4 animate-spin text-primary-foreground" />
                    <span>Launching Project…</span>
                  </>
                ) : (
                  <>
                    <RocketLaunch className="h-4.5 w-4.5" />
                    <span>Create Project & Enter Pipeline</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
