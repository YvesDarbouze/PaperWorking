'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AddressSearch from '@/components/deals/AddressSearch';
import {
  parseAddressComponents,
  type ParsedPlaceDetails,
} from '@/lib/maps/address-parser';
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

const MAX_CURRENCY_VALUE = 999_999_999_999;

function clampCurrencyInput(raw: number): number {
  if (!Number.isFinite(raw) || Number.isNaN(raw) || raw < 0) return 0;
  return Math.min(Math.round(raw), MAX_CURRENCY_VALUE);
}

function blockInvalidCurrencyKeys(e: React.KeyboardEvent<HTMLInputElement>): void {
  if (['e', 'E', '+', '-'].includes(e.key)) {
    e.preventDefault();
  }
}

function clampAndSyncCurrencyDom(inputEl: HTMLInputElement, allowEmpty = false): number | null {
  const raw = inputEl.value.trim();
  if (raw === '') {
    return allowEmpty ? null : 0;
  }
  const parsed = Number(raw.replace(/[$,\s]/g, ''));
  const clamped = clampCurrencyInput(parsed);
  const canonicalStr = clamped > 0 ? String(clamped) : raw === '0' ? '0' : '';
  if (inputEl.value !== canonicalStr) {
    inputEl.value = canonicalStr;
  }
  return allowEmpty && canonicalStr === '' ? null : clamped;
}

function formatSignedCurrency(amount: number): string {
  const rounded = Math.round(amount);
  if (rounded < 0) {
    return `-$${Math.abs(rounded).toLocaleString()}`;
  }
  return `$${rounded.toLocaleString()}`;
}

function validateStep4Date(
  rawValue: string,
  hasBadInput: boolean,
  fieldLabel: string,
): string | null {
  if (hasBadInput) {
    return `Enter a valid ${fieldLabel} (valid calendar date required).`;
  }
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return null;
  }
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return `Enter a valid ${fieldLabel} in YYYY-MM-DD format.`;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 2000 || year > 2100) {
    return `${fieldLabel} year must be between 2000 and 2100.`;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return `Enter a valid calendar date for ${fieldLabel}.`;
  }
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return `Enter a valid calendar date for ${fieldLabel}.`;
  }
  return null;
}

