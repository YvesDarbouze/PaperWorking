'use client';

import React, { useState, useEffect } from 'react';
import type {
  ProjectFundingTerms,
  LegalTransferRecord,
  TitleScheduleBItem,
  ClosingDocumentSigningRecord,
  ClosingFeeSettlementRecord,
  PropertyPossessionRecord,
  TitleSearchRecord,
  TitleInsurancePolicyRecord,
  PropertyInsuranceBinderRecord,
} from '@/lib/projects/types';
import { cn } from '@/lib/utils';
import {
  ShieldCheck,
  Check,
  X,
  Plus,
  FileText,
  Lock,
  WarningCircle,
  Buildings,
  CurrencyDollar,
  House,
  User,
  Calendar,
} from '@/components/icons/PhosphorIcons';

export interface LegalOwnershipTransferCardProps {
  funding: ProjectFundingTerms;
  onUpdateFunding: (updated: ProjectFundingTerms) => void;
  onFinalizeClosing?: () => void;
  className?: string;
}

const DEFAULT_SCHEDULE_B_ITEMS: TitleScheduleBItem[] = [
  {
    id: 'sch-1',
    item: 'Prior mortgage payoff letter verified',
    category: 'requirement',
    status: 'cleared',
  },
  {
    id: 'sch-2',
    item: 'Municipal tax certificate paid through closing',
    category: 'requirement',
    status: 'cleared',
  },
  {
    id: 'sch-3',
    item: 'Utility easement standard setback noted',
    category: 'exception',
    status: 'pending',
  },
];

const DEFAULT_TITLE_SEARCH: TitleSearchRecord = {
  titleCompanyName: 'First American Title Insurance Co',
  titleExaminerName: 'Marcus Vance, Senior Title Examiner',
  searchOrderedDate: '2026-07-28',
  searchCompletedDate: '2026-08-04',
  searchStatus: 'title_cleared',
  deedChainVerified: true,
  noUnsatisfiedLiens: true,
  noTaxOrJudgmentLiens: true,
  noOwnershipOrBoundaryDisputes: true,
  municipalLienCertificateNumber: 'MLC-2026-009412',
  cleanTitleCommitmentIssued: true,
  notes: 'Chain of title verified back 42 years with unbroken continuity. Zero outstanding tax warrants or mechanic liens.',
};

const DEFAULT_TITLE_INSURANCE: TitleInsurancePolicyRecord = {
  underwriterName: 'First American Title Insurance Co',
  titleAgencyName: 'Sunshine State Title & Escrow LLC',
  lenderPolicyNumber: 'LP-882190-FA',
  lenderPolicyCoverageAmount: 294000,
  lenderPolicyStatus: 'binder_issued',
  ownerPolicyNumber: 'OP-882191-FA',
  ownerPolicyCoverageAmount: 392000,
  ownerPolicyStatus: 'binder_issued',
  simultaneousIssueDiscount: true,
  totalTitleInsurancePremium: 1850,
  policiesBound: true,
  binderIssuedDate: '2026-08-05',
};

const DEFAULT_PROPERTY_INSURANCE: PropertyInsuranceBinderRecord = {
  insuranceCarrier: 'Steadily Real Estate Insurance / Travelers',
  agencyName: 'Coastal Property Risk Advisors',
  policyType: 'landlord_dp3',
  policyNumber: 'POL-FL-DP3-88910',
  binderNumber: 'BND-2026-99120',
  dwellingCoverageAmount: 350000,
  liabilityCoverageAmount: 1000000,
  deductibleAmount: 2500,
  annualPremium: 2150,
  effectiveDate: '2026-08-15',
  expirationDate: '2027-08-15',
  status: 'bound',
  lenderLossPayeeEndorsed: true,
  floodInsuranceRequired: false,
  floodInsuranceBound: false,
};

const DEFAULT_CLOSING_DOCUMENTS: ClosingDocumentSigningRecord = {
  mortgageNoteExecuted: true,
  deedOfTrustExecuted: true,
  settlementStatementExecuted: true,
  titleAffidavitsExecuted: true,
  signingMethod: 'remote_online_notary',
  notaryName: 'Claire Patterson, Commission #FL-882190',
  signingCompletedAt: '2026-08-14T15:30:00Z',
  allDocumentsExecuted: true,
};

const DEFAULT_CLOSING_FEES: ClosingFeeSettlementRecord = {
  lenderOriginationFees: 2940,
  titleAndSettlementFees: 1850,
  escrowTaxesAndPrepaids: 2450,
  governmentRecordingCharges: 600,
  totalClosingFees: 7840,
  feeDisbursementStatus: 'settlement_reconciled',
  disbursedAt: '2026-08-15',
  escrowDisbursementReference: 'ESCROW-DISB-88912',
};

const DEFAULT_PROPERTY_POSSESSION: PropertyPossessionRecord = {
  possessionStatus: 'keys_received',
  keyDeliveryMethod: 'lockbox_code',
  lockboxCode: '4821',
  lockboxLocation: 'Water meter pipe on left side of porch',
  possessionEffectiveDate: '2026-08-15',
  possessionConfirmedBy: 'Jordan Taylor (Lead Investor)',
  rekeyCompleted: true,
};

const DEFAULT_LEGAL_TRANSFER: LegalTransferRecord = {
  vestingEntityName: '88 Harbor Lane Investments LLC',
  vestingEntityState: 'FL',
  vestingEntityEin: 'XX-XXX8921',
  goodStandingVerified: true,
  operatingAgreementExecuted: true,
  authorizedSignatoryName: 'Jordan Taylor (Managing Member)',
  titleCommitmentNumber: 'TC-FL-2026-88912',
  titleInsurer: 'First American Title Insurance Co',
  scheduleBCurativeItems: DEFAULT_SCHEDULE_B_ITEMS,
  titleSearch: DEFAULT_TITLE_SEARCH,
  titleInsurance: DEFAULT_TITLE_INSURANCE,
  propertyInsurance: DEFAULT_PROPERTY_INSURANCE,
  wireFraudVerified: false,
  wireVerifiedPhone: '(813) 555-0144',
  wireVerifiedWith: 'Sarah Jenkins (Escrow Officer)',
  wireVerifiedDate: '',
  outgoingWireReference: '',
  deedInstrumentNumber: '',
  deedRecordingDate: '',
  closingDocumentSigning: DEFAULT_CLOSING_DOCUMENTS,
  closingFeeSettlement: DEFAULT_CLOSING_FEES,
  propertyPossession: DEFAULT_PROPERTY_POSSESSION,
};

