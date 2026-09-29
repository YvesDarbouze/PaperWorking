'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { formatCurrency } from '@/lib/projects/phase-utils';
import type {
  ProjectFundingTerms,
  ValuationVerificationRecord,
  PropertyInspectionIssue,
  PropertyInspectionDetails,
  FinalWalkThroughRecord,
} from '@/lib/projects/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  ShieldCheck,
  WarningCircle,
  Check,
  FileText,
  Buildings,
  CurrencyDollar,
  Calendar,
  Plus,
  X,
  Handshake,
} from '@/components/icons/PhosphorIcons';

export interface PropertyConditionValuationCardProps {
  funding: ProjectFundingTerms;
  purchasePrice: number;
  onUpdateFunding: (updated: ProjectFundingTerms) => void;
  className?: string;
}

export function PropertyConditionValuationCard({
  funding,
  purchasePrice,
  onUpdateFunding,
  className = '',
}: PropertyConditionValuationCardProps) {
  const verification = funding.valuationVerification;

  // 1. Appraisal Order & Valuation State
  const [appraisedValue, setAppraisedValue] = useState<number>(() => {
    if (verification?.appraisedValue !== undefined) return verification.appraisedValue;
    return purchasePrice > 0 ? purchasePrice : 0;
  });

  const [appraisalCompany, setAppraisalCompany] = useState<string>(
    verification?.appraisalCompany ?? 'CBRE Valuation Services',
  );

  const [appraisalDate, setAppraisalDate] = useState<string>(
    verification?.appraisalDate ?? new Date().toISOString().split('T')[0],
  );

  const [appraisalOrderedDate, setAppraisalOrderedDate] = useState<string>(
    verification?.appraisalOrderedDate ?? '',
  );

  const [appraisalOrderStatus, setAppraisalOrderStatus] = useState<
    'pending_order' | 'ordered_by_lender' | 'inspection_scheduled' | 'report_received' | 'under_review'
  >(verification?.appraisalOrderStatus ?? 'report_received');

  const [appraisalTargetDeliveryDate, setAppraisalTargetDeliveryDate] = useState<string>(
    verification?.appraisalTargetDeliveryDate ?? '',
  );

  const [appraisalFeeAmount, setAppraisalFeeAmount] = useState<number>(
    verification?.appraisalFeeAmount ?? 750,
  );

  const [gapResolutionStrategy, setGapResolutionStrategy] = useState<
    'renegotiate_price' | 'inject_equity' | 'rebuttal' | 'none'
  >(verification?.gapResolutionStrategy ?? 'none');

  // 2. Environmental & Survey Diligence State
  const [phase1EsaStatus, setPhase1EsaStatus] = useState<
    'clean' | 'rec_identified' | 'phase2_recommended' | 'waived'
  >(verification?.phase1EsaStatus ?? 'clean');

  const [surveyStatus, setSurveyStatus] = useState<
    'clean' | 'encroachments_noted' | 'pending' | 'waived'
  >(verification?.surveyStatus ?? 'clean');

  // 3. Licensed Property Inspection State
  const [inspectorCompany, setInspectorCompany] = useState<string>(
    verification?.inspectionDetails?.inspectorCompany ?? 'Precision Commercial Inspections',
  );

  const [inspectorName, setInspectorName] = useState<string>(
    verification?.inspectionDetails?.inspectorName ?? 'Marcus Vance, PE',
  );

  const [licenseNumber, setLicenseNumber] = useState<string>(
    verification?.inspectionDetails?.licenseNumber ?? 'TREC-28491',
  );

  const [inspectionScheduledDate, setInspectionScheduledDate] = useState<string>(
    verification?.inspectionDetails?.scheduledDate ?? '',
  );

  const [inspectionContingencyDeadline, setInspectionContingencyDeadline] = useState<string>(
    verification?.inspectionDetails?.contingencyDeadline ?? '',
  );

  const [inspectionStatus, setInspectionStatus] = useState<
    'pending_schedule' | 'scheduled' | 'completed' | 'issues_uncovered' | 'waived'
  >(verification?.inspectionDetails?.status ?? 'completed');

  const [physicalInspectionSignedOff, setPhysicalInspectionSignedOff] = useState<boolean>(
    verification?.physicalInspectionSignedOff ?? false,
  );

  const [inspectionClearanceDate, setInspectionClearanceDate] = useState<string>(
    verification?.inspectionClearanceDate ?? '',
  );

  const [notes, setNotes] = useState<string>(
    verification?.notes ?? '',
  );

  // 4. Inspection Defect & Repair/Credit Negotiation State
  const defaultIssues: PropertyInspectionIssue[] = [
    {
      id: 'issue-1',
      category: 'mep',
      description: 'Primary HVAC unit condenser coil degraded; requires replacement.',
      estimatedCost: 4500,
      requestedResolution: 'closing_credit',
      sellerResponse: 'agreed',
      agreedCreditAmount: 4500,
      repairStatus: 'completed_verified',
    },
    {
      id: 'issue-2',
      category: 'plumbing',
      description: 'Main cast-iron sewer line corrosion identified via camera inspection.',
      estimatedCost: 3200,
      requestedResolution: 'price_reduction',
      sellerResponse: 'agreed',
      agreedCreditAmount: 3200,
      repairStatus: 'in_progress',
    },
  ];

  const [inspectionIssues, setInspectionIssues] = useState<PropertyInspectionIssue[]>(() => {
    if (verification?.inspectionIssues && verification.inspectionIssues.length > 0) {
      return verification.inspectionIssues;
    }
    return defaultIssues;
  });

  const [repairAmendmentExecuted, setRepairAmendmentExecuted] = useState<boolean>(
    verification?.repairAmendmentExecuted ?? true,
  );

  // 5. Final Walk-Through Protocol State (24-48 hours pre-closing)
  const [walkThroughScheduledDate, setWalkThroughScheduledDate] = useState<string>(
    verification?.finalWalkThrough?.scheduledDate ?? '',
  );

  const [walkThroughConductedAt, setWalkThroughConductedAt] = useState<string>(
    verification?.finalWalkThrough?.conductedAt ?? '',
  );

  const [walkThroughLeadName, setWalkThroughLeadName] = useState<string>(
    verification?.finalWalkThrough?.inspectorOrLeadName ?? 'You (Lead Investor)',
  );

  const [walkThroughStatus, setWalkThroughStatus] = useState<
    'pending_schedule' | 'scheduled' | 'passed' | 'issues_identified'
  >(verification?.finalWalkThrough?.status ?? 'pending_schedule');

  const [agreedRepairsVerified, setAgreedRepairsVerified] = useState<boolean>(
    verification?.finalWalkThrough?.agreedRepairsVerified ?? false,
  );

  const [broomCleanConditionVerified, setBroomCleanConditionVerified] = useState<boolean>(
    verification?.finalWalkThrough?.broomCleanConditionVerified ?? false,
  );

  const [utilitiesOperationalVerified, setUtilitiesOperationalVerified] = useState<boolean>(
    verification?.finalWalkThrough?.utilitiesOperationalVerified ?? false,
  );

  const [noNewDamageVerified, setNoNewDamageVerified] = useState<boolean>(
    verification?.finalWalkThrough?.noNewDamageVerified ?? false,
  );

  const [walkThroughSignOffCompleted, setWalkThroughSignOffCompleted] = useState<boolean>(
    verification?.finalWalkThrough?.signOffCompleted ?? false,
  );

  const [walkThroughSignOffNotes, setWalkThroughSignOffNotes] = useState<string>(
    verification?.finalWalkThrough?.signOffNotes ?? '',
  );

  // New Issue creation form toggle
  const [showAddIssueForm, setShowAddIssueForm] = useState(false);
  const [newIssueCategory, setNewIssueCategory] = useState<PropertyInspectionIssue['category']>('roof');
  const [newIssueDescription, setNewIssueDescription] = useState('');
  const [newIssueCost, setNewIssueCost] = useState<number>(0);
  const [newIssueResolution, setNewIssueResolution] = useState<PropertyInspectionIssue['requestedResolution']>('closing_credit');

  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Sync state if funding.valuationVerification changes externally
  useEffect(() => {
    if (funding.valuationVerification) {
      const v = funding.valuationVerification;
      if (v.appraisedValue !== undefined) setAppraisedValue(v.appraisedValue);
      if (v.appraisalCompany !== undefined) setAppraisalCompany(v.appraisalCompany);
      if (v.appraisalDate !== undefined) setAppraisalDate(v.appraisalDate);
      if (v.appraisalOrderedDate !== undefined) setAppraisalOrderedDate(v.appraisalOrderedDate);
      if (v.appraisalOrderStatus !== undefined) setAppraisalOrderStatus(v.appraisalOrderStatus);
      if (v.appraisalTargetDeliveryDate !== undefined) setAppraisalTargetDeliveryDate(v.appraisalTargetDeliveryDate);
      if (v.appraisalFeeAmount !== undefined) setAppraisalFeeAmount(v.appraisalFeeAmount);
      if (v.gapResolutionStrategy !== undefined) setGapResolutionStrategy(v.gapResolutionStrategy);
      if (v.phase1EsaStatus !== undefined) setPhase1EsaStatus(v.phase1EsaStatus);
      if (v.surveyStatus !== undefined) setSurveyStatus(v.surveyStatus);
      if (v.physicalInspectionSignedOff !== undefined) setPhysicalInspectionSignedOff(v.physicalInspectionSignedOff);
      if (v.inspectionClearanceDate !== undefined) setInspectionClearanceDate(v.inspectionClearanceDate);
      if (v.notes !== undefined) setNotes(v.notes);
      if (v.inspectionDetails) {
        if (v.inspectionDetails.inspectorCompany) setInspectorCompany(v.inspectionDetails.inspectorCompany);
        if (v.inspectionDetails.inspectorName) setInspectorName(v.inspectionDetails.inspectorName);
        if (v.inspectionDetails.licenseNumber) setLicenseNumber(v.inspectionDetails.licenseNumber);
        if (v.inspectionDetails.scheduledDate) setInspectionScheduledDate(v.inspectionDetails.scheduledDate);
        if (v.inspectionDetails.contingencyDeadline) setInspectionContingencyDeadline(v.inspectionDetails.contingencyDeadline);
        if (v.inspectionDetails.status) setInspectionStatus(v.inspectionDetails.status);
      }
      if (v.inspectionIssues) setInspectionIssues(v.inspectionIssues);
      if (v.repairAmendmentExecuted !== undefined) setRepairAmendmentExecuted(v.repairAmendmentExecuted);
      if (v.finalWalkThrough) {
        const fw = v.finalWalkThrough;
        if (fw.scheduledDate !== undefined) setWalkThroughScheduledDate(fw.scheduledDate);
        if (fw.conductedAt !== undefined) setWalkThroughConductedAt(fw.conductedAt);
        if (fw.inspectorOrLeadName !== undefined) setWalkThroughLeadName(fw.inspectorOrLeadName);
        if (fw.status !== undefined) setWalkThroughStatus(fw.status);
        if (fw.agreedRepairsVerified !== undefined) setAgreedRepairsVerified(fw.agreedRepairsVerified);
        if (fw.broomCleanConditionVerified !== undefined) setBroomCleanConditionVerified(fw.broomCleanConditionVerified);
        if (fw.utilitiesOperationalVerified !== undefined) setUtilitiesOperationalVerified(fw.utilitiesOperationalVerified);
        if (fw.noNewDamageVerified !== undefined) setNoNewDamageVerified(fw.noNewDamageVerified);
        if (fw.signOffCompleted !== undefined) setWalkThroughSignOffCompleted(fw.signOffCompleted);
        if (fw.signOffNotes !== undefined) setWalkThroughSignOffNotes(fw.signOffNotes);
      }
    }
  }, [funding.valuationVerification]);

  // Live gap calculations
  const delta = appraisedValue - purchasePrice;
  const isCleared = appraisedValue >= purchasePrice;
  const shortfallAmount = isCleared ? 0 : Math.abs(delta);
  const surplusAmount = isCleared ? delta : 0;
  const variancePct = purchasePrice > 0 ? (Math.abs(delta) / purchasePrice) * 100 : 0;

  // Repair & Credit calculations
  const totalRepairsRequested = useMemo(
    () => inspectionIssues.reduce((sum, item) => sum + (item.estimatedCost || 0), 0),
    [inspectionIssues],
  );

  const totalCreditsNegotiated = useMemo(
    () =>
      inspectionIssues.reduce(
        (sum, item) =>
          sum + (item.sellerResponse === 'agreed' ? (item.agreedCreditAmount ?? item.estimatedCost) : 0),
        0,
      ),
    [inspectionIssues],
  );

  // Resolution strategy narrative helper
  const strategyExplanation = useMemo(() => {
    switch (gapResolutionStrategy) {
      case 'renegotiate_price':
        return 'Seller Price Reduction: Issue contract amendment requesting the seller lower the contract price to the certified appraised value before the financing contingency deadline expires.';
      case 'inject_equity':
        return 'Additional Equity Injection: Borrower deposits incremental cash equity into escrow to cover the valuation gap and prevent loan-to-value covenant violations.';
      case 'rebuttal':
        return 'Formal Appraisal Rebuttal: Submit a formal Reconsideration of Value (ROV) with commercial sales comparables, verified cap rate benchmarks, and square footage adjustments.';
      case 'none':
      default:
        return 'Standard / No Gap: The narrative appraised value meets or exceeds the purchase price. No mitigating resolution strategy required.';
    }
  }, [gapResolutionStrategy]);

  // Phase I ESA helper explanation
  const esaExplanation = useMemo(() => {
    switch (phase1EsaStatus) {
      case 'clean':
        return 'ASTM E1527-21 Standard Satisfied: Zero Recognized Environmental Conditions (RECs), Controlled RECs (CRECs), or Historical RECs (HRECs) identified.';
      case 'rec_identified':
        return 'Recognized Environmental Condition (REC) Detected: Environmental professional detected presence or likely presence of hazardous substances or petroleum products.';
      case 'phase2_recommended':
        return 'Phase II Subsurface Investigation Mandated: Soil borings, vapor encroachment screening, and groundwater monitoring recommended by environmental engineer.';
      case 'waived':
        return 'Environmental Review Waived: Senior lender and underwriting committee approved waiver based on low-risk asset classification.';
      default:
        return '';
    }
  }, [phase1EsaStatus]);

  // Survey status helper explanation
  const surveyExplanation = useMemo(() => {
    switch (surveyStatus) {
      case 'clean':
        return 'Boundary Survey Validated: Zero structural encroachments, unrecorded easements, or setback violations identified on ALTA/NSPS land title survey.';
      case 'encroachments_noted':
        return 'Easements or Encroachments Noted: Schedule B exceptions identify boundary fence or easement overlaps. Escrow and title review required.';
      case 'pending':
        return 'Survey in Progress: Field surveyor dispatched. Stamped boundary survey report expected prior to closing.';
      case 'waived':
        return 'Survey Waived: Title underwriter accepted existing plat with standard boundary survey deletion endorsement.';
      default:
        return '';
    }
  }, [surveyStatus]);

  const handleAddIssue = () => {
    if (!newIssueDescription.trim()) return;
    const item: PropertyInspectionIssue = {
      id: `issue-${Date.now()}`,
      category: newIssueCategory,
      description: newIssueDescription.trim(),
      estimatedCost: newIssueCost,
      requestedResolution: newIssueResolution,
      sellerResponse: 'pending',
      agreedCreditAmount: 0,
      repairStatus: 'pending',
    };
    setInspectionIssues((prev) => [...prev, item]);
    setNewIssueDescription('');
    setNewIssueCost(0);
    setShowAddIssueForm(false);
  };

  const handleRemoveIssue = (id: string) => {
    setInspectionIssues((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateIssueResponse = (
    id: string,
    response: PropertyInspectionIssue['sellerResponse'],
    creditAmount?: number,
  ) => {
    setInspectionIssues((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const agreed = creditAmount !== undefined ? creditAmount : item.estimatedCost;
          return {
            ...item,
            sellerResponse: response,
            agreedCreditAmount: response === 'agreed' ? agreed : 0,
          };
        }
        return item;
      }),
    );
  };

  // Handle saving verification records
  const handleSave = () => {
    const inspectionDetails: PropertyInspectionDetails = {
      inspectorCompany,
      inspectorName,
      licenseNumber,
      scheduledDate: inspectionScheduledDate,
      contingencyDeadline: inspectionContingencyDeadline,
      status: inspectionStatus,
      issuesCount: inspectionIssues.length,
    };

    const finalWalkThrough: FinalWalkThroughRecord = {
      scheduledDate: walkThroughScheduledDate,
      conductedAt: walkThroughConductedAt,
      inspectorOrLeadName: walkThroughLeadName,
      status: walkThroughStatus,
      agreedRepairsVerified,
      broomCleanConditionVerified,
      utilitiesOperationalVerified,
      noNewDamageVerified,
      signOffCompleted: walkThroughSignOffCompleted,
      signOffNotes: walkThroughSignOffNotes,
    };

    const updatedVerification: ValuationVerificationRecord = {
      appraisedValue,
      appraisalCompany,
      appraisalDate,
      contractPurchasePrice: purchasePrice,
      appraisalGapAmount: shortfallAmount,
      gapResolutionStrategy,
      phase1EsaStatus,
      surveyStatus,
      physicalInspectionSignedOff,
      inspectionClearanceDate,
      notes,
      inspectionDetails,
      inspectionIssues,
      totalRepairsRequested,
      totalCreditsNegotiated,
      repairAmendmentExecuted,
      appraisalOrderedDate,
      appraisalOrderStatus,
      appraisalTargetDeliveryDate,
      appraisalFeeAmount,
      finalWalkThrough,
    };

    const updatedFunding: ProjectFundingTerms = {
      ...funding,
      valuationVerification: updatedVerification,
    };

    onUpdateFunding(updatedFunding);
    setSaveSuccessMessage('Valuation and property condition records saved successfully.');
    setTimeout(() => {
      setSaveSuccessMessage(null);
    }, 4000);
  };

  return (
    <Card
      data-testid="property-condition-valuation-card"
      className={`w-full rounded-none border border-neutral-800 bg-[#0c0c0c] text-neutral-100 ${className}`}
    >
      <CardHeader className="rounded-none border-b border-neutral-800 pb-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Buildings className="h-4 w-4 text-neutral-400" />
              <CardTitle className="text-sm font-semibold tracking-wide uppercase text-neutral-200">
                Pillar 2: Valuation, Narrative Appraisal Gap &amp; Environmental Clearance
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-neutral-400">
              Commercial appraisal reconciliation, gap defense, licensed physical inspection, repair credit negotiation, and 24 to 48 hour walk-through protocol.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={isCleared ? 'default' : 'destructive'}
              className="rounded-none px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider"
              data-testid="valuation-clearance-badge"
            >
              {isCleared ? 'Valuation Cleared' : 'Shortfall Detected'}
            </Badge>
            <Badge
              variant={phase1EsaStatus === 'clean' ? 'default' : 'secondary'}
              className="rounded-none px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider"
              data-testid="esa-status-badge"
            >
              ESA: {phase1EsaStatus.toUpperCase()}
            </Badge>
            <Badge
              variant={walkThroughSignOffCompleted ? 'default' : 'outline'}
              className="rounded-none px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider"
              data-testid="walkthrough-status-badge"
            >
              Walk-Through: {walkThroughSignOffCompleted ? 'Signed Off' : 'Pending'}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-5">
        {/* SUB-SECTION 1: Property Inspection & Defect Discovery */}
        <section className="space-y-4" data-testid="section-property-inspection">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-neutral-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
                1. Licensed Property Inspection &amp; Physical Health
              </h3>
            </div>
            <Badge
              variant="outline"
              className="rounded-none text-[10px] uppercase font-mono border-neutral-700"
            >
              Status: {inspectionStatus.replace('_', ' ')}
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label
                htmlFor="input-inspector-firm"
                className="block text-xs font-medium text-neutral-300"
              >
                Inspection Firm
              </label>
              <Input
                id="input-inspector-firm"
                data-testid="input-inspector-firm"
                type="text"
                value={inspectorCompany}
                onChange={(e) => setInspectorCompany(e.target.value)}
                placeholder="e.g. Precision Commercial Inspections"
                className="w-full rounded-none border border-neutral-800 bg-neutral-950 px-3 py-2 text-base text-neutral-100 sm:text-xs min-h-[44px] focus:border-neutral-400 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="input-inspector-name"
                className="block text-xs font-medium text-neutral-300"
              >
                Licensed Inspector &amp; License Number
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  id="input-inspector-name"
                  data-testid="input-inspector-name"
                  type="text"
                  value={inspectorName}
                  onChange={(e) => setInspectorName(e.target.value)}
                  placeholder="Inspector name"
                  className="w-full rounded-none border border-neutral-800 bg-neutral-950 px-2.5 py-2 text-base text-neutral-100 sm:text-xs min-h-[44px] focus:border-neutral-400 focus:outline-none"
                />
                <Input
                  id="input-license-number"
                  data-testid="input-license-number"
                  type="text"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="License #"
                  className="w-full rounded-none border border-neutral-800 bg-neutral-950 px-2.5 py-2 text-base text-neutral-100 sm:text-xs min-h-[44px] focus:border-neutral-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="input-scheduled-inspection-date"
                className="block text-xs font-medium text-neutral-300"
              >
                Inspection Date &amp; Contingency Deadline
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  id="input-scheduled-inspection-date"
                  data-testid="input-scheduled-inspection-date"
                  type="date"
                  value={inspectionScheduledDate}
                  onChange={(e) => setInspectionScheduledDate(e.target.value)}
                  className="w-full rounded-none border border-neutral-800 bg-neutral-950 px-2 py-1 text-base text-neutral-100 sm:text-xs min-h-[44px] focus:border-neutral-400 focus:outline-none"
                />
                <Input
                  id="input-contingency-deadline"
                  data-testid="input-contingency-deadline"
                  type="date"
                  value={inspectionContingencyDeadline}
                  onChange={(e) => setInspectionContingencyDeadline(e.target.value)}
                  className="w-full rounded-none border border-neutral-800 bg-neutral-950 px-2 py-1 text-base text-neutral-100 sm:text-xs min-h-[44px] focus:border-neutral-400 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </section>

        {/* SUB-SECTION 2: Repair & Credit Negotiation Matrix */}
        <section className="space-y-4 border-t border-neutral-800 pt-5" data-testid="section-repair-negotiation">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-neutral-800 pb-2">
            <div className="flex items-center gap-2">
              <Handshake className="h-4 w-4 text-neutral-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
                2. Inspection Defect Discovery &amp; Repair/Credit Negotiation Ledger
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-[11px] text-neutral-400">
                Requested: <span className="text-amber-300 font-semibold">{formatCurrency(totalRepairsRequested)}</span>
                {' | '}
                Agreed Credit: <span className="text-emerald-400 font-semibold">{formatCurrency(totalCreditsNegotiated)}</span>
              </div>
              <Button
                type="button"
                data-testid="btn-toggle-add-issue"
                onClick={() => setShowAddIssueForm(!showAddIssueForm)}
                className="h-7 rounded-none px-2.5 text-[11px] font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add Defect
              </Button>
            </div>
          </div>

          {/* Add Defect Form */}
          {showAddIssueForm && (
            <div
              data-testid="add-defect-form"
              className="space-y-3 rounded-none border border-neutral-700 bg-neutral-950 p-3.5"
            >
              <div className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
                Log Inspection Defect / Repair Request
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                <div className="space-y-1">
                  <label htmlFor="new-defect-cat" className="block text-[11px] text-neutral-400">Category</label>
                  <select
                    id="new-defect-cat"
                    value={newIssueCategory}
                    onChange={(e) => setNewIssueCategory(e.target.value as PropertyInspectionIssue['category'])}
                    className="w-full rounded-none border border-neutral-800 bg-neutral-900 px-2 py-2 text-xs text-neutral-100 min-h-[44px]"
                  >
                    <option value="mep">Mechanical / HVAC (MEP)</option>
                    <option value="roof">Roof &amp; Attic</option>
                    <option value="structural">Foundation &amp; Structural</option>
                    <option value="plumbing">Plumbing &amp; Sewer</option>
                    <option value="electrical">Electrical Panel</option>
                    <option value="environmental">Environmental / Mold</option>
                    <option value="cosmetic">Interior / Cosmetic</option>
                  </select>
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <label htmlFor="new-defect-desc" className="block text-[11px] text-neutral-400">Defect Description</label>
                  <Input
                    id="new-defect-desc"
                    type="text"
                    value={newIssueDescription}
                    onChange={(e) => setNewIssueDescription(e.target.value)}
                    placeholder="e.g. Broken rafters in attic / cracked foundation corner"
                    className="w-full rounded-none border border-neutral-800 bg-neutral-900 px-3 py-2 text-base text-neutral-100 sm:text-xs min-h-[44px]"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="new-defect-cost" className="block text-[11px] text-neutral-400">Est. Repair Cost ($)</label>
                  <Input
                    id="new-defect-cost"
                    type="number"
                    value={newIssueCost === 0 ? '' : newIssueCost}
                    onChange={(e) => setNewIssueCost(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 3500"
                    className="w-full rounded-none border border-neutral-800 bg-neutral-900 px-3 py-2 text-base text-neutral-100 sm:text-xs min-h-[44px]"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-neutral-400">Requested Resolution:</span>
                  <select
                    value={newIssueResolution}
                    onChange={(e) => setNewIssueResolution(e.target.value as PropertyInspectionIssue['requestedResolution'])}
                    className="rounded-none border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs text-neutral-100 min-h-[36px]"
                  >
                    <option value="closing_credit">Seller Closing Credit</option>
                    <option value="price_reduction">Contract Price Reduction</option>
                    <option value="seller_repair">Seller Repair Prior to Closing</option>
                    <option value="escrow_holdback">Escrow Holdback at Closing</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={() => setShowAddIssueForm(false)}
                    className="h-8 rounded-none px-3 text-xs bg-neutral-800 text-neutral-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    data-testid="btn-submit-add-issue"
                    onClick={handleAddIssue}
                    className="h-8 rounded-none px-3 text-xs bg-neutral-100 text-neutral-900 font-semibold"
                  >
                    Save Defect
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Issues Ledger Table */}
          <div className="space-y-2" data-testid="repair-issues-ledger">
            {inspectionIssues.length === 0 ? (
              <div className="p-4 text-center text-xs text-neutral-500 border border-neutral-800/80 bg-neutral-950/40">
                Zero defects logged. Property inspection report identified no material adverse physical conditions.
              </div>
            ) : (
              <div className="space-y-2">
                {inspectionIssues.map((issue) => (
                  <div
                    key={issue.id}
                    data-testid={`issue-row-${issue.id}`}
                    className="flex flex-col gap-2 rounded-none border border-neutral-800 bg-neutral-950 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded-none bg-neutral-800 px-1.5 py-0.5 text-[10px] font-mono uppercase text-neutral-300">
                          {issue.category}
                        </span>
                        <span className="text-xs font-medium text-neutral-200">{issue.description}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-neutral-400">
                        <span>Est: <strong className="text-neutral-200">{formatCurrency(issue.estimatedCost)}</strong></span>
                        <span>Resolution: <strong className="text-neutral-300">{issue.requestedResolution.replace('_', ' ')}</strong></span>
                        {issue.sellerResponse === 'agreed' && (
                          <span className="text-emerald-400 font-semibold">
                            Credit: {formatCurrency(issue.agreedCreditAmount ?? issue.estimatedCost)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        aria-label={`Seller response for ${issue.description}`}
                        value={issue.sellerResponse}
                        onChange={(e) =>
                          handleUpdateIssueResponse(
                            issue.id,
                            e.target.value as PropertyInspectionIssue['sellerResponse'],
                          )
                        }
                        className="rounded-none border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs text-neutral-200 min-h-[36px]"
                      >
                        <option value="pending">Pending Seller</option>
                        <option value="agreed">Seller Agreed</option>
                        <option value="countered">Seller Countered</option>
                        <option value="rejected">Seller Rejected</option>
                      </select>

                      <Button
                        type="button"
                        aria-label={`Remove defect ${issue.description}`}
                        onClick={() => handleRemoveIssue(issue.id)}
                        className="h-8 w-8 p-0 rounded-none bg-neutral-900 hover:bg-red-950 text-neutral-400 hover:text-red-400 border border-neutral-800"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Repair Amendment Status Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-neutral-800 bg-neutral-950/60 p-3 mt-2">
              <label
                htmlFor="checkbox-repair-amendment"
                className="flex items-center gap-3 cursor-pointer select-none min-h-[44px] touch-target"
              >
                <input
                  id="checkbox-repair-amendment"
                  data-testid="checkbox-repair-amendment"
                  type="checkbox"
                  checked={repairAmendmentExecuted}
                  onChange={(e) => setRepairAmendmentExecuted(e.target.checked)}
                  className="h-5 w-5 rounded-none border border-neutral-700 bg-neutral-900 text-neutral-100 accent-neutral-200 focus:ring-1 focus:ring-neutral-400"
                />
                <div>
                  <div className="text-xs font-semibold text-neutral-200">
                    Repair Amendment / Closing Credit Addendum Fully Executed
                  </div>
                  <div className="text-[11px] text-neutral-400">
                    Contract addendum signed by buyer and seller. Transmitted to title escrow and senior lender.
                  </div>
                </div>
              </label>

              <div className="text-right">
                <span className="text-[10px] uppercase tracking-wider text-neutral-500 block">Total Closing Benefit</span>
                <span className="text-sm font-mono font-bold text-emerald-400" data-testid="total-credits-negotiated-display">
                  {formatCurrency(totalCreditsNegotiated)}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* SUB-SECTION 3: Commercial Narrative Appraisal & Gap Engine */}
        <section className="space-y-4 border-t border-neutral-800 pt-5">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-neutral-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
                3. Commercial Narrative Appraisal &amp; Valuation
              </h3>
            </div>
            <span className="text-[11px] text-neutral-400">
              Contract Price: <strong className="text-neutral-200">{formatCurrency(purchasePrice)}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            {/* Field: Appraisal Order Status */}
            <div className="space-y-1.5">
              <label
                htmlFor="select-appraisal-status"
                className="block text-xs font-medium text-neutral-300"
              >
                Order Status
              </label>
              <select
                id="select-appraisal-status"
                data-testid="select-appraisal-status"
                value={appraisalOrderStatus}
                onChange={(e) =>
                  setAppraisalOrderStatus(
                    e.target.value as ValuationVerificationRecord['appraisalOrderStatus'] ?? 'pending_order',
                  )
                }
                className="w-full rounded-none border border-neutral-800 bg-neutral-950 px-3 py-2 text-base text-neutral-100 sm:text-xs min-h-[44px] focus:border-neutral-400 focus:outline-none"
              >
                <option value="pending_order">Pending Order</option>
                <option value="ordered_by_lender">Ordered by Senior Lender</option>
                <option value="inspection_scheduled">Appraiser Inspection Scheduled</option>
                <option value="report_received">Certified Report Received</option>
                <option value="under_review">AMC Underwriting Review</option>
              </select>
            </div>

            {/* Field: Appraised Value */}
            <div className="space-y-1.5">
              <label
                htmlFor="input-appraised-value"
                className="block text-xs font-medium text-neutral-300"
              >
                Narrative Appraised Value ($)
              </label>
              <div className="relative">
                <Input
                  id="input-appraised-value"
                  type="number"
                  data-testid="input-appraised-value"
                  value={Number.isNaN(appraisedValue) ? '' : appraisedValue}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setAppraisedValue(Number.isNaN(val) ? 0 : val);
                  }}
                  placeholder="e.g. 500000"
                  className="w-full rounded-none border border-neutral-800 bg-neutral-950 px-3 py-2 text-base text-neutral-100 sm:text-xs min-h-[44px] focus:border-neutral-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Field: Appraisal Firm */}
            <div className="space-y-1.5">
              <label
                htmlFor="input-appraisal-company"
                className="block text-xs font-medium text-neutral-300"
              >
                Appraisal Firm / Appraiser
              </label>
              <Input
                id="input-appraisal-company"
                type="text"
                data-testid="input-appraisal-company"
                value={appraisalCompany}
                onChange={(e) => setAppraisalCompany(e.target.value)}
                placeholder="e.g. CBRE Valuation Services"
                className="w-full rounded-none border border-neutral-800 bg-neutral-950 px-3 py-2 text-base text-neutral-100 sm:text-xs min-h-[44px] focus:border-neutral-400 focus:outline-none"
              />
            </div>

            {/* Field: Appraisal Effective Date */}
            <div className="space-y-1.5">
              <label
                htmlFor="input-appraisal-date"
                className="block text-xs font-medium text-neutral-300"
              >
                Appraisal Effective Date
              </label>
              <Input
                id="input-appraisal-date"
                type="date"
                data-testid="input-appraisal-date"
                value={appraisalDate}
                onChange={(e) => setAppraisalDate(e.target.value)}
                className="w-full rounded-none border border-neutral-800 bg-neutral-950 px-3 py-2 text-base text-neutral-100 sm:text-xs min-h-[44px] focus:border-neutral-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Live Gap Engine Banner */}
          {isCleared ? (
            <div
              data-testid="appraisal-cleared-banner"
              className="flex flex-col gap-2 rounded-none border border-emerald-500/40 bg-emerald-950/20 p-4 text-emerald-300"
            >
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Appraisal Valuation Cleared</span>
              </div>
              <p className="text-xs text-emerald-200/90 leading-relaxed">
                Appraised value exceeds contract purchase price by{' '}
                <strong className="text-emerald-100">
                  +{formatCurrency(surplusAmount)} (+{variancePct.toFixed(1)}%)
                </strong>
                . Property collateral fully supports senior debt basis with zero appraisal shortfall.
              </p>
            </div>
          ) : (
            <div
              data-testid="appraisal-shortfall-banner"
              className="flex flex-col gap-3 rounded-none border border-amber-500/50 bg-amber-950/30 p-4 text-amber-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-300">
                  <WarningCircle className="h-4 w-4 text-amber-400" />
                  <span>Appraisal Shortfall Detected</span>
                </div>
                <Badge
                  variant="destructive"
                  className="rounded-none px-2 py-0.5 text-[11px] font-bold"
                >
                  Gap: -{formatCurrency(shortfallAmount)}
                </Badge>
              </div>

              <div className="space-y-1.5 text-xs text-amber-100/90 leading-relaxed">
                <p>
                  Narrative appraised value is{' '}
                  <strong className="text-white">
                    {formatCurrency(shortfallAmount)} ({variancePct.toFixed(1)}%)
                  </strong>{' '}
                  below the contract purchase price of{' '}
                  <strong className="text-white">{formatCurrency(purchasePrice)}</strong>.
                </p>
                <p className="text-amber-300/90">
                  <strong>LTV Compression Warning:</strong> Senior lenders underwrite maximum allowable loan-to-value against the lesser of contract purchase price or appraised value. Loan proceeds will compress, requiring proactive gap resolution to avoid financing condition default.
                </p>
              </div>

              {/* Resolution Strategy Selector */}
              <div className="mt-2 space-y-2 border-t border-amber-500/20 pt-3">
                <label
                  htmlFor="select-gap-strategy"
                  className="block text-xs font-semibold text-amber-200 uppercase tracking-wider"
                >
                  Institutional Resolution Strategy
                </label>
                <select
                  id="select-gap-strategy"
                  data-testid="select-gap-strategy"
                  value={gapResolutionStrategy}
                  onChange={(e) =>
                    setGapResolutionStrategy(
                      e.target.value as 'renegotiate_price' | 'inject_equity' | 'rebuttal' | 'none',
                    )
                  }
                  className="w-full rounded-none border border-neutral-700 bg-neutral-900 px-3 py-2 text-base text-neutral-100 sm:text-xs min-h-[44px] focus:border-amber-400 focus:outline-none"
                >
                  <option value="renegotiate_price">
                    Seller Price Reduction to Appraised Value
                  </option>
                  <option value="inject_equity">
                    Additional Cash Equity Injection to preserve loan terms
                  </option>
                  <option value="rebuttal">
                    Formal Appraisal Rebuttal / Reconsideration of Value (ROV)
                  </option>
                  <option value="none">Standard / No Gap Action</option>
                </select>
                <p
                  data-testid="gap-strategy-explanation"
                  className="text-xs text-neutral-300 bg-neutral-950/80 p-2.5 border border-neutral-800"
                >
                  {strategyExplanation}
                </p>
              </div>
            </div>
          )}
        </section>

        {/* SUB-SECTION 4: Environmental & Physical Diligence Clearance */}
        <section className="space-y-4 border-t border-neutral-800 pt-5">
          <div className="flex items-center gap-2 border-b border-neutral-800 pb-2">
            <ShieldCheck className="h-4 w-4 text-neutral-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
              4. Environmental &amp; Physical Diligence Clearance
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Phase I Environmental Site Assessment (ESA) */}
            <div className="space-y-2 border border-neutral-800 bg-neutral-950/50 p-3.5 rounded-none">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="select-phase1-esa"
                  className="block text-xs font-semibold text-neutral-200"
                >
                  Phase I Environmental Site Assessment (ESA)
                </label>
                <span className="text-[10px] uppercase tracking-wider text-neutral-400">
                  ASTM E1527-21
                </span>
              </div>
              <select
                id="select-phase1-esa"
                data-testid="select-phase1-esa"
                value={phase1EsaStatus}
                onChange={(e) =>
                  setPhase1EsaStatus(
                    e.target.value as 'clean' | 'rec_identified' | 'phase2_recommended' | 'waived',
                  )
                }
                className="w-full rounded-none border border-neutral-800 bg-neutral-900 px-3 py-2 text-base text-neutral-100 sm:text-xs min-h-[44px] focus:border-neutral-400 focus:outline-none"
              >
                <option value="clean">Phase I Clean (No RECs)</option>
                <option value="rec_identified">Recognized Environmental Condition (REC) Identified</option>
                <option value="phase2_recommended">Phase II Subsurface Testing Recommended</option>
                <option value="waived">Environmental Review Waived</option>
              </select>
              <p className="text-[11px] text-neutral-400 leading-relaxed" data-testid="esa-explanation">
                {esaExplanation}
              </p>
            </div>

            {/* ALTA / Boundary Survey Review */}
            <div className="space-y-2 border border-neutral-800 bg-neutral-950/50 p-3.5 rounded-none">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="select-survey-status"
                  className="block text-xs font-semibold text-neutral-200"
                >
                  ALTA / Boundary Survey Review
                </label>
                <span className="text-[10px] uppercase tracking-wider text-neutral-400">
                  ALTA/NSPS
                </span>
              </div>
              <select
                id="select-survey-status"
                data-testid="select-survey-status"
                value={surveyStatus}
                onChange={(e) =>
                  setSurveyStatus(
                    e.target.value as 'clean' | 'encroachments_noted' | 'pending' | 'waived',
                  )
                }
                className="w-full rounded-none border border-neutral-800 bg-neutral-900 px-3 py-2 text-base text-neutral-100 sm:text-xs min-h-[44px] focus:border-neutral-400 focus:outline-none"
              >
                <option value="clean">Survey Clean (No Boundary Encroachments)</option>
                <option value="encroachments_noted">Easements or Encroachments Noted</option>
                <option value="pending">Survey In Progress</option>
                <option value="waived">Survey Waived by Title &amp; Lender</option>
              </select>
              <p className="text-[11px] text-neutral-400 leading-relaxed" data-testid="survey-explanation">
                {surveyExplanation}
              </p>
            </div>
          </div>

          {/* Physical Inspection Sign-off */}
          <div className="space-y-3 border border-neutral-800 bg-neutral-950/40 p-4 rounded-none">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label
                htmlFor="checkbox-physical-inspection"
                className="flex items-center gap-3 cursor-pointer select-none min-h-[44px] touch-target"
              >
                <input
                  id="checkbox-physical-inspection"
                  data-testid="checkbox-physical-inspection"
                  type="checkbox"
                  checked={physicalInspectionSignedOff}
                  onChange={(e) => setPhysicalInspectionSignedOff(e.target.checked)}
                  className="h-5 w-5 rounded-none border border-neutral-700 bg-neutral-900 text-neutral-100 accent-neutral-200 focus:ring-1 focus:ring-neutral-400"
                />
                <span className="text-xs font-semibold text-neutral-200">
                  Physical &amp; Structural Inspection Cleared by Due Diligence Lead
                </span>
              </label>

              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-400 whitespace-nowrap">Sign-off Date:</span>
                <Input
                  type="date"
                  data-testid="input-inspection-date"
                  value={inspectionClearanceDate}
                  onChange={(e) => setInspectionClearanceDate(e.target.value)}
                  className="w-full sm:w-40 rounded-none border border-neutral-800 bg-neutral-900 px-2 py-1 text-base text-neutral-200 sm:text-xs min-h-[44px] focus:border-neutral-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Diligence Notes */}
            <div className="space-y-1.5 pt-1">
              <label
                htmlFor="textarea-inspection-notes"
                className="block text-xs font-medium text-neutral-300"
              >
                Due Diligence Findings &amp; Engineering Notes
              </label>
              <textarea
                id="textarea-inspection-notes"
                data-testid="textarea-inspection-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Record physical inspection summary, structural roof evaluation, mechanical HVAC equipment life, and municipal certificate notes..."
                className="w-full rounded-none border border-neutral-800 bg-neutral-900 p-3 text-base text-neutral-100 sm:text-xs min-h-[88px] focus:border-neutral-400 focus:outline-none leading-relaxed placeholder:text-neutral-500"
              />
            </div>
          </div>
        </section>

        {/* SUB-SECTION 5: Final Walk-Through Protocol (24 to 48 Hours Pre-Closing) */}
        <section className="space-y-4 border-t border-neutral-800 pt-5" data-testid="section-final-walkthrough">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-neutral-800 pb-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-neutral-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
                5. Final Walk-Through Protocol (24 to 48 Hours Pre-Closing)
              </h3>
            </div>
            <span className="text-[11px] text-neutral-400 font-mono">
              Window: 24 to 48 Hours Before Closing
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label
                htmlFor="input-walkthrough-date"
                className="block text-xs font-medium text-neutral-300"
              >
                Scheduled Walk-Through Date
              </label>
              <Input
                id="input-walkthrough-date"
                data-testid="input-walkthrough-date"
                type="date"
                value={walkThroughScheduledDate}
                onChange={(e) => setWalkThroughScheduledDate(e.target.value)}
                className="w-full rounded-none border border-neutral-800 bg-neutral-950 px-3 py-2 text-base text-neutral-100 sm:text-xs min-h-[44px] focus:border-neutral-400 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="input-walkthrough-lead"
                className="block text-xs font-medium text-neutral-300"
              >
                Inspecting Lead / Representative
              </label>
              <Input
                id="input-walkthrough-lead"
                data-testid="input-walkthrough-lead"
                type="text"
                value={walkThroughLeadName}
                onChange={(e) => setWalkThroughLeadName(e.target.value)}
                placeholder="e.g. Lead Investor or Field PM"
                className="w-full rounded-none border border-neutral-800 bg-neutral-950 px-3 py-2 text-base text-neutral-100 sm:text-xs min-h-[44px] focus:border-neutral-400 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="select-walkthrough-status"
                className="block text-xs font-medium text-neutral-300"
              >
                Walk-Through Status
              </label>
              <select
                id="select-walkthrough-status"
                data-testid="select-walkthrough-status"
                value={walkThroughStatus}
                onChange={(e) =>
                  setWalkThroughStatus(
                    e.target.value as FinalWalkThroughRecord['status'] ?? 'pending_schedule',
                  )
                }
                className="w-full rounded-none border border-neutral-800 bg-neutral-950 px-3 py-2 text-base text-neutral-100 sm:text-xs min-h-[44px] focus:border-neutral-400 focus:outline-none"
              >
                <option value="pending_schedule">Pending Schedule (24-48h pre-close)</option>
                <option value="scheduled">Scheduled with Seller</option>
                <option value="passed">Passed Condition Verification</option>
                <option value="issues_identified">Issues Identified at Walk-Through</option>
              </select>
            </div>
          </div>

          {/* 4-Point Mandatory Pre-Closing Verification Checklist */}
          <div className="space-y-2 border border-neutral-800 bg-neutral-950/60 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-2">
              Mandatory Pre-Disbursement Condition Checklist
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {/* Check 1: Agreed repairs verified */}
              <label
                htmlFor="check-repairs-verified"
                className="flex items-start gap-3 p-2 border border-neutral-900 bg-neutral-900/50 hover:bg-neutral-900 cursor-pointer min-h-[44px] touch-target"
              >
                <input
                  id="check-repairs-verified"
                  data-testid="check-repairs-verified"
                  type="checkbox"
                  checked={agreedRepairsVerified}
                  onChange={(e) => setAgreedRepairsVerified(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded-none border border-neutral-700 bg-neutral-950 text-neutral-100 accent-neutral-200"
                />
                <div className="text-xs">
                  <div className="font-semibold text-neutral-200">1. Agreed Repairs Completed</div>
                  <div className="text-[11px] text-neutral-400">All agreed seller repairs verified with contractor invoices and receipts.</div>
                </div>
              </label>

              {/* Check 2: Broom-clean condition */}
              <label
                htmlFor="check-broom-clean"
                className="flex items-start gap-3 p-2 border border-neutral-900 bg-neutral-900/50 hover:bg-neutral-900 cursor-pointer min-h-[44px] touch-target"
              >
                <input
                  id="check-broom-clean"
                  data-testid="check-broom-clean"
                  type="checkbox"
                  checked={broomCleanConditionVerified}
                  onChange={(e) => setBroomCleanConditionVerified(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded-none border border-neutral-700 bg-neutral-950 text-neutral-100 accent-neutral-200"
                />
                <div className="text-xs">
                  <div className="font-semibold text-neutral-200">2. Broom-Clean Condition</div>
                  <div className="text-[11px] text-neutral-400">All personal property and seller construction debris removed from premises.</div>
                </div>
              </label>

              {/* Check 3: Utilities operational */}
              <label
                htmlFor="check-utilities-operational"
                className="flex items-start gap-3 p-2 border border-neutral-900 bg-neutral-900/50 hover:bg-neutral-900 cursor-pointer min-h-[44px] touch-target"
              >
                <input
                  id="check-utilities-operational"
                  data-testid="check-utilities-operational"
                  type="checkbox"
                  checked={utilitiesOperationalVerified}
                  onChange={(e) => setUtilitiesOperationalVerified(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded-none border border-neutral-700 bg-neutral-950 text-neutral-100 accent-neutral-200"
                />
                <div className="text-xs">
                  <div className="font-semibold text-neutral-200">3. Utilities Fully Operational</div>
                  <div className="text-[11px] text-neutral-400">Water, electricity, gas service, and HVAC active and confirmed functional.</div>
                </div>
              </label>

              {/* Check 4: No new damage */}
              <label
                htmlFor="check-no-new-damage"
                className="flex items-start gap-3 p-2 border border-neutral-900 bg-neutral-900/50 hover:bg-neutral-900 cursor-pointer min-h-[44px] touch-target"
              >
                <input
                  id="check-no-new-damage"
                  data-testid="check-no-new-damage"
                  type="checkbox"
                  checked={noNewDamageVerified}
                  onChange={(e) => setNoNewDamageVerified(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded-none border border-neutral-700 bg-neutral-950 text-neutral-100 accent-neutral-200"
                />
                <div className="text-xs">
                  <div className="font-semibold text-neutral-200">4. Zero New Damage or Missing Fixtures</div>
                  <div className="text-[11px] text-neutral-400">Premises in same or better condition as original inspection date.</div>
                </div>
              </label>
            </div>

            {/* Formal Final Walk-Through Sign-off */}
            <div className="mt-3 pt-3 border-t border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label
                htmlFor="checkbox-walkthrough-signoff"
                className="flex items-center gap-3 cursor-pointer select-none min-h-[44px] touch-target"
              >
                <input
                  id="checkbox-walkthrough-signoff"
                  data-testid="checkbox-walkthrough-signoff"
                  type="checkbox"
                  checked={walkThroughSignOffCompleted}
                  onChange={(e) => setWalkThroughSignOffCompleted(e.target.checked)}
                  className="h-5 w-5 rounded-none border border-neutral-700 bg-neutral-900 text-neutral-100 accent-neutral-200 focus:ring-1 focus:ring-neutral-400"
                />
                <span className="text-xs font-semibold text-emerald-400">
                  Execute Final Walk-Through Sign-off &amp; Authorize Escrow Release
                </span>
              </label>

              <div className="text-xs text-neutral-400">
                {walkThroughSignOffCompleted ? (
                  <span className="text-emerald-400 font-medium">Ready for closing fund release</span>
                ) : (
                  <span>Sign-off required before final wire dispatch</span>
                )}
              </div>
            </div>
          </div>
        </section>
      </CardContent>

      <CardFooter className="rounded-none border-t border-neutral-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4">
        <div className="text-xs text-neutral-400">
          {saveSuccessMessage ? (
            <span
              data-testid="save-success-indicator"
              className="inline-flex items-center gap-1.5 text-emerald-400 font-medium"
            >
              <Check className="h-4 w-4" />
              {saveSuccessMessage}
            </span>
          ) : (
            <span>All property valuation and condition inputs persist to the project funding model.</span>
          )}
        </div>

        <Button
          type="button"
          data-testid="btn-save-valuation-record"
          onClick={handleSave}
          className="min-h-[44px] rounded-none px-5 text-xs font-semibold bg-neutral-100 text-neutral-900 hover:bg-neutral-200 transition"
        >
          Save Valuation &amp; Condition Records
        </Button>
      </CardFooter>
    </Card>
  );
}

export default PropertyConditionValuationCard;