function normalizeWizardStrategy(raw: string | null | undefined): StrategyTemplateType {
  if (!raw) return 'flip';
  const normalized = raw.trim().toLowerCase();
  if (
    normalized === 'brrrr' ||
    normalized === 'value-add / brrrr' ||
    normalized === 'value-add' ||
    normalized === 'value_add'
  ) {
    return 'brrrr';
  }
  if (
    normalized === 'buy_and_hold_rental' ||
    normalized === 'buy & hold rental' ||
    normalized === 'buy & hold' ||
    normalized === 'buy_and_hold' ||
    normalized === 'rental'
  ) {
    return 'buy_and_hold_rental';
  }
  if (
    normalized === 'short_term_rental_airbnb' ||
    normalized === 'short-term / airbnb' ||
    normalized === 'short-term' ||
    normalized === 'str' ||
    normalized === 'airbnb'
  ) {
    return 'short_term_rental_airbnb';
  }
  if (
    normalized === 'commercial_value_add' ||
    normalized === 'commercial value-add' ||
    normalized === 'commercial'
  ) {
    return 'commercial_value_add';
  }
  return 'flip';
}


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

  const fromCalculator = searchParams.get('fromCalculator') === 'true';
  const rawQueryAddress = searchParams.get('address') ?? '';
  const queryAddress =
    rawQueryAddress.trim() ||
    (fromCalculator
      ? searchParams.get('name')?.trim() || '1247 Elm Street, Austin, TX 78702'
      : '');
  const queryPrice = searchParams.get('price')
    ? clampCurrencyInput(Number(searchParams.get('price')))
    : 0;
  const queryRehab = searchParams.get('rehab')
    ? clampCurrencyInput(Number(searchParams.get('rehab')))
    : 0;
  const queryArv = searchParams.get('arv')
    ? clampCurrencyInput(Number(searchParams.get('arv')))
    : 0;
  const queryRent = searchParams.get('rent')
    ? clampCurrencyInput(Number(searchParams.get('rent')))
    : 0;
  const rawStrategy = searchParams.get('strategy');
  const queryStrategy: StrategyTemplateType = normalizeWizardStrategy(rawStrategy);
  const initialTemplateDefaults = getStrategyTemplateDefaults(queryStrategy);
  const initialBasePrice = queryPrice || 485000;
  const queryStep = Number(searchParams.get('step'));
  const initialStep: 1 | 2 | 3 | 4 | 5 = fromCalculator
    ? 5
    : queryStep === 2 || queryStep === 3 || queryStep === 4 || queryStep === 5
      ? queryStep
      : 1;

  // Wizard Navigation
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(initialStep);
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
  const [purchasePrice, setPurchasePrice] = useState<number>(initialBasePrice);
  const [rehabBudget, setRehabBudget] = useState<number>(() => {
    if (queryRehab) return queryRehab;
    if (queryStrategy === 'flip') return Math.round(initialBasePrice * 0.12);
    if (queryStrategy === 'brrrr') return Math.round(initialBasePrice * 0.15);
    if (queryStrategy === 'short_term_rental_airbnb') return Math.round(initialBasePrice * 0.08);
    return Math.round(initialBasePrice * 0.05);
  });
  const [estimatedARV, setEstimatedARV] = useState<number | null>(queryArv || null);
  const [grossRentMonthly, setGrossRentMonthly] = useState<number>(() => {
    if (queryRent) return queryRent;
    if (queryStrategy === 'flip') return 0;
    if (queryStrategy === 'brrrr') return Math.round(initialBasePrice * 0.009);
    if (queryStrategy === 'short_term_rental_airbnb') return Math.round(initialBasePrice * 0.014);
    return Math.round(initialBasePrice * 0.008);
  });
  const [targetLtvPct, setTargetLtvPct] = useState<number>(initialTemplateDefaults.targetLtvPct);
  const [interestRatePct, setInterestRatePct] = useState<number>(initialTemplateDefaults.interestRatePct);
  const [amortizationYears, setAmortizationYears] = useState<number>(initialTemplateDefaults.amortizationYears);
  const [operatingExpenseRatioPct, setOperatingExpenseRatioPct] = useState<number>(
    initialTemplateDefaults.operatingExpenseRatioPct,
  );
  const [vacancyRatePct, setVacancyRatePct] = useState<number>(initialTemplateDefaults.vacancyRatePct);
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
  const [targetContractDateBadInput, setTargetContractDateBadInput] = useState(false);
  const [targetClosingDateBadInput, setTargetClosingDateBadInput] = useState(false);
  const [hasVisitedStep4, setHasVisitedStep4] = useState<boolean>(() => initialStep >= 4);
  const [inspectionDays, setInspectionDays] = useState<number>(10);
  const [financingDays, setFinancingDays] = useState<number>(21);
  const [teamMembers, setTeamMembers] = useState(DEFAULT_TEAM_MEMBERS);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('Acquisitions Agent');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [dealNotes, setDealNotes] = useState('');

  // Validation States (On-Blur)
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (currentStep === 4) {
      setHasVisitedStep4(true);
    }
  }, [currentStep]);

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

  useEffect(() => {
    setStrategy(queryStrategy);
    if (!queryRehab && !queryRent) {
      applyStrategyDefaults(queryStrategy, initialBasePrice);
    }
  }, [queryStrategy, queryRehab, queryRent, initialBasePrice, applyStrategyDefaults]);

  const selectedStrategyOption =
    STRATEGY_OPTIONS.find((opt) => opt.id === strategy) ?? STRATEGY_OPTIONS[0];

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

    const toFinitePositive = (val: unknown, fallback: number): number => {
      const n = typeof val === 'string' ? Number(val.replace(/[$,%\s]/g, '')) : Number(val);
      return Number.isFinite(n) && n > 0 ? n : fallback;
    };
    const toFiniteNonNegative = (val: unknown, fallback: number): number => {
      if (val === undefined || val === null || val === '') return fallback;
      const n = typeof val === 'string' ? Number(val.replace(/[$,%\s]/g, '')) : Number(val);
      return Number.isFinite(n) && n >= 0 ? n : fallback;
    };

    setAddress(draft.address || '');
    setUnit(draft.unit || '');
    setCity(draft.city || 'Austin');
    setState(draft.state || 'TX');
    setZipCode(draft.zipCode || '78702');
    setSourceType(draft.sourceType || 'off-market');
    setSourceContactName(draft.sourceContactName || '');
    setSourceContactPhone(draft.sourceContactPhone || '');
    setPropertyType(draft.propertyType || 'single_family');
    setBeds(toFiniteNonNegative(draft.beds, 3));
    setBaths(toFiniteNonNegative(draft.baths, 2));
    setSquareFeet(toFiniteNonNegative(draft.squareFeet, 1850));
    setYearBuilt(toFinitePositive(draft.yearBuilt, 1995));
    setStrategy(normalizeWizardStrategy(draft.strategy));
    setPurchasePrice(clampCurrencyInput(toFinitePositive(draft.purchasePrice, 485000)));
    setRehabBudget(clampCurrencyInput(toFiniteNonNegative(draft.rehabBudget, 50000)));
    const parsedArv = draft.estimatedARV !== undefined && draft.estimatedARV !== null
      ? toFinitePositive(draft.estimatedARV, 0)
      : 0;
    setEstimatedARV(parsedArv > 0 ? clampCurrencyInput(parsedArv) : null);
    setGrossRentMonthly(clampCurrencyInput(toFiniteNonNegative(draft.grossRentMonthly, 3800)));
    setTargetLtvPct(toFiniteNonNegative(draft.targetLtvPct, 75));
    setInterestRatePct(toFiniteNonNegative(draft.interestRatePct, 6.5));
    setAmortizationYears(toFinitePositive(draft.amortizationYears, 30));
    setOperatingExpenseRatioPct(toFiniteNonNegative(draft.operatingExpenseRatioPct, 35));
    setVacancyRatePct(toFiniteNonNegative(draft.vacancyRatePct, 6.0));
    setBuyerClosingCostsPct(toFiniteNonNegative(draft.buyerClosingCostsPct, 2.0));
    setCapExReservePct(toFiniteNonNegative(draft.capExReservePct, 5.0));
    setExitCapRatePct(toFinitePositive(draft.exitCapRatePct, 6.5));
    if (draft.targetContractDate) setTargetContractDate(draft.targetContractDate);
    if (draft.targetClosingDate) setTargetClosingDate(draft.targetClosingDate);
    setTargetContractDateBadInput(false);
    setTargetClosingDateBadInput(false);
    if (draft.inspectionDays) setInspectionDays(toFinitePositive(draft.inspectionDays, 10));
    if (draft.financingDays) setFinancingDays(toFinitePositive(draft.financingDays, 21));
    if (draft.teamMembers && draft.teamMembers.length > 0) setTeamMembers(draft.teamMembers as any);
    if (draft.dealNotes) setDealNotes(draft.dealNotes);

    const targetStep = (draft.step as 1 | 2 | 3 | 4 | 5) || 1;
    setSubmissionError(null);
    setTouchedFields({});
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
    setSubmissionError(null);
    setTouchedFields({});
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

  const expectedNetMargin =
    estimatedARV && metrics ? Math.round(estimatedARV * 0.95 - metrics.totalCostBasis) : null;
  const hasNegativeKpiValue = Boolean(
    (maoCalc && maoCalc.mao < 0) ||
      (metrics && metrics.cashRequired < 0) ||
      (strategy === 'flip'
        ? expectedNetMargin !== null && expectedNetMargin < 0
        : metrics && metrics.cashOnCashReturnPct < 0) ||
      (metrics && metrics.capRateOnCost < 0),
  );

  // Validation Checks (Low-Friction Rule)
  const isAddressValid = address.trim().length > 0;
  const unitTrimmed = unit.trim();
  const unitError = useMemo(() => {
    if (!unitTrimmed) return null;
    if (/^(?=.*[A-Za-z0-9])[A-Za-z0-9\s#./-]+$/.test(unitTrimmed)) {
      return null;
    }
    return 'Unit / Suite can only contain letters, numbers, #, and hyphens.';
  }, [unitTrimmed]);
  const isUnitValid = !unitError;

  const cityTrimmed = city.trim();
  const cityError = useMemo(() => {
    if (!cityTrimmed) return null;
    if (cityTrimmed.length >= 2 && /^[A-Za-z][A-Za-z\s.'-]*[A-Za-z.]$/.test(cityTrimmed)) {
      return null;
    }
    return 'Enter a valid city name (letters, spaces, and hyphens only).';
  }, [cityTrimmed]);
  const isCityValid = !cityError;

  const stateTrimmed = state.trim().toUpperCase();
  const stateError = useMemo(() => {
    if (!stateTrimmed) return null;
    const validStates = new Set([
      'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL',
      'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME',
      'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH',
      'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'PR',
      'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'VI', 'WA',
      'WV', 'WI', 'WY', 'GU', 'AS', 'MP',
    ]);
    if (/^[A-Z]{2}$/.test(stateTrimmed) && validStates.has(stateTrimmed)) {
      return null;
    }
    return 'Enter a valid 2-letter US state code (e.g. TX).';
  }, [stateTrimmed]);
  const isStateValid = !stateError;

  const zipTrimmed = zipCode.trim();
  const zipError = useMemo(() => {
    if (!zipTrimmed) return null;
    if (/^\d{5}(-\d{4})?$/.test(zipTrimmed)) {
      return null;
    }
    return 'Enter a valid 5-digit ZIP code (digits only, e.g. 78702).';
  }, [zipTrimmed]);
  const isZipValid = !zipError;

  const sourceContactPhoneTrimmed = sourceContactPhone.trim();
  const sourceContactPhoneError = useMemo(() => {
    if (!sourceContactPhoneTrimmed) return null;
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(sourceContactPhoneTrimmed);
    if (isValidEmail) return null;
    const isPhoneCharsOnly = /^[+]?[\d\s().-]+$/.test(sourceContactPhoneTrimmed);
    const digitCount = sourceContactPhoneTrimmed.replace(/\D/g, '').length;
    if (isPhoneCharsOnly && digitCount >= 7 && digitCount <= 15) {
      return null;
    }
    return 'Enter a valid phone number (e.g. 512-555-0199) or email address.';
  }, [sourceContactPhoneTrimmed]);
  const isSourceContactPhoneValid = !sourceContactPhoneError;
  const isStrategyValid = !!strategy;
  const isPriceValid = purchasePrice > 0;

  const targetContractDateError = useMemo(
    () =>
      validateStep4Date(
        targetContractDate,
        targetContractDateBadInput,
        'Target Contract (PSA) Date',
      ),
    [targetContractDate, targetContractDateBadInput],
  );
  const isTargetContractDateValid = !targetContractDateError;

  const targetClosingDateError = useMemo(() => {
    const baseErr = validateStep4Date(
      targetClosingDate,
      targetClosingDateBadInput,
      'Target Closing Date',
    );
    if (baseErr) return baseErr;
    if (
      !targetContractDateError &&
      targetClosingDate.trim() &&
      targetContractDate.trim() &&
      targetClosingDate < targetContractDate
    ) {
      return 'Target Closing Date must be on or after the Target Contract (PSA) Date.';
    }
    return null;
  }, [targetClosingDate, targetClosingDateBadInput, targetContractDate, targetContractDateError]);
  const isTargetClosingDateValid = !targetClosingDateError;

  const inspectionDaysError = useMemo(() => {
    if (Number.isNaN(inspectionDays)) return null;
    if (
      !Number.isFinite(inspectionDays) ||
      !Number.isInteger(inspectionDays) ||
      inspectionDays < 1 ||
      inspectionDays > 365
    ) {
      return 'Inspection Period must be between 1 and 365 whole days.';
    }
    return null;
  }, [inspectionDays]);
  const isInspectionDaysValid = !inspectionDaysError;

  const financingDaysError = useMemo(() => {
    if (Number.isNaN(financingDays)) return null;
    if (
      !Number.isFinite(financingDays) ||
      !Number.isInteger(financingDays) ||
      financingDays < 1 ||
      financingDays > 365
    ) {
      return 'Financing Contingency must be between 1 and 365 whole days.';
    }
    return null;
  }, [financingDays]);
  const isFinancingDaysValid = !financingDaysError;

  const isStep1Valid =
    isAddressValid &&
    isUnitValid &&
    isCityValid &&
    isStateValid &&
    isZipValid &&
    isSourceContactPhoneValid;
  const isStep2Valid = isStrategyValid && isPriceValid;
  const isStep3Valid = true;
  const isStep4Valid =
    isTargetContractDateValid &&
    isTargetClosingDateValid &&
    isInspectionDaysValid &&
    isFinancingDaysValid;
  const isReadyToLaunch = isStep1Valid && isStep2Valid && isStep4Valid;

  const activeSubmissionError =
    submissionError &&
    !(
      (isAddressValid &&
        submissionError.toLowerCase().includes('property address')) ||
      (isSourceContactPhoneValid &&
        submissionError.toLowerCase().includes('contact phone / email')) ||
      (isStep1Valid && currentStep === 1) ||
      (isPriceValid &&
        (submissionError.toLowerCase().includes('purchase price') || currentStep === 2)) ||
      (isStep4Valid && currentStep === 4)
    )
      ? submissionError
      : null;

  useEffect(() => {
    if (!submissionError) return;
    if (
      (isAddressValid && submissionError.toLowerCase().includes('property address')) ||
      (isSourceContactPhoneValid && submissionError.toLowerCase().includes('contact phone / email')) ||
      (isStep1Valid && currentStep === 1)
    ) {
      setSubmissionError(null);
    } else if (
      isPriceValid &&
      (submissionError.toLowerCase().includes('purchase price') || currentStep === 2)
    ) {
      setSubmissionError(null);
    } else if (isStep4Valid && currentStep === 4) {
      setSubmissionError(null);
    }
  }, [
    isAddressValid,
    isSourceContactPhoneValid,
    isStep1Valid,
    isPriceValid,
    isStep4Valid,
    submissionError,
    currentStep,
  ]);

  const applyParsedAddressComponents = useCallback(
    (rawAddress: string, details?: ParsedPlaceDetails) => {
      const parsed = parseAddressComponents(rawAddress, details);
      if (parsed.city) {
        setCity(parsed.city);
      }
      if (parsed.state) {
        setState(parsed.state.toUpperCase());
      }
      if (parsed.zipCode) {
        setZipCode(parsed.zipCode);
      }
    },
    [],
  );

  // Step Progression Handler
  const handleContinue = () => {
    setSubmissionError(null);
    if (currentStep === 1) {
      if (!isAddressValid) {
        setTouchedFields((prev) => ({ ...prev, address: true }));
        setSubmissionError('Validation failed: Property Address (address): Property address is required to locate the deal.');
        return;
      }
      if (!isUnitValid && unitError) {
        setTouchedFields((prev) => ({ ...prev, unit: true }));
        setSubmissionError(`Validation failed: Unit / Suite (unit): ${unitError}`);
        return;
      }
      if (!isCityValid && cityError) {
        setTouchedFields((prev) => ({ ...prev, city: true }));
        setSubmissionError(`Validation failed: City (city): ${cityError}`);
        return;
      }
      if (!isStateValid && stateError) {
        setTouchedFields((prev) => ({ ...prev, state: true }));
        setSubmissionError(`Validation failed: State (state): ${stateError}`);
        return;
      }
      if (!isZipValid && zipError) {
        setTouchedFields((prev) => ({ ...prev, zipCode: true }));
        setSubmissionError(`Validation failed: Zip Code (zip): ${zipError}`);
        return;
      }
      if (!isSourceContactPhoneValid && sourceContactPhoneError) {
        setTouchedFields((prev) => ({ ...prev, sourceContactPhone: true }));
        setSubmissionError(`Validation failed: Contact Phone / Email (sourceContactPhone): ${sourceContactPhoneError}`);
        return;
      }
      setHasDraftResumePrompt(false);
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!isPriceValid) {
        setTouchedFields((prev) => ({ ...prev, purchasePrice: true }));
        setSubmissionError('Validation failed: Purchase Price (purchasePrice): Target purchase price must be greater than $0.');
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setCurrentStep(4);
    } else if (currentStep === 4) {
      if (!isTargetContractDateValid && targetContractDateError) {
        setTouchedFields((prev) => ({ ...prev, targetContractDate: true }));
        setSubmissionError(
          `Validation failed: Target Contract (PSA) Date (targetContractDate): ${targetContractDateError}`,
        );
        return;
      }
      if (!isTargetClosingDateValid && targetClosingDateError) {
        setTouchedFields((prev) => ({ ...prev, targetClosingDate: true }));
        setSubmissionError(
          `Validation failed: Target Closing Date (targetClosingDate): ${targetClosingDateError}`,
        );
        return;
      }
      if (!isInspectionDaysValid && inspectionDaysError) {
        setTouchedFields((prev) => ({ ...prev, inspectionDays: true }));
        setSubmissionError(
          `Validation failed: Inspection Period (Days) (inspectionDays): ${inspectionDaysError}`,
        );
        return;
      }
      if (!isFinancingDaysValid && financingDaysError) {
        setTouchedFields((prev) => ({ ...prev, financingDays: true }));
        setSubmissionError(
          `Validation failed: Financing Contingency (Days) (financingDays): ${financingDaysError}`,
        );
        return;
      }
      setCurrentStep(5);
    }
  };

  // Handle Project Creation & Launch
  const handleCreateProject = async () => {
    if (!isAddressValid) {
      setCurrentStep(1);
      setSubmissionError('Validation failed: Property Address (address): Property address is required.');
      return;
    }
    if (!isUnitValid && unitError) {
      setCurrentStep(1);
      setSubmissionError(`Validation failed: Unit / Suite (unit): ${unitError}`);
      return;
    }
    if (!isCityValid && cityError) {
      setCurrentStep(1);
      setSubmissionError(`Validation failed: City (city): ${cityError}`);
      return;
    }
    if (!isStateValid && stateError) {
      setCurrentStep(1);
      setSubmissionError(`Validation failed: State (state): ${stateError}`);
      return;
    }
    if (!isZipValid && zipError) {
      setCurrentStep(1);
      setSubmissionError(`Validation failed: Zip Code (zip): ${zipError}`);
      return;
    }
    if (!isSourceContactPhoneValid && sourceContactPhoneError) {
      setCurrentStep(1);
      setSubmissionError(`Validation failed: Contact Phone / Email (sourceContactPhone): ${sourceContactPhoneError}`);
      return;
    }
    if (!isPriceValid) {
      setCurrentStep(2);
      setSubmissionError('Validation failed: Purchase Price (purchasePrice): Purchase price must be greater than zero.');
      return;
    }
    if (!isTargetContractDateValid && targetContractDateError) {
      setCurrentStep(4);
      setSubmissionError(
        `Validation failed: Target Contract (PSA) Date (targetContractDate): ${targetContractDateError}`,
      );
      return;
    }
    if (!isTargetClosingDateValid && targetClosingDateError) {
      setCurrentStep(4);
      setSubmissionError(
        `Validation failed: Target Closing Date (targetClosingDate): ${targetClosingDateError}`,
      );
      return;
    }
    if (!isInspectionDaysValid && inspectionDaysError) {
      setCurrentStep(4);
      setSubmissionError(
        `Validation failed: Inspection Period (Days) (inspectionDays): ${inspectionDaysError}`,
      );
      return;
    }
    if (!isFinancingDaysValid && financingDaysError) {
      setCurrentStep(4);
      setSubmissionError(
        `Validation failed: Financing Contingency (Days) (financingDays): ${financingDaysError}`,
      );
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);

    const safeNonNegative = (val: number | null | undefined, fallback: number): number =>
      typeof val === 'number' && Number.isFinite(val) && val >= 0 ? val : fallback;
    const safePositive = (val: number | null | undefined, fallback: number): number =>
      typeof val === 'number' && Number.isFinite(val) && val > 0 ? val : fallback;
    const safeOptionalNonNegative = (val: number | null | undefined): number | undefined =>
      typeof val === 'number' && Number.isFinite(val) && val >= 0 ? val : undefined;
    const safeOptionalPositive = (val: number | null | undefined): number | undefined =>
      typeof val === 'number' && Number.isFinite(val) && val > 0 ? val : undefined;

    const projectPayload = {
      address: address.trim(),
      projectName: address.split(',')[0]?.trim() || 'New Investment Project',
      city: city.trim() || 'Austin',
      state: state.trim().toUpperCase() || 'TX',
      zip: zipCode.trim() || '78702',
      beds: safeOptionalNonNegative(beds),
      baths: safeOptionalNonNegative(baths),
      sqft: safeOptionalNonNegative(squareFeet),
      yearBuilt: safeOptionalPositive(yearBuilt),
      sourceType,
      sourceContactName,
      sourceContactPhone,
      propertyType,
      purchasePrice: safePositive(purchasePrice, 0),
      rehabBudget: safeNonNegative(rehabBudget, 0),
      estimatedARV: safeOptionalPositive(estimatedARV),
      grossRentMonthly: safeNonNegative(grossRentMonthly, 0),
      operatingExpenseRatioPct: safeNonNegative(
        operatingExpenseRatioPct,
        initialTemplateDefaults.operatingExpenseRatioPct,
      ),
      targetLtvPct: safeNonNegative(targetLtvPct, initialTemplateDefaults.targetLtvPct),
      interestRatePct: safeNonNegative(interestRatePct, initialTemplateDefaults.interestRatePct),
      amortizationYears: safePositive(amortizationYears, initialTemplateDefaults.amortizationYears),
      vacancyRatePct: safeNonNegative(vacancyRatePct, initialTemplateDefaults.vacancyRatePct),
      buyerClosingCostsPct: safeNonNegative(buyerClosingCostsPct, 2.0),
      capExReservePct: safeNonNegative(capExReservePct, 5.0),
      exitCapRatePct: safePositive(exitCapRatePct, 6.5),
      strategy,
      terminalValueMethod: 'appreciation_pct',
      assumptionsNotes: dealNotes.trim() || 'Created via 5-Step Acquisition Wizard',
      teamMembers,
      targetContractDate: targetContractDate.trim() || undefined,
      targetClosingDate: targetClosingDate.trim() || undefined,
      inspectionDays: safePositive(inspectionDays, 10),
      financingDays: safePositive(financingDays, 21),
    };

    try {
      const response = await fetch('/api/projects/promote', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectPayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const fieldLabels: Record<string, string> = {
          address: 'Property Address',
          property_address: 'Property Address',
          purchasePrice: 'Purchase Price',
          rehabBudget: 'Rehab Budget',
          estimatedARV: 'Estimated ARV',
          grossRentMonthly: 'Monthly Gross Rent',
          operatingExpenseRatioPct: 'Operating Expense Ratio (%)',
          targetLtvPct: 'Target LTV (%)',
          interestRatePct: 'Interest Rate (%)',
          amortizationYears: 'Amortization Period (Years)',
          strategy: 'Investment Strategy',
          buyerClosingCostsPct: 'Buyer Closing Costs (%)',
          beds: 'Bedrooms',
          baths: 'Bathrooms',
          sqft: 'Square Footage',
          yearBuilt: 'Year Built',
        };

        if (errorData?.details && typeof errorData.details === 'object' && !Array.isArray(errorData.details)) {
          const detailParts = Object.entries(errorData.details as Record<string, unknown>)
            .filter(([, msgs]) => (Array.isArray(msgs) && msgs.length > 0) || typeof msgs === 'string')
            .map(([field, msgs]) => {
              const label = fieldLabels[field] || field;
              const ruleText = Array.isArray(msgs) ? msgs.join(', ') : String(msgs);
              return `${label} (${field}): ${ruleText}`;
            });
          if (detailParts.length > 0) {
            throw new Error(`Validation failed: ${detailParts.join('; ')}`);
          }
        }

        const rawMsg =
          (typeof errorData?.message === 'string' && errorData.message) ||
          (typeof errorData?.error === 'string' && errorData.error) ||
          (typeof errorData?.error?.message === 'string' && errorData.error.message) ||
          'Failed to create project';

        if (rawMsg === 'Validation failed' || rawMsg === 'Validation failed.') {
          throw new Error(
            'Validation failed: Property Address (Step 1) and Purchase Price greater than $0 (Step 2) are required.',
          );
        }
        throw new Error(rawMsg);
      }

      const data = await response.json();
      const projectId = data.projectId || data.project_id;

      // Seed Team Members, Initial Contingency Deadlines, and Clear Drafts concurrently
      const postCreateTasks: Promise<unknown>[] = [discardDraft()];

      if (projectId) {
        for (const member of teamMembers) {
          postCreateTasks.push(
            fetch(`/api/projects/${projectId}/team`, {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(member),
            }),
          );
        }

        postCreateTasks.push(
          fetch(`/api/projects/${projectId}/contingencies`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'inspection',
              name: 'General Property Inspection',
              deadlineDate: new Date(Date.now() + inspectionDays * 86400000).toISOString(),
              daysFromEffective: inspectionDays,
            }),
          }),
          fetch(`/api/projects/${projectId}/contingencies`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'financing',
              name: 'Lender Loan Approval Contingency',
              deadlineDate: new Date(Date.now() + financingDays * 86400000).toISOString(),
              daysFromEffective: financingDays,
            }),
          }),
        );
      }

      await Promise.allSettled(postCreateTasks);

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
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Create New Project</h1>
            <span
              data-testid="selected-template-title-badge"
              className="inline-flex items-center gap-1.5 rounded-none border border-primary/50 bg-primary/10 px-2.5 py-1 font-mono text-xs font-bold uppercase tracking-wider text-primary"
            >
              <span>{`${selectedStrategyOption.label} Template`}</span>
              <span className="text-muted-foreground">·</span>
              <span>{selectedStrategyOption.badge}</span>
            </span>
          </div>
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

      {/* Active Strategy Template Banner (Bug_07) */}
      <div
        data-testid="selected-strategy-template-banner"
        className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-none border border-border bg-card p-4 shadow-sm"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-none border border-border bg-background text-primary">
            <ChartLineUp className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Selected Template
              </span>
              <span
                data-testid="selected-template-title"
                className="text-sm font-bold text-foreground"
              >
                {selectedStrategyOption.label}
              </span>
              <span className="rounded-none border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-primary">
                {selectedStrategyOption.badge}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {`${selectedStrategyOption.description} · ${selectedStrategyOption.vacancyNotice}`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setCurrentStep(2)}
          className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-none border border-border bg-background px-3.5 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-foreground transition hover:border-primary hover:text-primary cursor-pointer"
        >
          Change Template
        </button>
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
            { step: 2, label: 'Deal Calculation', sub: 'Underwriting' },
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
              onClick={() => {
                if (step > 1 && !isAddressValid) {
                  setTouchedFields((prev) => ({ ...prev, address: true }));
                  setSubmissionError('Validation failed: Property Address (address): Property address is required to locate the deal.');
                  setCurrentStep(1);
                  return;
                }
                if (step > 1 && !isUnitValid && unitError) {
                  setTouchedFields((prev) => ({ ...prev, unit: true }));
                  setSubmissionError(`Validation failed: Unit / Suite (unit): ${unitError}`);
                  setCurrentStep(1);
                  return;
                }
                if (step > 1 && !isCityValid && cityError) {
                  setTouchedFields((prev) => ({ ...prev, city: true }));
                  setSubmissionError(`Validation failed: City (city): ${cityError}`);
                  setCurrentStep(1);
                  return;
                }
                if (step > 1 && !isStateValid && stateError) {
                  setTouchedFields((prev) => ({ ...prev, state: true }));
                  setSubmissionError(`Validation failed: State (state): ${stateError}`);
                  setCurrentStep(1);
                  return;
                }
                if (step > 1 && !isZipValid && zipError) {
                  setTouchedFields((prev) => ({ ...prev, zipCode: true }));
                  setSubmissionError(`Validation failed: Zip Code (zip): ${zipError}`);
                  setCurrentStep(1);
                  return;
                }
                if (step > 1 && !isSourceContactPhoneValid && sourceContactPhoneError) {
                  setTouchedFields((prev) => ({ ...prev, sourceContactPhone: true }));
                  setSubmissionError(`Validation failed: Contact Phone / Email (sourceContactPhone): ${sourceContactPhoneError}`);
                  setCurrentStep(1);
                  return;
                }
                if (step > 2 && !isPriceValid) {
                  setTouchedFields((prev) => ({ ...prev, purchasePrice: true }));
                  setSubmissionError('Validation failed: Purchase Price (purchasePrice): Target purchase price must be greater than $0.');
                  setCurrentStep(2);
                  return;
                }
                if (step > 4 && !isTargetContractDateValid && targetContractDateError) {
                  setTouchedFields((prev) => ({ ...prev, targetContractDate: true }));
                  setSubmissionError(
                    `Validation failed: Target Contract (PSA) Date (targetContractDate): ${targetContractDateError}`,
                  );
                  setCurrentStep(4);
                  return;
                }
                if (step > 4 && !isTargetClosingDateValid && targetClosingDateError) {
                  setTouchedFields((prev) => ({ ...prev, targetClosingDate: true }));
                  setSubmissionError(
                    `Validation failed: Target Closing Date (targetClosingDate): ${targetClosingDateError}`,
                  );
                  setCurrentStep(4);
                  return;
                }
                if (step > 4 && !isInspectionDaysValid && inspectionDaysError) {
                  setTouchedFields((prev) => ({ ...prev, inspectionDays: true }));
                  setSubmissionError(
                    `Validation failed: Inspection Period (Days) (inspectionDays): ${inspectionDaysError}`,
                  );
                  setCurrentStep(4);
                  return;
                }
                if (step > 4 && !isFinancingDaysValid && financingDaysError) {
                  setTouchedFields((prev) => ({ ...prev, financingDays: true }));
                  setSubmissionError(
                    `Validation failed: Financing Contingency (Days) (financingDays): ${financingDaysError}`,
                  );
                  setCurrentStep(4);
                  return;
                }
                setSubmissionError(null);
                if (step > 1) {
                  setHasDraftResumePrompt(false);
                }
                setCurrentStep(step);
              }}
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
      {activeSubmissionError && (
        <div
          role="alert"
          data-testid="error-banner"
          className="mb-6 rounded-none border border-destructive/40 bg-destructive/10 p-4 text-xs sm:text-sm text-destructive-foreground shadow-lg"
        >
          <div className="flex items-center gap-2 font-semibold">
            <WarningCircle className="h-5 w-5 text-destructive" />
            {activeSubmissionError}
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
                    id="address-input"
                    mode="select"
                    value={address}
                    placeholder="Search Google Places or type street address…"
                    onSearchChange={(val) => {
                      setAddress(val);
                      if (val.trim().length > 0) {
                        setSubmissionError(null);
                        setHasDraftResumePrompt(false);
                      }
                      applyParsedAddressComponents(val);
                    }}
                    onSelectPlaceDetails={(details) => {
                      applyParsedAddressComponents(address, details);
                    }}
                    onSelectAddress={(selected, details) => {
                      setAddress(selected);
                      if (selected.trim().length > 0) {
                        setSubmissionError(null);
                        setHasDraftResumePrompt(false);
                      }
                      applyParsedAddressComponents(selected, details);
                    }}
                  />
                </div>

                {touchedFields.address && !isAddressValid && (
                  <p data-testid="address-field-error" className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
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
                    maxLength={20}
                    placeholder="e.g. Apt 4B"
                    value={unit}
                    onChange={(e) => {
                      setUnit(e.target.value.slice(0, 20));
                      setTouchedFields((prev) => ({ ...prev, unit: true }));
                    }}
                    aria-invalid={Boolean(unitError)}
                    aria-describedby={unitError ? 'unit-field-error' : undefined}
                    className={`w-full min-h-[44px] rounded-none border bg-background px-3 py-2 text-base sm:text-xs text-foreground focus:outline-none ${
                      unitError ? 'border-destructive focus:border-destructive' : 'border-border focus:border-ring'
                    }`}
                  />
                  {unitError && (
                    <p
                      id="unit-field-error"
                      data-testid="unit-field-error"
                      role="alert"
                      className="mt-1.5 text-xs text-red-400 flex items-center gap-1"
                    >
                      <WarningCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                      {unitError}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="city-input" className="block text-xs font-semibold text-white/70 mb-1">City</label>
                  <input
                    id="city-input"
                    type="text"
                    maxLength={60}
                    value={city}
                    onChange={(e) => {
                      setCity(e.target.value.slice(0, 60));
                      setTouchedFields((prev) => ({ ...prev, city: true }));
                    }}
                    aria-invalid={Boolean(cityError)}
                    aria-describedby={cityError ? 'city-field-error' : undefined}
                    className={`w-full min-h-[44px] rounded-none border bg-background px-3 py-2 text-base sm:text-xs text-foreground focus:outline-none ${
                      cityError ? 'border-destructive focus:border-destructive' : 'border-border focus:border-ring'
                    }`}
                  />
                  {cityError && (
                    <p
                      id="city-field-error"
                      data-testid="city-field-error"
                      role="alert"
                      className="mt-1.5 text-xs text-red-400 flex items-center gap-1"
                    >
                      <WarningCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                      {cityError}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="state-input" className="block text-xs font-semibold text-white/70 mb-1">State</label>
                  <input
                    id="state-input"
                    type="text"
                    maxLength={2}
                    value={state}
                    onChange={(e) => {
                      setState(e.target.value.toUpperCase().slice(0, 2));
                      setTouchedFields((prev) => ({ ...prev, state: true }));
                    }}
                    aria-invalid={Boolean(stateError)}
                    aria-describedby={stateError ? 'state-field-error' : undefined}
                    className={`w-full min-h-[44px] rounded-none border bg-background px-3 py-2 text-base sm:text-xs text-foreground focus:outline-none ${
                      stateError ? 'border-destructive focus:border-destructive' : 'border-border focus:border-ring'
                    }`}
                  />
                  {stateError && (
                    <p
                      id="state-field-error"
                      data-testid="state-field-error"
                      role="alert"
                      className="mt-1.5 text-xs text-red-400 flex items-center gap-1"
                    >
                      <WarningCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                      {stateError}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="zip-input" className="block text-xs font-semibold text-white/70 mb-1">Zip Code</label>
                  <input
                    id="zip-input"
                    type="text"
                    inputMode="numeric"
                    maxLength={10}
                    value={zipCode}
                    onChange={(e) => {
                      setZipCode(e.target.value.slice(0, 10));
                      setTouchedFields((prev) => ({ ...prev, zipCode: true }));
                    }}
                    aria-invalid={Boolean(zipError)}
                    aria-describedby={zipError ? 'zip-field-error' : undefined}
                    className={`w-full min-h-[44px] rounded-none border bg-background px-3 py-2 text-base sm:text-xs text-foreground focus:outline-none ${
                      zipError ? 'border-destructive focus:border-destructive' : 'border-border focus:border-ring'
                    }`}
                  />
                  {zipError && (
                    <p
                      id="zip-field-error"
                      data-testid="zip-field-error"
                      role="alert"
                      className="mt-1.5 text-xs text-red-400 flex items-center gap-1"
                    >
                      <WarningCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                      {zipError}
                    </p>
                  )}
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
                  onChange={(e) => {
                    setSourceContactPhone(e.target.value);
                    setTouchedFields((prev) => ({ ...prev, sourceContactPhone: true }));
                  }}
                  aria-invalid={Boolean(sourceContactPhoneError)}
                  aria-describedby={sourceContactPhoneError ? 'source-contact-phone-error' : undefined}
                  className={`w-full min-h-[44px] rounded-none border bg-background px-3 py-2 text-base sm:text-xs text-foreground focus:outline-none ${
                    sourceContactPhoneError
                      ? 'border-destructive focus:border-destructive'
                      : 'border-border focus:border-ring'
                  }`}
                />
                {sourceContactPhoneError && (
                  <p
                    id="source-contact-phone-error"
                    data-testid="source-contact-phone-error"
                    role="alert"
                    className="mt-1.5 text-xs text-red-400 flex items-center gap-1"
                  >
                    <WarningCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                    <span>{sourceContactPhoneError}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <span className="block text-xs font-semibold text-white/70 mb-2">Property Type</span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2" role="group" aria-label="Property Type">
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
              <span className="block text-xs font-semibold text-white/70 mb-2">
                Investment Strategy Template <span className="text-foreground">*</span>
              </span>
              <div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
                role="group"
                aria-label="Investment Strategy Template"
              >
                {STRATEGY_OPTIONS.map((opt) => {
                  const isSelected = strategy === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleStrategyChange(opt.id)}
                      className={`min-h-[44px] flex flex-col justify-between rounded-none border p-3.5 text-left transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/10 shadow-sm text-foreground'
                          : 'border-border bg-card/40 text-muted-foreground hover:text-foreground hover:border-border'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-1.5 mb-1.5">
                        <span
                          data-testid={`strategy-card-title-${opt.id}`}
                          className="text-xs font-bold leading-snug"
                        >
                          {opt.label}
                        </span>
                        <span className="shrink-0 text-[9px] uppercase px-1.5 py-0.5 rounded-none border border-border font-mono">
                          {opt.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{opt.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5 min-h-[20px]">
                  <label htmlFor="purchase-price-input" className="block text-xs font-semibold text-white/70">
                    Target Purchase Price <span className="text-foreground">*</span>
                  </label>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <input
                    id="purchase-price-input"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={MAX_CURRENCY_VALUE}
                    maxLength={12}
                    value={purchasePrice || ''}
                    onKeyDown={blockInvalidCurrencyKeys}
                    onChange={(e) => {
                      const nextPrice = clampAndSyncCurrencyDom(e.target, false) ?? 0;
                      setPurchasePrice(nextPrice);
                      if (nextPrice > 0) {
                        setSubmissionError(null);
                      }
                    }}
                    onBlur={() => handleBlur('purchasePrice')}
                    placeholder="450000"
                    className={`w-full min-h-[44px] rounded-none border bg-background py-2.5 pl-8 pr-3.5 font-mono tabular-nums text-base sm:text-xs font-semibold text-foreground focus:outline-none ${
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
                <div className="flex items-center justify-between gap-2 mb-1.5 min-h-[20px]">
                  <label htmlFor="rehab-budget-input" className="block text-xs font-semibold text-white/70">
                    Estimated Rehab Budget
                  </label>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <input
                    id="rehab-budget-input"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={MAX_CURRENCY_VALUE}
                    maxLength={12}
                    value={rehabBudget || ''}
                    onKeyDown={blockInvalidCurrencyKeys}
                    onChange={(e) =>
                      setRehabBudget(clampAndSyncCurrencyDom(e.target, false) ?? 0)
                    }
                    placeholder="50000"
                    className="w-full min-h-[44px] rounded-none border border-border bg-background py-2.5 pl-8 pr-3.5 font-mono tabular-nums text-base sm:text-xs font-semibold text-foreground focus:border-ring focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5 min-h-[20px]">
                  <label htmlFor="arv-input" className="block text-xs font-semibold text-white/70">
                    Estimated ARV (After Repair Value)
                  </label>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <input
                    id="arv-input"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={MAX_CURRENCY_VALUE}
                    maxLength={12}
                    value={estimatedARV ?? ''}
                    aria-describedby={!estimatedARV ? 'arv-helper-text' : undefined}
                    onKeyDown={blockInvalidCurrencyKeys}
                    onChange={(e) =>
                      setEstimatedARV(clampAndSyncCurrencyDom(e.target, true))
                    }
                    placeholder="Enter explicit ARV"
                    className="w-full min-h-[44px] rounded-none border border-border bg-background py-2.5 pl-8 pr-3.5 font-mono tabular-nums text-base sm:text-xs font-semibold text-foreground focus:border-ring focus:outline-none"
                  />
                </div>
                {!estimatedARV ? (
                  <p
                    id="arv-helper-text"
                    data-testid="arv-helper-text"
                    className="mt-1.5 text-[11px] font-medium leading-snug text-amber-400"
                  >
                    ARV not provided: enter ARV to compute equity/MAO.
                  </p>
                ) : (
                  <p
                    data-testid="arv-formatted-preview"
                    className="mt-1.5 text-[11px] font-mono leading-snug text-muted-foreground tabular-nums"
                  >
                    {estimatedARV >= MAX_CURRENCY_VALUE
                      ? `Formatted: ${formatSignedCurrency(estimatedARV)} (Maximum limit reached)`
                      : `Formatted: ${formatSignedCurrency(estimatedARV)}`}
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5 min-h-[20px]">
                  <label htmlFor="gross-rent-input" className="block text-xs font-semibold text-white/70">
                    Gross Monthly Rent {strategy === 'flip' ? '(N/A for flip)' : ''}
                  </label>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <input
                    id="gross-rent-input"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={MAX_CURRENCY_VALUE}
                    maxLength={12}
                    disabled={strategy === 'flip'}
                    value={grossRentMonthly || ''}
                    onKeyDown={blockInvalidCurrencyKeys}
                    onChange={(e) =>
                      setGrossRentMonthly(clampAndSyncCurrencyDom(e.target, false) ?? 0)
                    }
                    placeholder="3800"
                    className="w-full min-h-[44px] rounded-none border border-border bg-background py-2.5 pl-8 pr-3.5 font-mono tabular-nums text-base sm:text-xs font-semibold text-foreground focus:border-ring focus:outline-none disabled:opacity-40"
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
            <div className="rounded-none border border-border bg-card p-5 sm:p-6 shadow-sm overflow-hidden">
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
                <div
                  data-testid="underwriting-kpi-card"
                  className="min-w-0 overflow-hidden rounded-none border border-border bg-background/50 p-3"
                >
                  <span className="block truncate text-[10px] uppercase text-muted-foreground">MAO (70% Rule)</span>
                  <span
                    data-testid="underwriting-kpi-mao"
                    className="block truncate font-mono tabular-nums text-xs sm:text-sm md:text-base font-bold text-foreground"
                    title={maoCalc ? formatSignedCurrency(maoCalc.mao) : 'N/A'}
                  >
                    {maoCalc ? formatSignedCurrency(maoCalc.mao) : 'N/A'}
                  </span>
                  <span className="block truncate text-[9.5px] text-muted-foreground mt-0.5">
                    {maoCalc
                      ? purchasePrice <= maoCalc.mao
                        ? '✓ Within MAO threshold'
                        : '⚠️ Exceeds 70% rule'
                      : 'ARV not provided: enter ARV to compute equity/MAO.'}
                  </span>
                </div>
                <div
                  data-testid="underwriting-kpi-card"
                  className="min-w-0 overflow-hidden rounded-none border border-border bg-background/50 p-3"
                >
                  <span className="block truncate text-[10px] uppercase text-muted-foreground">Cash Required</span>
                  <span
                    data-testid="underwriting-kpi-cash-required"
                    className="block truncate font-mono tabular-nums text-xs sm:text-sm md:text-base font-bold text-white"
                    title={metrics ? formatSignedCurrency(metrics.cashRequired) : 'N/A'}
                  >
                    {metrics ? formatSignedCurrency(metrics.cashRequired) : 'N/A'}
                  </span>
                  <span className="block truncate text-[9.5px] text-muted-foreground mt-0.5">Down pmt + rehab + closing</span>
                </div>
                <div
                  data-testid="underwriting-kpi-card"
                  className="min-w-0 overflow-hidden rounded-none border border-border bg-background/50 p-3"
                >
                  <span className="block truncate text-[10px] uppercase text-muted-foreground">
                    {strategy === 'flip' ? 'Expected Net Margin' : 'Cash-on-Cash Return'}
                  </span>
                  <span
                    data-testid="underwriting-kpi-net-margin"
                    className="block truncate font-mono tabular-nums text-xs sm:text-sm md:text-base font-bold text-foreground"
                    title={
                      strategy === 'flip'
                        ? estimatedARV && metrics
                          ? formatSignedCurrency(Math.round(estimatedARV * 0.95 - metrics.totalCostBasis))
                          : 'N/A'
                        : metrics
                          ? `${metrics.cashOnCashReturnPct.toFixed(1)}%`
                          : 'N/A'
                    }
                  >
                    {strategy === 'flip'
                      ? estimatedARV && metrics
                        ? formatSignedCurrency(Math.round(estimatedARV * 0.95 - metrics.totalCostBasis))
                        : 'N/A'
                      : metrics
                        ? `${metrics.cashOnCashReturnPct.toFixed(1)}%`
                        : 'N/A'}
                  </span>
                  <span className="block truncate text-[9.5px] text-muted-foreground mt-0.5">
                    {strategy === 'flip' ? 'Net profit on sale' : 'Annual cash yield'}
                  </span>
                </div>
                <div
                  data-testid="underwriting-kpi-card"
                  className="min-w-0 overflow-hidden rounded-none border border-border bg-background/50 p-3"
                >
                  <span className="block truncate text-[10px] uppercase text-muted-foreground">Cap Rate on Cost</span>
                  <span
                    data-testid="underwriting-kpi-cap-rate"
                    className="block truncate font-mono tabular-nums text-xs sm:text-sm md:text-base font-bold text-white"
                    title={metrics ? `${metrics.capRateOnCost.toFixed(2)}%` : 'N/A'}
                  >
                    {metrics ? `${metrics.capRateOnCost.toFixed(2)}%` : 'N/A'}
                  </span>
                  <span className="block truncate text-[9.5px] text-muted-foreground mt-0.5">NOI / Total Cost Basis</span>
                </div>
              </div>
              {metrics?.isNegativeLeverage && hasNegativeKpiValue && (
                <div
                  data-testid="negative-leverage-banner"
                  className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-none border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs text-amber-200"
                >
                  <span className="font-semibold">Negative Leverage Detected</span>
                  <span className="text-[11px] font-mono tabular-nums text-amber-300/80">
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
                <h2 className="text-lg font-bold text-white">Step 3: Property Specs &amp; Standard Scope</h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Confirm the physical specifications of the property and review the typical scope of work for this strategy.
                </p>
              </div>
            </div>

            <div className="mt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Standard Scope of Work Categories
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
      {(currentStep === 4 || hasVisitedStep4) && (
        <div
          className={currentStep === 4 ? 'space-y-6' : 'hidden'}
          aria-hidden={currentStep !== 4}
          data-testid="step-4-team-deadlines"
        >
          <div className="rounded-none border border-border bg-card p-5 sm:p-7 shadow-sm space-y-5">
            <div>
              <h2 className="text-lg font-bold text-white">4. Transaction Deadlines & Closing Team</h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Establish target dates and assign team members. Dynamic tasks and contingency alerts will attach automatically.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="target-psa-date" className="block text-xs font-semibold text-white/70 mb-1">
                  Target Contract (PSA) Date <span className="text-foreground">*</span>
                </label>
                <input
                  id="target-psa-date"
                  type="date"
                  min="2000-01-01"
                  max="2100-12-31"
                  value={targetContractDate}
                  onChange={(e) => {
                    setTargetContractDate(e.target.value);
                    setTargetContractDateBadInput(Boolean(e.currentTarget.validity?.badInput));
                    setTouchedFields((prev) => ({ ...prev, targetContractDate: true }));
                  }}
                  onInput={(e) => {
                    setTargetContractDateBadInput(Boolean(e.currentTarget.validity?.badInput));
                  }}
                  onKeyUp={(e) => {
                    setTargetContractDateBadInput(Boolean(e.currentTarget.validity?.badInput));
                  }}
                  onBlur={(e) => {
                    setTargetContractDateBadInput(Boolean(e.currentTarget.validity?.badInput));
                    handleBlur('targetContractDate');
                  }}
                  aria-invalid={Boolean(targetContractDateError)}
                  aria-describedby={targetContractDateError ? 'target-psa-date-error' : undefined}
                  className={`w-full min-h-[44px] rounded-none border bg-background px-3.5 py-2.5 text-base sm:text-xs text-foreground focus:outline-none ${
                    targetContractDateError
                      ? 'border-destructive focus:border-destructive'
                      : 'border-border focus:border-ring'
                  }`}
                />
                {targetContractDateError && (
                  <p
                    id="target-psa-date-error"
                    role="alert"
                    data-testid="target-psa-date-error"
                    className="mt-1.5 text-xs text-red-400 flex items-center gap-1"
                  >
                    <WarningCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                    <span>{targetContractDateError}</span>
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="target-closing-date" className="block text-xs font-semibold text-white/70 mb-1">
                  Target Closing Date <span className="text-foreground">*</span>
                </label>
                <input
                  id="target-closing-date"
                  type="date"
                  min="2000-01-01"
                  max="2100-12-31"
                  value={targetClosingDate}
                  onChange={(e) => {
                    setTargetClosingDate(e.target.value);
                    setTargetClosingDateBadInput(Boolean(e.currentTarget.validity?.badInput));
                    setTouchedFields((prev) => ({ ...prev, targetClosingDate: true }));
                  }}
                  onInput={(e) => {
                    setTargetClosingDateBadInput(Boolean(e.currentTarget.validity?.badInput));
                  }}
                  onKeyUp={(e) => {
                    setTargetClosingDateBadInput(Boolean(e.currentTarget.validity?.badInput));
                  }}
                  onBlur={(e) => {
                    setTargetClosingDateBadInput(Boolean(e.currentTarget.validity?.badInput));
                    handleBlur('targetClosingDate');
                  }}
                  aria-invalid={Boolean(targetClosingDateError)}
                  aria-describedby={targetClosingDateError ? 'target-closing-date-error' : undefined}
                  className={`w-full min-h-[44px] rounded-none border bg-background px-3.5 py-2.5 text-base sm:text-xs text-foreground focus:outline-none ${
                    targetClosingDateError
                      ? 'border-destructive focus:border-destructive'
                      : 'border-border focus:border-ring'
                  }`}
                />
                {targetClosingDateError && (
                  <p
                    id="target-closing-date-error"
                    role="alert"
                    data-testid="target-closing-date-error"
                    className="mt-1.5 text-xs text-red-400 flex items-center gap-1"
                  >
                    <WarningCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                    <span>{targetClosingDateError}</span>
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="inspection-days-input" className="block text-xs font-semibold text-white/70 mb-1">
                  Inspection Period (Days)
                </label>
                <input
                  id="inspection-days-input"
                  type="number"
                  min={1}
                  max={365}
                  inputMode="decimal"
                  value={Number.isNaN(inspectionDays) ? '' : inspectionDays}
                  onKeyDown={blockInvalidCurrencyKeys}
                  onChange={(e) => {
                    const raw = e.target.value.trim();
                    setInspectionDays(raw === '' ? NaN : Number(raw));
                    setTouchedFields((prev) => ({ ...prev, inspectionDays: true }));
                  }}
                  onBlur={() => handleBlur('inspectionDays')}
                  aria-invalid={Boolean(inspectionDaysError)}
                  aria-describedby={inspectionDaysError ? 'inspection-days-error' : undefined}
                  className={`w-full min-h-[44px] rounded-none border bg-background px-3.5 py-2.5 text-base sm:text-xs text-foreground focus:outline-none ${
                    inspectionDaysError
                      ? 'border-destructive focus:border-destructive'
                      : 'border-border focus:border-ring'
                  }`}
                />
                {inspectionDaysError ? (
                  <p
                    id="inspection-days-error"
                    role="alert"
                    data-testid="inspection-days-error"
                    className="mt-1.5 text-xs text-red-400 flex items-center gap-1"
                  >
                    <WarningCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                    <span>{inspectionDaysError}</span>
                  </p>
                ) : (
                  <p className="mt-1 text-[10px] text-muted-foreground">Standard 10-day physical inspection</p>
                )}
              </div>

              <div>
                <label htmlFor="financing-days-input" className="block text-xs font-semibold text-white/70 mb-1">
                  Financing Contingency (Days)
                </label>
                <input
                  id="financing-days-input"
                  type="number"
                  min={1}
                  max={365}
                  inputMode="decimal"
                  value={Number.isNaN(financingDays) ? '' : financingDays}
                  onKeyDown={blockInvalidCurrencyKeys}
                  onChange={(e) => {
                    const raw = e.target.value.trim();
                    setFinancingDays(raw === '' ? NaN : Number(raw));
                    setTouchedFields((prev) => ({ ...prev, financingDays: true }));
                  }}
                  onBlur={() => handleBlur('financingDays')}
                  aria-invalid={Boolean(financingDaysError)}
                  aria-describedby={financingDaysError ? 'financing-days-error' : undefined}
                  className={`w-full min-h-[44px] rounded-none border bg-background px-3.5 py-2.5 text-base sm:text-xs text-foreground focus:outline-none ${
                    financingDaysError
                      ? 'border-destructive focus:border-destructive'
                      : 'border-border focus:border-ring'
                  }`}
                />
                {financingDaysError ? (
                  <p
                    id="financing-days-error"
                    role="alert"
                    data-testid="financing-days-error"
                    className="mt-1.5 text-xs text-red-400 flex items-center gap-1"
                  >
                    <WarningCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                    <span>{financingDaysError}</span>
                  </p>
                ) : (
                  <p className="mt-1 text-[10px] text-muted-foreground">Standard 21-day loan approval window</p>
                )}
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
                  aria-label="New team member name"
                  placeholder="Team member name"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="min-h-[44px] rounded-none border border-border bg-background px-3 py-2 text-base sm:text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
                />
                <select
                  aria-label="New team member role"
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
                  aria-label="New team member email"
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
            <div className="rounded-none border border-border bg-muted/20 p-4 text-xs overflow-hidden">
              <h3 className="font-bold text-white mb-2 uppercase tracking-wider text-[11px]">
                Pre-Flight Validation Check (Zero Surprises)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="flex min-w-0 items-center gap-2 text-neutral-300 overflow-hidden">
                  <span className="text-primary font-bold shrink-0">✓</span>
                  <span className="truncate">Address: <strong className="text-white">{address || 'Missing'}</strong></span>
                </div>
                <div className="flex min-w-0 items-center gap-2 text-neutral-300 overflow-hidden">
                  <span className="text-primary font-bold shrink-0">✓</span>
                  <span className="truncate">Strategy: <strong className="text-white">{STRATEGY_OPTIONS.find((s) => s.id === strategy)?.label}</strong></span>
                </div>
                <div className="flex min-w-0 items-center gap-2 text-neutral-300 overflow-hidden">
                  <span className="text-primary font-bold shrink-0">✓</span>
                  <span className="truncate" title={formatSignedCurrency(purchasePrice)}>
                    Purchase Price: <strong className="text-white">{formatSignedCurrency(purchasePrice)}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Comprehensive Scorecard */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Property & Strategy Card */}
              <div className="min-w-0 overflow-hidden rounded-none border border-border bg-card/40 p-4 text-xs space-y-2">
                <h4 className="font-bold text-white text-[12px] border-b border-border pb-1.5 mb-2">
                  Property & Strategy
                </h4>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-muted-foreground shrink-0">Address:</span>
                  <input
                    type="text"
                    required
                    readOnly
                    value={address}
                    className="font-medium text-white text-right max-w-[220px] truncate bg-transparent border-none p-0 focus:outline-none"
                    aria-label="Confirmed Property Address"
                  />
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-muted-foreground shrink-0">Deal Inside Project:</span>
                  <span className="font-semibold text-white truncate max-w-[220px]">
                    {address ? address.split(',')[0] : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-muted-foreground shrink-0">Deal Serial Number:</span>
                  <span className="font-mono text-[11px] text-neutral-300 truncate max-w-[220px]" title={address}>
                    {address || 'Missing Address'}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-muted-foreground shrink-0">33 Underwriting KPIs:</span>
                  <span className="text-foreground font-semibold truncate">Ready for Analysis</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground shrink-0">Type & Specs:</span>
                  <span className="text-neutral-300 truncate">{propertyType} · {beds}b/{baths}ba · {squareFeet} sqft</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground shrink-0">Sourcing Channel:</span>
                  <span className="text-neutral-300 truncate">{sourceType}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground shrink-0">Disposition:</span>
                  <span className="text-foreground font-semibold truncate">
                    {STRATEGY_OPTIONS.find((s) => s.id === strategy)?.disposition}
                  </span>
                </div>
              </div>

              {/* Financial & Underwriting Card */}
              <div className="min-w-0 overflow-hidden rounded-none border border-border bg-card/40 p-4 text-xs space-y-2">
                <h4 className="font-bold text-white text-[12px] border-b border-border pb-1.5 mb-2">
                  Underwriting Highlights
                </h4>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground shrink-0">Purchase Price:</span>
                  <span className="font-semibold text-white truncate" title={formatSignedCurrency(purchasePrice)}>
                    {formatSignedCurrency(purchasePrice)}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground shrink-0">Rehab Budget:</span>
                  <span className="text-neutral-300 truncate" title={formatSignedCurrency(rehabBudget)}>
                    {formatSignedCurrency(rehabBudget)}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground shrink-0">Estimated ARV:</span>
                  <span
                    className="text-neutral-300 truncate"
                    title={estimatedARV ? formatSignedCurrency(estimatedARV) : 'N/A'}
                  >
                    {estimatedARV ? formatSignedCurrency(estimatedARV) : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground shrink-0">MAO (70% Rule):</span>
                  <span
                    className="text-foreground font-semibold truncate"
                    title={maoCalc ? formatSignedCurrency(maoCalc.mao) : 'N/A'}
                  >
                    {maoCalc ? formatSignedCurrency(maoCalc.mao) : 'N/A'}
                  </span>
                </div>
                {metrics && (
                  <div className="flex justify-between gap-2 border-t border-border pt-1">
                    <span className="text-muted-foreground shrink-0">Projected Return:</span>
                    <span
                      data-testid="step5-projected-return"
                      className="text-foreground font-bold truncate"
                    >
                      {strategy === 'flip'
                        ? estimatedARV
                          ? `${formatSignedCurrency(Math.max(0, Math.round(estimatedARV - purchasePrice - rehabBudget)))} Net Profit`
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

      {/* Bottom Actions Bar (Desktop & Mobile) */}
      <div
        data-testid="create-project-actions-bar"
        className="mt-6 rounded-none border border-border bg-card p-4 shadow-sm"
      >
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <button
            type="button"
            disabled={currentStep === 1 || isSubmitting}
            onClick={() => {
              setSubmissionError(null);
              setCurrentStep((prev) => Math.max(1, prev - 1) as any);
            }}
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