export default function LegalOwnershipTransferCard({
  funding,
  onUpdateFunding,
  onFinalizeClosing,
  className,
}: LegalOwnershipTransferCardProps) {
  const [record, setRecord] = useState<LegalTransferRecord>(() => {
    const base = funding.legalTransfer || DEFAULT_LEGAL_TRANSFER;
    return {
      ...base,
      titleSearch: base.titleSearch || DEFAULT_TITLE_SEARCH,
      titleInsurance: base.titleInsurance || DEFAULT_TITLE_INSURANCE,
      propertyInsurance: base.propertyInsurance || DEFAULT_PROPERTY_INSURANCE,
      closingDocumentSigning: base.closingDocumentSigning || DEFAULT_CLOSING_DOCUMENTS,
      closingFeeSettlement: base.closingFeeSettlement || DEFAULT_CLOSING_FEES,
      propertyPossession: base.propertyPossession || DEFAULT_PROPERTY_POSSESSION,
    };
  });

  const [newItemText, setNewItemText] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<'requirement' | 'exception'>('requirement');
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Sync if external funding.legalTransfer changes
  useEffect(() => {
    if (funding.legalTransfer) {
      setRecord({
        ...funding.legalTransfer,
        titleSearch:
          funding.legalTransfer.titleSearch || DEFAULT_TITLE_SEARCH,
        titleInsurance:
          funding.legalTransfer.titleInsurance || DEFAULT_TITLE_INSURANCE,
        propertyInsurance:
          funding.legalTransfer.propertyInsurance || DEFAULT_PROPERTY_INSURANCE,
        closingDocumentSigning:
          funding.legalTransfer.closingDocumentSigning || DEFAULT_CLOSING_DOCUMENTS,
        closingFeeSettlement:
          funding.legalTransfer.closingFeeSettlement || DEFAULT_CLOSING_FEES,
        propertyPossession:
          funding.legalTransfer.propertyPossession || DEFAULT_PROPERTY_POSSESSION,
      });
    }
  }, [funding.legalTransfer]);

  const updateField = <K extends keyof LegalTransferRecord>(
    field: K,
    value: LegalTransferRecord[K],
  ) => {
    setRecord((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateClosingDocs = (updates: Partial<ClosingDocumentSigningRecord>) => {
    setRecord((prev) => {
      const current = prev.closingDocumentSigning || DEFAULT_CLOSING_DOCUMENTS;
      const next = { ...current, ...updates };
      next.allDocumentsExecuted = Boolean(
        next.mortgageNoteExecuted &&
          next.deedOfTrustExecuted &&
          next.settlementStatementExecuted &&
          next.titleAffidavitsExecuted,
      );
      return {
        ...prev,
        closingDocumentSigning: next,
      };
    });
  };

  const updateFeeSettlement = (updates: Partial<ClosingFeeSettlementRecord>) => {
    setRecord((prev) => {
      const current = prev.closingFeeSettlement || DEFAULT_CLOSING_FEES;
      const next = { ...current, ...updates };
      next.totalClosingFees =
        (Number(next.lenderOriginationFees) || 0) +
        (Number(next.titleAndSettlementFees) || 0) +
        (Number(next.escrowTaxesAndPrepaids) || 0) +
        (Number(next.governmentRecordingCharges) || 0);
      return {
        ...prev,
        closingFeeSettlement: next,
      };
    });
  };

  const updatePropertyPossession = (updates: Partial<PropertyPossessionRecord>) => {
    setRecord((prev) => {
      const current = prev.propertyPossession || DEFAULT_PROPERTY_POSSESSION;
      return {
        ...prev,
        propertyPossession: { ...current, ...updates },
      };
    });
  };

  const updateTitleSearch = (updates: Partial<TitleSearchRecord>) => {
    setRecord((prev) => {
      const current = prev.titleSearch || DEFAULT_TITLE_SEARCH;
      return {
        ...prev,
        titleSearch: { ...current, ...updates },
      };
    });
  };

  const updateTitleInsurance = (updates: Partial<TitleInsurancePolicyRecord>) => {
    setRecord((prev) => {
      const current = prev.titleInsurance || DEFAULT_TITLE_INSURANCE;
      return {
        ...prev,
        titleInsurance: { ...current, ...updates },
      };
    });
  };

  const updatePropertyInsurance = (updates: Partial<PropertyInsuranceBinderRecord>) => {
    setRecord((prev) => {
      const current = prev.propertyInsurance || DEFAULT_PROPERTY_INSURANCE;
      return {
        ...prev,
        propertyInsurance: { ...current, ...updates },
      };
    });
  };

  const toggleScheduleBStatus = (id: string) => {
    setRecord((prev) => {
      const updatedItems = (prev.scheduleBCurativeItems || []).map((item) => {
        if (item.id === id) {
          const nextStatus: 'pending' | 'cleared' =
            item.status === 'cleared' ? 'pending' : 'cleared';
          return { ...item, status: nextStatus };
        }
        return item;
      });
      return {
        ...prev,
        scheduleBCurativeItems: updatedItems,
      };
    });
  };

  const removeScheduleBItem = (id: string) => {
    setRecord((prev) => ({
      ...prev,
      scheduleBCurativeItems: (prev.scheduleBCurativeItems || []).filter((i) => i.id !== id),
    }));
  };

  const handleAddScheduleBItem = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newItemText.trim();
    if (!trimmed) return;

    const newItem: TitleScheduleBItem = {
      id: `sch-${Date.now()}`,
      item: trimmed,
      category: newItemCategory,
      status: 'pending',
    };

    setRecord((prev) => ({
      ...prev,
      scheduleBCurativeItems: [...(prev.scheduleBCurativeItems || []), newItem],
    }));

    setNewItemText('');
  };

  const handleSave = () => {
    const updatedFunding: ProjectFundingTerms = {
      ...funding,
      legalTransfer: record,
      titleSearch: record.titleSearch,
      titleInsurance: record.titleInsurance,
      propertyInsurance: record.propertyInsurance,
    };
    onUpdateFunding(updatedFunding);
    setSaveSuccessMessage('Legal transfer, title & insurance records saved successfully.');
    setTimeout(() => {
      setSaveSuccessMessage(null);
    }, 4000);
  };

  const scheduleItems = record.scheduleBCurativeItems || [];
  const totalItems = scheduleItems.length;
  const clearedItems = scheduleItems.filter((item) => item.status === 'cleared').length;
  const pendingItems = totalItems - clearedItems;

  const titleSearch = record.titleSearch || DEFAULT_TITLE_SEARCH;
  const isTitleCleared = Boolean(
    titleSearch.searchStatus === 'title_cleared' &&
      titleSearch.deedChainVerified &&
      titleSearch.noUnsatisfiedLiens &&
      titleSearch.noTaxOrJudgmentLiens &&
      titleSearch.noOwnershipOrBoundaryDisputes,
  );

  const titleInsurance = record.titleInsurance || DEFAULT_TITLE_INSURANCE;
  const isTitleInsuranceBound = Boolean(
    titleInsurance.policiesBound &&
      (titleInsurance.lenderPolicyStatus === 'binder_issued' ||
        titleInsurance.lenderPolicyStatus === 'policy_issued') &&
      (titleInsurance.ownerPolicyStatus === 'binder_issued' ||
        titleInsurance.ownerPolicyStatus === 'policy_issued'),
  );

  const propertyInsurance = record.propertyInsurance || DEFAULT_PROPERTY_INSURANCE;
  const isHazardInsuranceBound = Boolean(
    (propertyInsurance.status === 'bound' ||
      propertyInsurance.status === 'paid' ||
      propertyInsurance.status === 'dec_page_issued') &&
      propertyInsurance.lenderLossPayeeEndorsed,
  );

  const isVestingComplete = Boolean(
    record.vestingEntityName &&
      record.vestingEntityState &&
      record.vestingEntityEin &&
      record.authorizedSignatoryName &&
      record.goodStandingVerified &&
      record.operatingAgreementExecuted,
  );

  const isWireVerified = Boolean(
    record.wireFraudVerified &&
      record.wireVerifiedPhone &&
      record.wireVerifiedWith,
  );

  const isDeedRecorded = Boolean(
    record.deedInstrumentNumber && record.deedRecordingDate,
  );

  const closingDocs = record.closingDocumentSigning || DEFAULT_CLOSING_DOCUMENTS;
  const closingFees = record.closingFeeSettlement || DEFAULT_CLOSING_FEES;
  const possession = record.propertyPossession || DEFAULT_PROPERTY_POSSESSION;

  const isDocsSigned = Boolean(
    closingDocs.mortgageNoteExecuted &&
      closingDocs.deedOfTrustExecuted &&
      closingDocs.settlementStatementExecuted &&
      closingDocs.titleAffidavitsExecuted,
  );

  const isFeesSettled =
    closingFees.feeDisbursementStatus === 'settlement_reconciled' ||
    closingFees.feeDisbursementStatus === 'disbursed_by_escrow';

  const isKeysReceived =
    possession.possessionStatus === 'keys_received' ||
    possession.possessionStatus === 'possession_transferred';

  return (
    <div
      className={cn(
        'w-full rounded-none border border-neutral-800 bg-[#0c0c0c] text-neutral-100 p-4 sm:p-6 md:p-8 space-y-8',
        className,
      )}
      data-testid="legal-ownership-transfer-card"
    >
      {/* Header & Status Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-neutral-300 shrink-0" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Pillar 3: Legal Ownership Transfer
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
            Vesting Entity, Title Curative & Wire Protection
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-2xl leading-relaxed">
            Institutional verification of vesting entity authority, Schedule B title curative exceptions, phone-verified escrow wire fraud protection, and county deed recordation.
          </p>
        </div>

        {/* Milestone Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-none border',
              isVestingComplete
                ? 'border-emerald-800 bg-emerald-950/40 text-emerald-300'
                : 'border-neutral-800 bg-neutral-900 text-neutral-400',
            )}
          >
            {isVestingComplete ? <Check size={12} /> : <WarningCircle size={12} />}
            Vesting: {isVestingComplete ? 'Verified' : 'Pending'}
          </span>

          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-none border',
              isTitleCleared
                ? 'border-emerald-800 bg-emerald-950/40 text-emerald-300'
                : 'border-amber-800 bg-amber-950/40 text-amber-300',
            )}
          >
            {isTitleCleared ? <Check size={12} /> : <WarningCircle size={12} />}
            Title: {isTitleCleared ? 'Cleared' : 'Curative Required'}
          </span>

          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-none border',
              totalItems > 0 && pendingItems === 0
                ? 'border-emerald-800 bg-emerald-950/40 text-emerald-300'
                : 'border-amber-800 bg-amber-950/40 text-amber-300',
            )}
          >
            Title Curative: {clearedItems}/{totalItems} Cleared
          </span>

          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-none border',
              isTitleInsuranceBound
                ? 'border-emerald-800 bg-emerald-950/40 text-emerald-300'
                : 'border-neutral-800 bg-neutral-900 text-neutral-400',
            )}
          >
            <ShieldCheck size={12} />
            Title Ins: {isTitleInsuranceBound ? 'Dual Bound' : 'Pending'}
          </span>

          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-none border',
              isHazardInsuranceBound
                ? 'border-emerald-800 bg-emerald-950/40 text-emerald-300'
                : 'border-amber-800 bg-amber-950/40 text-amber-300',
            )}
          >
            <House size={12} />
            Hazard Ins: {isHazardInsuranceBound ? 'Bound & Loss Payee' : 'Action Required'}
          </span>

          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-none border',
              isWireVerified
                ? 'border-emerald-800 bg-emerald-950/40 text-emerald-300'
                : 'border-amber-800 bg-amber-950/40 text-amber-300',
            )}
          >
            <Lock size={12} />
            Wire Safety: {isWireVerified ? 'Phone Verified' : 'Action Required'}
          </span>

          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-none border',
              isDocsSigned
                ? 'border-emerald-800 bg-emerald-950/40 text-emerald-300'
                : 'border-neutral-800 bg-neutral-900 text-neutral-400',
            )}
          >
            <FileText size={12} />
            Closing Docs: {isDocsSigned ? 'All Executed' : 'Pending'}
          </span>

          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-none border',
              isFeesSettled
                ? 'border-emerald-800 bg-emerald-950/40 text-emerald-300'
                : 'border-neutral-800 bg-neutral-900 text-neutral-400',
            )}
          >
            <CurrencyDollar size={12} />
            Fees: {isFeesSettled ? 'Reconciled' : 'Pending'}
          </span>

          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-none border',
              isKeysReceived
                ? 'border-emerald-800 bg-emerald-950/40 text-emerald-300'
                : 'border-neutral-800 bg-neutral-900 text-neutral-400',
            )}
          >
            <House size={12} />
            Possession: {isKeysReceived ? 'Keys Received' : 'Pending'}
          </span>
        </div>
      </div>

      {/* SECTION 1: Vesting Entity & Authority Verification */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-neutral-900 pb-2">
          <Buildings size={16} className="text-neutral-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
            1. Vesting Entity & Authority Verification
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label
              htmlFor="vesting-entity-name"
              className="block text-xs font-medium text-neutral-300"
            >
              Legal Entity Name
            </label>
            <input
              id="vesting-entity-name"
              type="text"
              value={record.vestingEntityName || ''}
              onChange={(e) => updateField('vestingEntityName', e.target.value)}
              placeholder="e.g. 88 Harbor Lane Investments LLC"
              className="w-full h-11 min-h-[44px] md:h-9 rounded-none border border-neutral-800 bg-neutral-950 px-3 py-2 text-base sm:text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="vesting-entity-state"
              className="block text-xs font-medium text-neutral-300"
            >
              State of Formation
            </label>
            <input
              id="vesting-entity-state"
              type="text"
              value={record.vestingEntityState || ''}
              onChange={(e) => updateField('vestingEntityState', e.target.value)}
              placeholder="e.g. FL, DE, TX"
              className="w-full h-11 min-h-[44px] md:h-9 rounded-none border border-neutral-800 bg-neutral-950 px-3 py-2 text-base sm:text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="vesting-entity-ein"
              className="block text-xs font-medium text-neutral-300"
            >
              Federal EIN
            </label>
            <input
              id="vesting-entity-ein"
              type="text"
              value={record.vestingEntityEin || ''}
              onChange={(e) => updateField('vestingEntityEin', e.target.value)}
              placeholder="e.g. XX-XXX8921"
              className="w-full h-11 min-h-[44px] md:h-9 rounded-none border border-neutral-800 bg-neutral-950 px-3 py-2 text-base sm:text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="authorized-signatory"
              className="block text-xs font-medium text-neutral-300"
            >
              Authorized Signatory Name
            </label>
            <input
              id="authorized-signatory"
              type="text"
              value={record.authorizedSignatoryName || ''}
              onChange={(e) => updateField('authorizedSignatoryName', e.target.value)}
              placeholder="e.g. Jordan Taylor (Managing Member)"
              className="w-full h-11 min-h-[44px] md:h-9 rounded-none border border-neutral-800 bg-neutral-950 px-3 py-2 text-base sm:text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Verification Checkboxes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <label className="min-h-[44px] flex items-center gap-3 p-3 bg-neutral-950 border border-neutral-800 rounded-none cursor-pointer hover:border-neutral-700 transition-colors select-none">
            <input
              type="checkbox"
              checked={Boolean(record.goodStandingVerified)}
              onChange={(e) => updateField('goodStandingVerified', e.target.checked)}
              className="h-5 w-5 rounded-none border-neutral-700 bg-neutral-900 text-neutral-100 accent-neutral-200 cursor-pointer"
            />
            <span className="text-xs text-neutral-200">
              Certificate of Good Standing Verified with Secretary of State
            </span>
          </label>

          <label className="min-h-[44px] flex items-center gap-3 p-3 bg-neutral-950 border border-neutral-800 rounded-none cursor-pointer hover:border-neutral-700 transition-colors select-none">
            <input
              type="checkbox"
              checked={Boolean(record.operatingAgreementExecuted)}
              onChange={(e) => updateField('operatingAgreementExecuted', e.target.checked)}
              className="h-5 w-5 rounded-none border-neutral-700 bg-neutral-900 text-neutral-100 accent-neutral-200 cursor-pointer"
            />
            <span className="text-xs text-neutral-200">
              Operating Agreement & Manager Resolution Executed
            </span>
          </label>
        </div>
      </section>

      {/* SECTION 2: Title Commitment & Schedule B Curative Matrix */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-900 pb-2">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-neutral-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
              2. Title Commitment & Schedule B Curative Matrix
            </h3>
          </div>
          <span className="text-xs text-neutral-400">
            {clearedItems} of {totalItems} items cleared ({totalItems > 0 ? Math.round((clearedItems / totalItems) * 100) : 0}%)
          </span>
        </div>

        {/* Commitment and Underwriter Identifiers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label
              htmlFor="title-commitment-number"
              className="block text-xs font-medium text-neutral-300"
            >
              Title Commitment Number
            </label>
            <input
              id="title-commitment-number"
              type="text"
              value={record.titleCommitmentNumber || ''}
              onChange={(e) => updateField('titleCommitmentNumber', e.target.value)}
              placeholder="e.g. TC-FL-2026-88912"
              className="w-full h-11 min-h-[44px] md:h-9 rounded-none border border-neutral-800 bg-neutral-950 px-3 py-2 text-base sm:text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="title-insurer-name"
              className="block text-xs font-medium text-neutral-300"
            >
              Title Underwriter Name
            </label>
            <input
              id="title-insurer-name"
              type="text"
              value={record.titleInsurer || ''}
              onChange={(e) => updateField('titleInsurer', e.target.value)}
              placeholder="e.g. First American Title Insurance Co"
              className="w-full h-11 min-h-[44px] md:h-9 rounded-none border border-neutral-800 bg-neutral-950 px-3 py-2 text-base sm:text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Clear Property Title: Deed Search & Lien Clearance Panel */}
        <div className="p-4 sm:p-5 bg-neutral-950 border border-neutral-800 rounded-none space-y-4" data-testid="panel-deed-search-clearance">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-900 pb-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-neutral-200">
                Clear Property Title: Deed Search &amp; Lien Clearance
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Hire a title company to run a comprehensive deed search, ensuring there are no liens, judgments, or ownership disputes.
              </p>
            </div>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider rounded-none border shrink-0',
                isTitleCleared
                  ? 'border-emerald-800 bg-emerald-950/40 text-emerald-300'
                  : 'border-amber-800 bg-amber-950/40 text-amber-300',
              )}
            >
              {isTitleCleared ? <Check size={12} /> : <WarningCircle size={12} />}
              <span>{isTitleCleared ? 'Title Cleared' : 'Curative Required'}</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="title-company-search" className="block text-xs font-medium text-neutral-300">
                Title Company
              </label>
              <input
                id="title-company-search"
                type="text"
                value={titleSearch.titleCompanyName || ''}
                onChange={(e) => updateTitleSearch({ titleCompanyName: e.target.value })}
                placeholder="e.g. First American Title"
                className="w-full h-11 min-h-[44px] md:h-9 rounded-none border border-neutral-800 bg-neutral-900 px-3 py-2 text-base sm:text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none transition-colors"
                data-testid="input-title-company-search"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="title-examiner-name" className="block text-xs font-medium text-neutral-300">
                Title Examiner
              </label>
              <input
                id="title-examiner-name"
                type="text"
                value={titleSearch.titleExaminerName || ''}
                onChange={(e) => updateTitleSearch({ titleExaminerName: e.target.value })}
                placeholder="e.g. Marcus Vance"
                className="w-full h-11 min-h-[44px] md:h-9 rounded-none border border-neutral-800 bg-neutral-900 px-3 py-2 text-base sm:text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none transition-colors"
                data-testid="input-title-examiner-name"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="title-search-status" className="block text-xs font-medium text-neutral-300">
                Deed Search Status
              </label>
              <select
                id="title-search-status"
                value={titleSearch.searchStatus}
                onChange={(e) => updateTitleSearch({ searchStatus: e.target.value as TitleSearchRecord['searchStatus'] })}
                className="w-full h-11 min-h-[44px] md:h-9 rounded-none border border-neutral-800 bg-neutral-900 px-3 py-2 text-base sm:text-xs text-neutral-100 focus:border-neutral-400 focus:outline-none transition-colors"
                data-testid="select-title-search-status"
              >
                <option value="search_ordered">Deed Search Ordered</option>
                <option value="in_examination">In Title Examination</option>
                <option value="curative_required">Curative Required</option>
                <option value="title_cleared">Marketable Title Cleared</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="municipal-lien-cert" className="block text-xs font-medium text-neutral-300">
                Municipal Lien Certificate #
              </label>
              <input
                id="municipal-lien-cert"
                type="text"
                value={titleSearch.municipalLienCertificateNumber || ''}
                onChange={(e) => updateTitleSearch({ municipalLienCertificateNumber: e.target.value })}
                placeholder="e.g. MLC-2026-009412"
                className="w-full h-11 min-h-[44px] md:h-9 rounded-none border border-neutral-800 bg-neutral-900 px-3 py-2 text-base sm:text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none transition-colors"
                data-testid="input-municipal-lien-cert"
              />
            </div>
          </div>

          {/* 4 Clearance Verification Checkboxes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <label className="min-h-[44px] flex items-start gap-3 p-3 bg-neutral-900/60 border border-neutral-800 rounded-none cursor-pointer hover:border-neutral-700 transition-colors select-none">
              <input
                type="checkbox"
                checked={Boolean(titleSearch.deedChainVerified)}
                onChange={(e) => updateTitleSearch({ deedChainVerified: e.target.checked })}
                className="h-5 w-5 rounded-none border-neutral-700 bg-neutral-950 text-neutral-100 accent-emerald-500 cursor-pointer mt-0.5"
                data-testid="chk-deed-chain-verified"
              />
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-neutral-200">
                  30-Year Deed Chain Verified
                </span>
                <p className="text-[11px] text-neutral-400">
                  Unbroken continuity of record ownership with zero gaps, probate issues, or wild deeds.
                </p>
              </div>
            </label>

            <label className="min-h-[44px] flex items-start gap-3 p-3 bg-neutral-900/60 border border-neutral-800 rounded-none cursor-pointer hover:border-neutral-700 transition-colors select-none">
              <input
                type="checkbox"
                checked={Boolean(titleSearch.noUnsatisfiedLiens)}
                onChange={(e) => updateTitleSearch({ noUnsatisfiedLiens: e.target.checked })}
                className="h-5 w-5 rounded-none border-neutral-700 bg-neutral-950 text-neutral-100 accent-emerald-500 cursor-pointer mt-0.5"
                data-testid="chk-no-unsatisfied-liens"
              />
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-neutral-200">
                  Zero Unsatisfied Mortgage &amp; Mechanics Liens
                </span>
                <p className="text-[11px] text-neutral-400">
                  Prior mortgages, open contractor claims, and unrecorded mechanics liens verified satisfied.
                </p>
              </div>
            </label>

            <label className="min-h-[44px] flex items-start gap-3 p-3 bg-neutral-900/60 border border-neutral-800 rounded-none cursor-pointer hover:border-neutral-700 transition-colors select-none">
              <input
                type="checkbox"
                checked={Boolean(titleSearch.noTaxOrJudgmentLiens)}
                onChange={(e) => updateTitleSearch({ noTaxOrJudgmentLiens: e.target.checked })}
                className="h-5 w-5 rounded-none border-neutral-700 bg-neutral-950 text-neutral-100 accent-emerald-500 cursor-pointer mt-0.5"
                data-testid="chk-no-tax-judgment-liens"
              />
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-neutral-200">
                  Zero Tax or Civil Judgment Liens
                </span>
                <p className="text-[11px] text-neutral-400">
                  No federal IRS tax warrants, state tax executions, or local civil judgment attachments.
                </p>
              </div>
            </label>

            <label className="min-h-[44px] flex items-start gap-3 p-3 bg-neutral-900/60 border border-neutral-800 rounded-none cursor-pointer hover:border-neutral-700 transition-colors select-none">
              <input
                type="checkbox"
                checked={Boolean(titleSearch.noOwnershipOrBoundaryDisputes)}
                onChange={(e) => updateTitleSearch({ noOwnershipOrBoundaryDisputes: e.target.checked })}
                className="h-5 w-5 rounded-none border-neutral-700 bg-neutral-950 text-neutral-100 accent-emerald-500 cursor-pointer mt-0.5"
                data-testid="chk-no-ownership-boundary-disputes"
              />
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-neutral-200">
                  Zero Ownership or Boundary Disputes
                </span>
                <p className="text-[11px] text-neutral-400">
                  No lis pendens litigation, undisclosed heirship disputes, or property line encroachments.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Interactive Schedule B Items List */}
        <div className="space-y-2 pt-2">
          <div className="text-xs font-medium text-neutral-400">
            Schedule B Requirements & Exceptions
          </div>

          {scheduleItems.length === 0 ? (
            <div className="p-4 border border-dashed border-neutral-800 bg-neutral-950 text-center text-xs text-neutral-500 rounded-none">
              No Schedule B items listed. Add requirements or exceptions below.
            </div>
          ) : (
            <div className="space-y-2">
              {scheduleItems.map((item) => {
                const isCleared = item.status === 'cleared';
                const isRequirement = item.category === 'requirement';

                return (
                  <div
                    key={item.id}
                    className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-neutral-950 border border-neutral-800 rounded-none hover:border-neutral-700 transition-colors"
                  >
                    <div className="flex items-start sm:items-center gap-2.5 flex-1 min-w-0">
                      <span
                        className={cn(
                          'shrink-0 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded-none border',
                          isRequirement
                            ? 'bg-neutral-900 border-neutral-700 text-neutral-200'
                            : 'bg-neutral-900/60 border-neutral-800 text-neutral-400',
                        )}
                      >
                        {item.category}
                      </span>
                      <span className="text-xs sm:text-sm text-neutral-200 leading-normal break-words">
                        {item.item}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleScheduleBStatus(item.id)}
                        className={cn(
                          'min-h-[44px] px-3 py-1.5 text-xs font-semibold rounded-none border transition-colors flex items-center gap-1.5 cursor-pointer',
                          isCleared
                            ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800 hover:bg-emerald-900/50'
                            : 'bg-amber-950/40 text-amber-300 border-amber-800 hover:bg-amber-900/50',
                        )}
                        aria-label={`Toggle clearance status for ${item.item}. Currently ${item.status}.`}
                      >
                        {isCleared ? (
                          <>
                            <Check size={14} className="shrink-0" />
                            <span>Cleared</span>
                          </>
                        ) : (
                          <>
                            <WarningCircle size={14} className="shrink-0" />
                            <span>Pending Clearance</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => removeScheduleBItem(item.id)}
                        className="min-h-[44px] min-w-[44px] p-2 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-900 border border-transparent hover:border-neutral-800 rounded-none transition-colors flex items-center justify-center cursor-pointer"
                        aria-label={`Remove Schedule B item: ${item.item}`}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add Schedule B Item Form */}
        <form
          onSubmit={handleAddScheduleBItem}
          className="p-3 sm:p-4 bg-neutral-950 border border-neutral-800 rounded-none space-y-3"
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Add Schedule B Item
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              placeholder="e.g. Municipal tax certificate paid through closing"
              className="flex-1 h-11 min-h-[44px] md:h-9 rounded-none border border-neutral-800 bg-neutral-900 px-3 py-2 text-base sm:text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none transition-colors"
            />

            <select
              value={newItemCategory}
              onChange={(e) =>
                setNewItemCategory(e.target.value as 'requirement' | 'exception')
              }
              className="h-11 min-h-[44px] md:h-9 rounded-none border border-neutral-800 bg-neutral-900 px-3 py-2 text-base sm:text-xs text-neutral-200 focus:border-neutral-400 focus:outline-none transition-colors"
              aria-label="Schedule B item category"
            >
              <option value="requirement">Requirement</option>
              <option value="exception">Exception</option>
            </select>

            <button
              type="submit"
              disabled={!newItemText.trim()}
              className="h-11 min-h-[44px] md:h-9 px-4 rounded-none bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus size={14} />
              <span>Add Item</span>
            </button>
          </div>
        </form>

        {/* Purchase Title Insurance: Dual Policy Protection Panel */}
        <div className="p-4 sm:p-5 bg-neutral-950 border border-neutral-800 rounded-none space-y-4" data-testid="panel-title-insurance">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-900 pb-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-neutral-200">
                Purchase Title Insurance: Dual Policy Protection
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Acquire both lender&apos;s and owner&apos;s title insurance policies to protect against future ownership claims and hidden defects.
              </p>
            </div>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider rounded-none border shrink-0',
                isTitleInsuranceBound
                  ? 'border-emerald-800 bg-emerald-950/40 text-emerald-300'
                  : 'border-neutral-800 bg-neutral-900 text-neutral-400',
              )}
            >
              {isTitleInsuranceBound ? <Check size={12} /> : <WarningCircle size={12} />}
              <span>{isTitleInsuranceBound ? 'Dual Policies Bound' : 'Policies Pending'}</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Lender's Title Insurance Card */}
            <div className="p-3.5 bg-neutral-900/60 border border-neutral-800 rounded-none space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-200">
                  Lender&apos;s Title Insurance Policy
                </span>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 bg-neutral-800 text-neutral-300 border border-neutral-700">
                  Mandatory for Debt
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Protects the lender against losses from title defects up to the outstanding mortgage loan balance.
              </p>

              <div className="space-y-2">
                <div className="space-y-1">
                  <label htmlFor="lender-policy-num" className="block text-[11px] text-neutral-400">
                    Policy / Binder Number
                  </label>
                  <input
                    id="lender-policy-num"
                    type="text"
                    value={titleInsurance.lenderPolicyNumber || ''}
                    onChange={(e) => updateTitleInsurance({ lenderPolicyNumber: e.target.value })}
                    placeholder="e.g. LP-882190-FA"
                    className="w-full h-11 min-h-[44px] md:h-8 rounded-none border border-neutral-800 bg-neutral-950 px-3 py-1 text-base sm:text-xs text-neutral-100 placeholder:text-neutral-600 focus:border-neutral-400 focus:outline-none"
                    data-testid="input-lender-policy-num"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label htmlFor="lender-coverage-amt" className="block text-[11px] text-neutral-400">
                      Coverage Amount ($)
                    </label>
                    <input
                      id="lender-coverage-amt"
                      type="number"
                      value={titleInsurance.lenderPolicyCoverageAmount || ''}
                      onChange={(e) => updateTitleInsurance({ lenderPolicyCoverageAmount: Number(e.target.value) || 0 })}
                      placeholder="e.g. 294000"
                      className="w-full h-11 min-h-[44px] md:h-8 rounded-none border border-neutral-800 bg-neutral-950 px-3 py-1 text-base sm:text-xs text-neutral-100 focus:border-neutral-400 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="lender-policy-status" className="block text-[11px] text-neutral-400">
                      Policy Status
                    </label>
                    <select
                      id="lender-policy-status"
                      value={titleInsurance.lenderPolicyStatus}
                      onChange={(e) => updateTitleInsurance({ lenderPolicyStatus: e.target.value as TitleInsurancePolicyRecord['lenderPolicyStatus'] })}
                      className="w-full h-11 min-h-[44px] md:h-8 rounded-none border border-neutral-800 bg-neutral-950 px-2 py-1 text-base sm:text-xs text-neutral-100 focus:border-neutral-400 focus:outline-none"
                    >
                      <option value="ordered">Ordered</option>
                      <option value="binder_issued">Binder Issued</option>
                      <option value="policy_issued">Policy Issued</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Owner's Title Insurance Card */}
            <div className="p-3.5 bg-neutral-900/60 border border-neutral-800 rounded-none space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-200">
                  Owner&apos;s Title Insurance Policy
                </span>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 bg-neutral-800 text-neutral-300 border border-neutral-700">
                  Investor Equity Protection
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Protects the investor&apos;s entire equity stake and ownership rights for the full duration of property holding.
              </p>

              <div className="space-y-2">
                <div className="space-y-1">
                  <label htmlFor="owner-policy-num" className="block text-[11px] text-neutral-400">
                    Policy / Binder Number
                  </label>
                  <input
                    id="owner-policy-num"
                    type="text"
                    value={titleInsurance.ownerPolicyNumber || ''}
                    onChange={(e) => updateTitleInsurance({ ownerPolicyNumber: e.target.value })}
                    placeholder="e.g. OP-882191-FA"
                    className="w-full h-11 min-h-[44px] md:h-8 rounded-none border border-neutral-800 bg-neutral-950 px-3 py-1 text-base sm:text-xs text-neutral-100 placeholder:text-neutral-600 focus:border-neutral-400 focus:outline-none"
                    data-testid="input-owner-policy-num"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label htmlFor="owner-coverage-amt" className="block text-[11px] text-neutral-400">
                      Coverage Amount ($)
                    </label>
                    <input
                      id="owner-coverage-amt"
                      type="number"
                      value={titleInsurance.ownerPolicyCoverageAmount || ''}
                      onChange={(e) => updateTitleInsurance({ ownerPolicyCoverageAmount: Number(e.target.value) || 0 })}
                      placeholder="e.g. 392000"
                      className="w-full h-11 min-h-[44px] md:h-8 rounded-none border border-neutral-800 bg-neutral-950 px-3 py-1 text-base sm:text-xs text-neutral-100 focus:border-neutral-400 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="owner-policy-status" className="block text-[11px] text-neutral-400">
                      Policy Status
                    </label>
                    <select
                      id="owner-policy-status"
                      value={titleInsurance.ownerPolicyStatus}
                      onChange={(e) => updateTitleInsurance({ ownerPolicyStatus: e.target.value as TitleInsurancePolicyRecord['ownerPolicyStatus'] })}
                      className="w-full h-11 min-h-[44px] md:h-8 rounded-none border border-neutral-800 bg-neutral-950 px-2 py-1 text-base sm:text-xs text-neutral-100 focus:border-neutral-400 focus:outline-none"
                    >
                      <option value="ordered">Ordered</option>
                      <option value="binder_issued">Binder Issued</option>
                      <option value="policy_issued">Policy Issued</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing & Simultaneous Issue Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div className="space-y-1.5">
              <label htmlFor="total-title-premium" className="block text-xs font-medium text-neutral-300">
                Total Combined Title Premium ($)
              </label>
              <input
                id="total-title-premium"
                type="number"
                value={titleInsurance.totalTitleInsurancePremium || ''}
                onChange={(e) => updateTitleInsurance({ totalTitleInsurancePremium: Number(e.target.value) || 0 })}
                placeholder="e.g. 1850"
                className="w-full h-11 min-h-[44px] md:h-9 rounded-none border border-neutral-800 bg-neutral-900 px-3 py-2 text-base sm:text-xs text-neutral-100 focus:border-neutral-400 focus:outline-none"
                data-testid="input-total-title-premium"
              />
            </div>

            <label className="min-h-[44px] flex items-center gap-3 p-3 bg-neutral-900/60 border border-neutral-800 rounded-none cursor-pointer hover:border-neutral-700 transition-colors select-none">
              <input
                type="checkbox"
                checked={Boolean(titleInsurance.simultaneousIssueDiscount)}
                onChange={(e) => updateTitleInsurance({ simultaneousIssueDiscount: e.target.checked })}
                className="h-5 w-5 rounded-none border-neutral-700 bg-neutral-950 text-neutral-100 accent-emerald-500 cursor-pointer"
                data-testid="chk-simultaneous-issue-discount"
              />
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-neutral-200">
                  Simultaneous Issue Rate Discount Applied
                </span>
                <p className="text-[11px] text-neutral-400">
                  Bundled discount when buying lender and owner policies together.
                </p>
              </div>
            </label>

            <label className="min-h-[44px] flex items-center gap-3 p-3 bg-neutral-900/60 border border-neutral-800 rounded-none cursor-pointer hover:border-neutral-700 transition-colors select-none">
              <input
                type="checkbox"
                checked={Boolean(titleInsurance.policiesBound)}
                onChange={(e) => updateTitleInsurance({ policiesBound: e.target.checked })}
                className="h-5 w-5 rounded-none border-neutral-700 bg-neutral-950 text-neutral-100 accent-emerald-500 cursor-pointer"
                data-testid="chk-title-policies-bound"
              />
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-neutral-200">
                  Title Policies Bound with Underwriter
                </span>
                <p className="text-[11px] text-neutral-400">
                  Closing protection letter and title insurance binders issued.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Secure Property Insurance: Hazard & Landlord Binder Panel */}
        <div className="p-4 sm:p-5 bg-neutral-950 border border-neutral-800 rounded-none space-y-4" data-testid="panel-property-insurance">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-900 pb-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-neutral-200">
                Secure Property Insurance: Hazard &amp; Landlord Binder
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Bind a landlord or homeowners insurance policy, which lenders require prior to funding.
              </p>
            </div>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider rounded-none border shrink-0',
                isHazardInsuranceBound
                  ? 'border-emerald-800 bg-emerald-950/40 text-emerald-300'
                  : 'border-amber-800 bg-amber-950/40 text-amber-300',
              )}
            >
              {isHazardInsuranceBound ? <Check size={12} /> : <WarningCircle size={12} />}
              <span>{isHazardInsuranceBound ? 'Insurance Bound' : 'Binding Required'}</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="insurance-carrier" className="block text-xs font-medium text-neutral-300">
                Insurance Carrier
              </label>
              <input
                id="insurance-carrier"
                type="text"
                value={propertyInsurance.insuranceCarrier || ''}
                onChange={(e) => updatePropertyInsurance({ insuranceCarrier: e.target.value })}
                placeholder="e.g. Steadily / Travelers"
                className="w-full h-11 min-h-[44px] md:h-9 rounded-none border border-neutral-800 bg-neutral-900 px-3 py-2 text-base sm:text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none"
                data-testid="input-insurance-carrier"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="insurance-policy-type" className="block text-xs font-medium text-neutral-300">
                Policy Form Type
              </label>
              <select
                id="insurance-policy-type"
                value={propertyInsurance.policyType}
                onChange={(e) => updatePropertyInsurance({ policyType: e.target.value as PropertyInsuranceBinderRecord['policyType'] })}
                className="w-full h-11 min-h-[44px] md:h-9 rounded-none border border-neutral-800 bg-neutral-900 px-3 py-2 text-base sm:text-xs text-neutral-100 focus:border-neutral-400 focus:outline-none"
                data-testid="select-insurance-policy-type"
              >
                <option value="landlord_dp3">Landlord Policy (DP-3)</option>
                <option value="homeowners_ho3">Homeowners Policy (HO-3)</option>
                <option value="builders_risk">Builder&apos;s Risk / Renovation</option>
                <option value="commercial_property">Commercial Property</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="insurance-binder-number" className="block text-xs font-medium text-neutral-300">
                Policy / Binder Number
              </label>
              <input
                id="insurance-binder-number"
                type="text"
                value={propertyInsurance.binderNumber || ''}
                onChange={(e) => updatePropertyInsurance({ binderNumber: e.target.value })}
                placeholder="e.g. BND-2026-99120"
                className="w-full h-11 min-h-[44px] md:h-9 rounded-none border border-neutral-800 bg-neutral-900 px-3 py-2 text-base sm:text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none"
                data-testid="input-insurance-binder-num"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="insurance-status" className="block text-xs font-medium text-neutral-300">
                Binding Status
              </label>
              <select
                id="insurance-status"
                value={propertyInsurance.status}
                onChange={(e) => updatePropertyInsurance({ status: e.target.value as PropertyInsuranceBinderRecord['status'] })}
                className="w-full h-11 min-h-[44px] md:h-9 rounded-none border border-neutral-800 bg-neutral-900 px-3 py-2 text-base sm:text-xs text-neutral-100 focus:border-neutral-400 focus:outline-none"
              >
                <option value="quote_received">Quote Received</option>
                <option value="bound">Policy Bound</option>
                <option value="paid">Premium Paid</option>
                <option value="dec_page_issued">Declaration Page Issued</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="dwelling-coverage-amt" className="block text-xs font-medium text-neutral-300">
                Dwelling Coverage ($)
              </label>
              <input
                id="dwelling-coverage-amt"
                type="number"
                value={propertyInsurance.dwellingCoverageAmount || ''}
                onChange={(e) => updatePropertyInsurance({ dwellingCoverageAmount: Number(e.target.value) || 0 })}
                placeholder="e.g. 350000"
                className="w-full h-11 min-h-[44px] md:h-9 rounded-none border border-neutral-800 bg-neutral-900 px-3 py-2 text-base sm:text-xs text-neutral-100 focus:border-neutral-400 focus:outline-none"
                data-testid="input-dwelling-coverage"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="liability-coverage-amt" className="block text-xs font-medium text-neutral-300">
                General Liability ($)
              </label>
              <input
                id="liability-coverage-amt"
                type="number"
                value={propertyInsurance.liabilityCoverageAmount || ''}
                onChange={(e) => updatePropertyInsurance({ liabilityCoverageAmount: Number(e.target.value) || 0 })}
                placeholder="e.g. 1000000"
                className="w-full h-11 min-h-[44px] md:h-9 rounded-none border border-neutral-800 bg-neutral-900 px-3 py-2 text-base sm:text-xs text-neutral-100 focus:border-neutral-400 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="deductible-amt" className="block text-xs font-medium text-neutral-300">
                Deductible ($)
              </label>
              <input
                id="deductible-amt"
                type="number"
                value={propertyInsurance.deductibleAmount || ''}
                onChange={(e) => updatePropertyInsurance({ deductibleAmount: Number(e.target.value) || 0 })}
                placeholder="e.g. 2500"
                className="w-full h-11 min-h-[44px] md:h-9 rounded-none border border-neutral-800 bg-neutral-900 px-3 py-2 text-base sm:text-xs text-neutral-100 focus:border-neutral-400 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="annual-premium-amt" className="block text-xs font-medium text-neutral-300">
                Annual Premium ($)
              </label>
              <input
                id="annual-premium-amt"
                type="number"
                value={propertyInsurance.annualPremium || ''}
                onChange={(e) => updatePropertyInsurance({ annualPremium: Number(e.target.value) || 0 })}
                placeholder="e.g. 2150"
                className="w-full h-11 min-h-[44px] md:h-9 rounded-none border border-neutral-800 bg-neutral-900 px-3 py-2 text-base sm:text-xs text-neutral-100 focus:border-neutral-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Lender Loss Payee Clause Condition Precedent */}
          <div className="p-3.5 bg-neutral-900/60 border border-neutral-800 rounded-none space-y-3">
            <label className="min-h-[44px] flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={Boolean(propertyInsurance.lenderLossPayeeEndorsed)}
                onChange={(e) => updatePropertyInsurance({ lenderLossPayeeEndorsed: e.target.checked })}
                className="h-5 w-5 rounded-none border-neutral-700 bg-neutral-950 text-neutral-100 accent-emerald-500 cursor-pointer mt-0.5"
                data-testid="chk-lender-loss-payee"
              />
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-neutral-200">
                  Lender Loss Payee &amp; Mortgagee Clause Endorsement Verified
                </span>
                <p className="text-[11px] text-neutral-400">
                  Mandatory condition precedent for loan funding: Lender must be named as First Mortgagee / Loss Payee on the insurance binder.
                </p>
              </div>
            </label>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-neutral-800/80 text-[11px] text-neutral-400">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(propertyInsurance.floodInsuranceRequired)}
                  onChange={(e) => updatePropertyInsurance({ floodInsuranceRequired: e.target.checked })}
                  className="h-4 w-4 rounded-none border-neutral-700 bg-neutral-950 text-neutral-100 accent-emerald-500 cursor-pointer"
                  data-testid="chk-flood-insurance-required"
                />
                <span>FEMA Flood Zone Determination (Separate Flood Policy Required)</span>
              </label>

              {propertyInsurance.floodInsuranceRequired && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(propertyInsurance.floodInsuranceBound)}
                    onChange={(e) => updatePropertyInsurance({ floodInsuranceBound: e.target.checked })}
                    className="h-4 w-4 rounded-none border-neutral-700 bg-neutral-950 text-neutral-100 accent-emerald-500 cursor-pointer"
                    data-testid="chk-flood-insurance-bound"
                  />
                  <span className="text-emerald-400 font-medium">Flood Policy Bound</span>
                </label>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: Wire Fraud Protection Protocol & Escrow Wire Authorization */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-neutral-900 pb-2">
          <Lock size={16} className="text-neutral-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
            3. Wire Fraud Protection Protocol & Escrow Wire Authorization
          </h3>
        </div>

        {/* Critical Institutional Security Banner */}
        <div className="border border-amber-600/40 bg-amber-950/20 p-4 sm:p-5 rounded-none space-y-4">
          <div className="flex items-start gap-3">
            <WarningCircle size={20} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs sm:text-sm font-semibold text-amber-200 uppercase tracking-wide">
                Institutional Wire Fraud Prevention Protocol
              </h4>
              <p className="text-xs sm:text-sm text-amber-300/90 leading-relaxed font-medium">
                Wire fraud prevention: Title wire instructions must be verified by phone using independently confirmed contact details before transmitting funds.
              </p>
            </div>
          </div>

          <label className="min-h-[44px] flex items-center gap-3 p-3 bg-neutral-950/90 border border-amber-800/60 rounded-none cursor-pointer hover:border-amber-700 transition-colors select-none">
            <input
              type="checkbox"
              checked={Boolean(record.wireFraudVerified)}
              onChange={(e) => updateField('wireFraudVerified', e.target.checked)}
              className="h-5 w-5 rounded-none border-amber-700 bg-neutral-900 text-neutral-100 accent-amber-400 cursor-pointer"
            />
            <span className="text-xs sm:text-sm font-medium text-amber-100">
              Wire Instructions Independently Verified by Phone with Title Officer
            </span>
          </label>
        </div>

        {/* Wire Authorization Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label
              htmlFor="wire-verified-phone"
              className="block text-xs font-medium text-neutral-300"
            >
              Verified Title Phone Number
            </label>
            <input
              id="wire-verified-phone"
              type="text"
              value={record.wireVerifiedPhone || ''}
              onChange={(e) => updateField('wireVerifiedPhone', e.target.value)}
              placeholder="e.g. (813) 555-0144"
              className="w-full h-11 min-h-[44px] md:h-9 rounded-none border border-neutral-800 bg-neutral-950 px-3 py-2 text-base sm:text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="wire-verified-with"
              className="block text-xs font-medium text-neutral-300"
            >
              Verified Escrow Officer Name
            </label>
            <input
              id="wire-verified-with"
              type="text"
              value={record.wireVerifiedWith || ''}
              onChange={(e) => updateField('wireVerifiedWith', e.target.value)}
              placeholder="e.g. Sarah Jenkins"
              className="w-full h-11 min-h-[44px] md:h-9 rounded-none border border-neutral-800 bg-neutral-950 px-3 py-2 text-base sm:text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="outgoing-wire-reference"
              className="block text-xs font-medium text-neutral-300"
            >
              Outgoing Fed Wire Reference Number
            </label>
            <input
              id="outgoing-wire-reference"
              type="text"
              value={record.outgoingWireReference || ''}
              onChange={(e) => updateField('outgoingWireReference', e.target.value)}
              placeholder="e.g. FED-WIRE-2026-99214"
              className="w-full h-11 min-h-[44px] md:h-9 rounded-none border border-neutral-800 bg-neutral-950 px-3 py-2 text-base sm:text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="wire-verified-date"
              className="block text-xs font-medium text-neutral-300"
            >
              Verification Date
            </label>
            <input
              id="wire-verified-date"
              type="date"
              value={record.wireVerifiedDate || ''}
              onChange={(e) => updateField('wireVerifiedDate', e.target.value)}
              className="w-full h-11 min-h-[44px] md:h-9 rounded-none border border-neutral-800 bg-neutral-950 px-3 py-2 text-base sm:text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none transition-colors"
            />
          </div>
        </div>
      </section>

      {/* SECTION 4: County Deed Recordation */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-900 pb-2">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-neutral-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
              4. County Deed Recordation
            </h3>
          </div>
          {isDeedRecorded && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-medium rounded-none border border-emerald-800 bg-emerald-950/40 text-emerald-300">
              <Check size={12} />
              Title Conveyance Recorded with County
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label
              htmlFor="deed-instrument-number"
              className="block text-xs font-medium text-neutral-300"
            >
              County Recording Document / Instrument #
            </label>
            <input
              id="deed-instrument-number"
              type="text"
              value={record.deedInstrumentNumber || ''}
              onChange={(e) => updateField('deedInstrumentNumber', e.target.value)}
              placeholder="e.g. DOC-2026-089412"
              className="w-full h-11 min-h-[44px] md:h-9 rounded-none border border-neutral-800 bg-neutral-950 px-3 py-2 text-base sm:text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="deed-recording-date"
              className="block text-xs font-medium text-neutral-300"
            >
              Formal Deed Recording Date
            </label>
            <input
              id="deed-recording-date"
              type="date"
              value={record.deedRecordingDate || ''}
              onChange={(e) => updateField('deedRecordingDate', e.target.value)}
              className="w-full h-11 min-h-[44px] md:h-9 rounded-none border border-neutral-800 bg-neutral-950 px-3 py-2 text-base sm:text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none transition-colors"
            />
          </div>
        </div>
      </section>

      {/* SECTION 5: Closing Document Execution Package */}
      <section className="space-y-4" data-testid="section-closing-documents">
        <div className="flex items-center justify-between border-b border-neutral-900 pb-2">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-neutral-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
              5. Closing Document Execution Package
            </h3>
          </div>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-medium rounded-none border',
              isDocsSigned
                ? 'border-emerald-800 bg-emerald-950/40 text-emerald-300'
                : 'border-amber-800 bg-amber-950/40 text-amber-300',
            )}
          >
            {isDocsSigned ? <Check size={12} /> : <WarningCircle size={12} />}
            <span>
              {isDocsSigned ? 'Package Fully Executed' : 'Execution In Progress'}
            </span>
          </span>
        </div>

        <p className="text-xs text-neutral-400">
          Execute and notarize core legal instruments securing the debt covenant, property collateral pledge, certified settlement allocations, and statutory compliance affidavits.
        </p>

        {/* 4 Interactive Legal Document Checkboxes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="min-h-[44px] flex items-start gap-3 p-3.5 bg-neutral-950 border border-neutral-800 rounded-none cursor-pointer hover:border-neutral-700 transition-colors select-none">
            <input
              type="checkbox"
              checked={Boolean(closingDocs.mortgageNoteExecuted)}
              onChange={(e) =>
                updateClosingDocs({ mortgageNoteExecuted: e.target.checked })
              }
              className="h-5 w-5 mt-0.5 rounded-none border-neutral-700 bg-neutral-900 text-neutral-100 accent-neutral-200 cursor-pointer shrink-0"
              data-testid="chk-mortgage-note"
            />
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-neutral-200 block">
                Promissory / Mortgage Note Executed
              </span>
              <span className="text-[11px] text-neutral-400 leading-normal block">
                Legal debt covenant ratifying loan principal, interest terms, repayment maturity, and default covenants.
              </span>
            </div>
          </label>

          <label className="min-h-[44px] flex items-start gap-3 p-3.5 bg-neutral-950 border border-neutral-800 rounded-none cursor-pointer hover:border-neutral-700 transition-colors select-none">
            <input
              type="checkbox"
              checked={Boolean(closingDocs.deedOfTrustExecuted)}
              onChange={(e) =>
                updateClosingDocs({ deedOfTrustExecuted: e.target.checked })
              }
              className="h-5 w-5 mt-0.5 rounded-none border-neutral-700 bg-neutral-900 text-neutral-100 accent-neutral-200 cursor-pointer shrink-0"
              data-testid="chk-deed-of-trust"
            />
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-neutral-200 block">
                Deed of Trust / Security Instrument Executed
              </span>
              <span className="text-[11px] text-neutral-400 leading-normal block">
                Real property security pledge granting the lienholder priority security interest in the underlying estate.
              </span>
            </div>
          </label>

          <label className="min-h-[44px] flex items-start gap-3 p-3.5 bg-neutral-950 border border-neutral-800 rounded-none cursor-pointer hover:border-neutral-700 transition-colors select-none">
            <input
              type="checkbox"
              checked={Boolean(closingDocs.settlementStatementExecuted)}
              onChange={(e) =>
                updateClosingDocs({ settlementStatementExecuted: e.target.checked })
              }
              className="h-5 w-5 mt-0.5 rounded-none border-neutral-700 bg-neutral-900 text-neutral-100 accent-neutral-200 cursor-pointer shrink-0"
              data-testid="chk-settlement-statement"
            />
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-neutral-200 block">
                Settlement Statement (ALTA / HUD-1) Executed
              </span>
              <span className="text-[11px] text-neutral-400 leading-normal block">
                Certified buyer, seller, and lender statement itemizing purchase credits, debits, and net proceeds.
              </span>
            </div>
          </label>

          <label className="min-h-[44px] flex items-start gap-3 p-3.5 bg-neutral-950 border border-neutral-800 rounded-none cursor-pointer hover:border-neutral-700 transition-colors select-none">
            <input
              type="checkbox"
              checked={Boolean(closingDocs.titleAffidavitsExecuted)}
              onChange={(e) =>
                updateClosingDocs({ titleAffidavitsExecuted: e.target.checked })
              }
              className="h-5 w-5 mt-0.5 rounded-none border-neutral-700 bg-neutral-900 text-neutral-100 accent-neutral-200 cursor-pointer shrink-0"
              data-testid="chk-title-affidavits"
            />
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-neutral-200 block">
                Title & Escrow Compliance Affidavits Executed
              </span>
              <span className="text-[11px] text-neutral-400 leading-normal block">
                FIRPTA non-foreign status certification, owner-occupancy affidavit, gap indemnity, and continuous marriage filings.
              </span>
            </div>
          </label>
        </div>

        {/* Notary & Signing Protocol Details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div className="space-y-1.5">
            <label
              htmlFor="signing-method-select"
              className="block text-xs font-medium text-neutral-300"
            >
              Execution / Notarization Method
            </label>
            <select
              id="signing-method-select"
              value={closingDocs.signingMethod}
              onChange={(e) =>
                updateClosingDocs({
                  signingMethod: e.target.value as ClosingDocumentSigningRecord['signingMethod'],
                })
              }
              className="w-full h-11 min-h-[44px] md:h-9 rounded-none border border-neutral-800 bg-neutral-950 px-3 py-2 text-base sm:text-xs text-neutral-100 focus:border-neutral-400 focus:outline-none transition-colors"
            >
              <option value="remote_online_notary">Remote Online Notarization (RON)</option>
              <option value="mobile_notary">Mobile Notary (On-Site Signing)</option>
              <option value="in_person_title">In-Person Title Agency Closing</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="notary-name-input"
              className="block text-xs font-medium text-neutral-300"
            >
              Commissioned Notary Public / Officer
            </label>
            <input
              id="notary-name-input"
              type="text"
              value={closingDocs.notaryName || ''}
              onChange={(e) => updateClosingDocs({ notaryName: e.target.value })}
              placeholder="e.g. Claire Patterson, Commission #FL-882190"
              className="w-full h-11 min-h-[44px] md:h-9 rounded-none border border-neutral-800 bg-neutral-950 px-3 py-2 text-base sm:text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="signing-completed-at-input"
              className="block text-xs font-medium text-neutral-300"
            >
              Execution Timestamp
            </label>
            <input
              id="signing-completed-at-input"
              type="text"
              value={closingDocs.signingCompletedAt || ''}
              onChange={(e) =>
                updateClosingDocs({ signingCompletedAt: e.target.value })
              }
              placeholder="e.g. 2026-08-14 15:30:00"
              className="w-full h-11 min-h-[44px] md:h-9 rounded-none border border-neutral-800 bg-neutral-950 px-3 py-2 text-base sm:text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none transition-colors"
            />
          </div>
        </div>
      </section>

      {/* SECTION 6: Itemized Closing Fee Settlement Ledger */}
      <section className="space-y-4" data-testid="section-closing-fees">
        <div className="flex items-center justify-between border-b border-neutral-900 pb-2">
          <div className="flex items-center gap-2">
            <CurrencyDollar size={16} className="text-neutral-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
              6. Itemized Closing Fee Settlement Ledger
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-white px-2 py-0.5 bg-neutral-900 border border-neutral-800 rounded-none">
              Total: ${(closingFees.totalClosingFees || 0).toLocaleString('en-US')}
            </span>
          </div>
        </div>

        <p className="text-xs text-neutral-400">
          Reconcile itemized disbursements for lender origination charges, title settlement guarantees, municipal tax prorations, and recording fees prior to escrow disbursement.
        </p>

        {/* 4 Itemized Numeric Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label
              htmlFor="lender-origination-fees"
              className="block text-xs font-medium text-neutral-300"
            >
              Lender Origination & Underwriting ($)
            </label>
            <input
              id="lender-origination-fees"
              type="number"
              min="0"
              step="1"
              value={closingFees.lenderOriginationFees || ''}
              onChange={(e) =>
                updateFeeSettlement({
                  lenderOriginationFees: Number(e.target.value) || 0,
                })
              }
              placeholder="e.g. 2940"
              className="w-full h-11 min-h-[44px] md:h-9 rounded-none border border-neutral-800 bg-neutral-950 px-3 py-2 text-base sm:text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="title-settlement-fees"
              className="block text-xs font-medium text-neutral-300"
            >
              Title Examination & Escrow Settlement ($)
            </label>
            <input
              id="title-settlement-fees"
              type="number"
              min="0"
              step="1"
              value={closingFees.titleAndSettlementFees || ''}
              onChange={(e) =>
                updateFeeSettlement({
                  titleAndSettlementFees: Number(e.target.value) || 0,
                })
              }
              placeholder="e.g. 1850"
              className="w-full h-11 min-h-[44px] md:h-9 rounded-none border border-neutral-800 bg-neutral-950 px-3 py-2 text-base sm:text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="escrow-taxes-prepaids"
              className="block text-xs font-medium text-neutral-300"
            >
              Escrow Taxes & Insurance Prepaids ($)
            </label>
            <input
              id="escrow-taxes-prepaids"
              type="number"
              min="0"
              step="1"
              value={closingFees.escrowTaxesAndPrepaids || ''}
              onChange={(e) =>
                updateFeeSettlement({
                  escrowTaxesAndPrepaids: Number(e.target.value) || 0,
                })
              }
              placeholder="e.g. 2450"
              className="w-full h-11 min-h-[44px] md:h-9 rounded-none border border-neutral-800 bg-neutral-950 px-3 py-2 text-base sm:text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="government-recording-charges"
              className="block text-xs font-medium text-neutral-300"
            >
              Government Recording & Transfer Taxes ($)
            </label>
            <input
              id="government-recording-charges"
              type="number"
              min="0"
              step="1"
              value={closingFees.governmentRecordingCharges || ''}
              onChange={(e) =>
                updateFeeSettlement({
                  governmentRecordingCharges: Number(e.target.value) || 0,
                })
              }
              placeholder="e.g. 600"
              className="w-full h-11 min-h-[44px] md:h-9 rounded-none border border-neutral-800 bg-neutral-950 px-3 py-2 text-base sm:text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Disbursement Status & Reference Details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div className="space-y-1.5">
            <label
              htmlFor="fee-disbursement-status"
              className="block text-xs font-medium text-neutral-300"
            >
              Disbursement Settlement Status
            </label>
            <select
              id="fee-disbursement-status"
              value={closingFees.feeDisbursementStatus}
              onChange={(e) =>
                updateFeeSettlement({
                  feeDisbursementStatus: e.target.value as ClosingFeeSettlementRecord['feeDisbursementStatus'],
                })
              }
              className="w-full h-11 min-h-[44px] md:h-9 rounded-none border border-neutral-800 bg-neutral-950 px-3 py-2 text-base sm:text-xs text-neutral-100 focus:border-neutral-400 focus:outline-none transition-colors"
            >
              <option value="pending_disbursement">Pending Wire Clearance</option>
              <option value="disbursed_by_escrow">Disbursed by Escrow Agent</option>
              <option value="settlement_reconciled">Settlement Reconciled & Audited</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="escrow-disbursement-ref"
              className="block text-xs font-medium text-neutral-300"
            >
              Escrow Disbursement Reference ID
            </label>
            <input
              id="escrow-disbursement-ref"
              type="text"
              value={closingFees.escrowDisbursementReference || ''}
              onChange={(e) =>
                updateFeeSettlement({ escrowDisbursementReference: e.target.value })
              }
              placeholder="e.g. ESCROW-DISB-88912"
              className="w-full h-11 min-h-[44px] md:h-9 rounded-none border border-neutral-800 bg-neutral-950 px-3 py-2 text-base sm:text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="fee-disbursed-date"
              className="block text-xs font-medium text-neutral-300"
            >
              Settlement Disbursement Date
            </label>
            <input
              id="fee-disbursed-date"
              type="date"
              value={closingFees.disbursedAt || ''}
              onChange={(e) => updateFeeSettlement({ disbursedAt: e.target.value })}
              className="w-full h-11 min-h-[44px] md:h-9 rounded-none border border-neutral-800 bg-neutral-950 px-3 py-2 text-base sm:text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none transition-colors"
            />
          </div>
        </div>
      </section>

      {/* SECTION 7: Property Keys Receipt & Physical Possession Handover */}
      <section className="space-y-4" data-testid="section-property-possession">
        <div className="flex items-center justify-between border-b border-neutral-900 pb-2">
          <div className="flex items-center gap-2">
            <House size={16} className="text-neutral-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
              7. Property Keys Receipt & Physical Possession Handover
            </h3>
          </div>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-medium rounded-none border',
              isKeysReceived
                ? 'border-emerald-800 bg-emerald-950/40 text-emerald-300'
                : 'border-amber-800 bg-amber-950/40 text-amber-300',
            )}
          >
            {isKeysReceived ? <Check size={12} /> : <WarningCircle size={12} />}
            <span>{isKeysReceived ? 'Possession Confirmed' : 'Possession Pending'}</span>
          </span>
        </div>

        <p className="text-xs text-neutral-400">
          Document legal and physical possession transfer following official deed recordation. Capture master lockbox codes, title handover receipts, and security rekeying.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label
              htmlFor="possession-status-select"
              className="block text-xs font-medium text-neutral-300"
            >
              Possession Status
            </label>
            <select
              id="possession-status-select"
              value={possession.possessionStatus}
              onChange={(e) =>
                updatePropertyPossession({
                  possessionStatus: e.target.value as PropertyPossessionRecord['possessionStatus'],
                })
              }
              className="w-full h-11 min-h-[44px] md:h-9 rounded-none border border-neutral-800 bg-neutral-950 px-3 py-2 text-base sm:text-xs text-neutral-100 focus:border-neutral-400 focus:outline-none transition-colors"
            >
              <option value="pending_recording">Awaiting County Recordation</option>
              <option value="possession_transferred">Legal Possession Transferred</option>
              <option value="keys_received">Physical Keys & Possession Received</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="key-delivery-method-select"
              className="block text-xs font-medium text-neutral-300"
            >
              Key Handover Protocol
            </label>
            <select
              id="key-delivery-method-select"
              value={possession.keyDeliveryMethod}
              onChange={(e) =>
                updatePropertyPossession({
                  keyDeliveryMethod: e.target.value as PropertyPossessionRecord['keyDeliveryMethod'],
                })
              }
              className="w-full h-11 min-h-[44px] md:h-9 rounded-none border border-neutral-800 bg-neutral-950 px-3 py-2 text-base sm:text-xs text-neutral-100 focus:border-neutral-400 focus:outline-none transition-colors"
            >
              <option value="lockbox_code">Master Lockbox Code</option>
              <option value="title_handover">Direct Handover at Title Office</option>
              <option value="onsite_super_seller">On-Site Exchange with Seller / Super</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="lockbox-code-input"
              className="block text-xs font-medium text-neutral-300"
            >
              Master Lockbox Code
            </label>
            <input
              id="lockbox-code-input"
              type="text"
              value={possession.lockboxCode || ''}
              onChange={(e) => updatePropertyPossession({ lockboxCode: e.target.value })}
              placeholder="e.g. 4821"
              className="w-full h-11 min-h-[44px] md:h-9 rounded-none border border-neutral-800 bg-neutral-950 px-3 py-2 text-base sm:text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="possession-date-input"
              className="block text-xs font-medium text-neutral-300"
            >
              Possession Effective Date
            </label>
            <input
              id="possession-date-input"
              type="date"
              value={possession.possessionEffectiveDate || ''}
              onChange={(e) =>
                updatePropertyPossession({ possessionEffectiveDate: e.target.value })
              }
              className="w-full h-11 min-h-[44px] md:h-9 rounded-none border border-neutral-800 bg-neutral-950 px-3 py-2 text-base sm:text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label
              htmlFor="lockbox-location-input"
              className="block text-xs font-medium text-neutral-300"
            >
              Lockbox Secure Location & Access Directions
            </label>
            <input
              id="lockbox-location-input"
              type="text"
              value={possession.lockboxLocation || ''}
              onChange={(e) =>
                updatePropertyPossession({ lockboxLocation: e.target.value })
              }
              placeholder="e.g. Water meter pipe on left side of porch"
              className="w-full h-11 min-h-[44px] md:h-9 rounded-none border border-neutral-800 bg-neutral-950 px-3 py-2 text-base sm:text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="possession-confirmed-by-input"
              className="block text-xs font-medium text-neutral-300"
            >
              Possession Confirmed By (Lead Investor / PM)
            </label>
            <input
              id="possession-confirmed-by-input"
              type="text"
              value={possession.possessionConfirmedBy || ''}
              onChange={(e) =>
                updatePropertyPossession({ possessionConfirmedBy: e.target.value })
              }
              placeholder="e.g. Jordan Taylor (Lead Investor)"
              className="w-full h-11 min-h-[44px] md:h-9 rounded-none border border-neutral-800 bg-neutral-950 px-3 py-2 text-base sm:text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Rekeying Completed Checkbox */}
        <div className="pt-2">
          <label className="min-h-[44px] flex items-center gap-3 p-3.5 bg-neutral-950 border border-neutral-800 rounded-none cursor-pointer hover:border-neutral-700 transition-colors select-none">
            <input
              type="checkbox"
              checked={Boolean(possession.rekeyCompleted)}
              onChange={(e) =>
                updatePropertyPossession({ rekeyCompleted: e.target.checked })
              }
              className="h-5 w-5 rounded-none border-neutral-700 bg-neutral-900 text-neutral-100 accent-neutral-200 cursor-pointer shrink-0"
              data-testid="chk-rekey-completed"
            />
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-neutral-200 block">
                Deadbolt Rekeying & Access Codes Replaced
              </span>
              <span className="text-[11px] text-neutral-400 leading-normal block">
                Front, side, and rear entry locks rekeyed immediately upon taking possession for site integrity and contractor dispatch.
              </span>
            </div>
          </label>
        </div>
      </section>

      {/* SECTION 8: Closing Ceremony & Bridge to HOLD */}
      <section className="pt-4 border-t border-neutral-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-neutral-900/60 border border-neutral-800 rounded-none">
          <div className="space-y-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Closing Ceremony & Advance to Hold Phase
            </h4>
            <p className="text-xs text-neutral-400">
              When deed recordation and wire verification are confirmed, finalize the transaction, compile the Closing Binder, and transition to active operations.
            </p>
          </div>
          <button
            type="button"
            onClick={onFinalizeClosing}
            disabled={!Boolean(record.wireFraudVerified && record.deedInstrumentNumber && record.deedRecordingDate)}
            data-testid="finalize-closing-advance-btn"
            className={cn(
              'min-h-[44px] px-5 py-2.5 rounded-none font-semibold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shrink-0',
              record.wireFraudVerified && record.deedInstrumentNumber && record.deedRecordingDate
                ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-950/40 cursor-pointer'
                : 'bg-neutral-800 text-neutral-500 border border-neutral-700 cursor-not-allowed opacity-60',
            )}
          >
            <ShieldCheck size={16} />
            <span>Finalize Closing & Advance to Hold →</span>
          </button>
        </div>
        {(!record.wireFraudVerified || !record.deedInstrumentNumber || !record.deedRecordingDate) && (
          <p className="text-[11px] text-amber-400/90 flex items-center gap-1.5">
            <WarningCircle size={14} className="shrink-0" />
            <span>Requires verified phone wire confirmation and county deed recording details above.</span>
          </p>
        )}
      </section>

      {/* Save Action & Feedback */}
      <div className="pt-4 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          {saveSuccessMessage && (
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
              <Check size={14} />
              <span>{saveSuccessMessage}</span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleSave}
          data-testid="save-legal-transfer-btn"
          className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-none bg-neutral-100 text-neutral-950 font-semibold text-xs sm:text-sm hover:bg-white active:bg-neutral-200 transition-colors focus:outline-none focus:ring-1 focus:ring-neutral-400 flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Check size={16} />
          <span>Save Legal Transfer Records</span>
        </button>
      </div>
    </div>
  );
}

export { LegalOwnershipTransferCard };
