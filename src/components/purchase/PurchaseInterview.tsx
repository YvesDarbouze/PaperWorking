'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Project, Contingency, DueDiligenceItem, RoleLinkedDocument, ProjectRole } from '@/types/schema';
import { projectsService } from '@/lib/firebase/projects';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';
import {
  ChevronLeft, ChevronRight, Info, AlertTriangle,
  CheckCircle, Circle, FileText, Search, Shield,
  Home, DollarSign, Calendar, Users
} from 'lucide-react';

// ══════════════════════════════════════════════════════════════════
// R2 — Purchase Agent: Due-Diligence Guided Interview
// ══════════════════════════════════════════════════════════════════
// Mirrors the real US residential transaction diligence sequence:
//   S1: Price & P&S Agreement
//   S2: Lender & Loan
//   S3: Property Inspection
//   S4: Title & Survey
//   S5: Insurance & HOA
//   S6: Closing Disclosure
//   S7: Vendors & Closing Date
// ══════════════════════════════════════════════════════════════════

interface PurchaseInterviewProps {
  deal: Project;
}

// ── Section Definition ─────────────────────────────────────────
interface Section {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}

const SECTIONS: Section[] = [
  { id: 'psa',        title: 'Price & P&S Agreement',   subtitle: 'Earnest money, contingency deadlines',                  icon: <DollarSign className="w-4 h-4" /> },
  { id: 'lender',     title: 'Lender & Loan',           subtitle: 'Financing type, loan terms, lender comparison',         icon: <FileText className="w-4 h-4" /> },
  { id: 'inspection', title: 'Property Inspection',      subtitle: 'Inspector, cost, pass/fail',                            icon: <Search className="w-4 h-4" /> },
  { id: 'title',      title: 'Title & Survey',           subtitle: 'Liens, encumbrances, boundaries',                       icon: <Shield className="w-4 h-4" /> },
  { id: 'insurance',  title: 'Insurance & HOA',          subtitle: 'Hazard, flood riders, HOA CC&Rs',                       icon: <Home className="w-4 h-4" /> },
  { id: 'disclosure', title: 'Closing Disclosure',       subtitle: 'Final fees, rate, APR, clear-to-close',                 icon: <FileText className="w-4 h-4" /> },
  { id: 'vendors',    title: 'Vendors & Closing Date',   subtitle: 'Attorney, acquisition date, total cash invested',        icon: <Users className="w-4 h-4" /> },
];

// ── Step Configuration Type ───────────────────────────────────
interface InterviewStep {
  id: string;
  sectionId: string;
  question: string;
  description: string;
  field: string;
  type: 'text' | 'select' | 'currency' | 'percentage' | 'date' | 'integer' | 'boolean';
  placeholder?: string;
  required: boolean;
  options?: { label: string; value: string }[];
  condition?: (data: any) => boolean;
  alert?: string;
  marketplaceCTA?: string; // Placeholder vendor marketplace prompt
}

export default function PurchaseInterview({ deal }: PurchaseInterviewProps) {
  const { user } = useAuth();
  const isBackdated = deal.financials?.entryPath === 'already_owned';

  // ── Form State ──────────────────────────────────────────────
  const buildInitialData = useCallback(() => ({
    financials: {
      // S1: Price & P&S
      purchasePrice: deal.financials?.purchasePrice || '',
      emdAmount: deal.financials?.emdAmount || '',
      emdGoHardDate: formatDate(deal.financials?.emdGoHardDate),
      inspectionDeadline: '',
      financingDeadline: '',
      appraisalDeadline: '',

      // S2: Lender & Loan
      financingType: deal.financials?.financingType || (deal.financials?.loanAmount && deal.financials.loanAmount > 0 ? 'Financed' : ''),
      loanAmount: deal.financials?.loanAmount || '',
      loanInterestRate: deal.financials?.loanInterestRate || '',
      loanTermYears: deal.financials?.loanTermYears || '',
      loanOriginationPoints: deal.financials?.loanOriginationPoints || '',
      loanProcessorName: deal.financials?.loanProcessorName || '',

      // S3: Inspection
      inspectionOrdered: deal.dueDiligenceChecklist?.some(d => d.label === 'Property Inspection' && d.completed) ? 'yes' : '',
      inspectorName: '',
      inspectionCost: deal.financials?.inspectionCost || '',
      inspectionPassed: '',
      isOlderHome: '',  // Pre-1978 branch → environmental tests
      radonTestOrdered: '',
      leadPaintTestOrdered: '',
      termiteInspectionOrdered: '',

      // S4: Title & Survey
      titleCompanyName: '',
      titleSearchCost: deal.financials?.titleSearchCost || '',
      liensFound: '',
      surveyOrdered: deal.dueDiligenceChecklist?.some(d => d.label === 'Survey' && d.completed) ? 'yes' : '',

      // S5: Insurance & HOA
      insuranceProvider: '',
      insuranceCost: deal.financials?.insuranceCost || '',
      floodRider: '',
      hoaMonthly: deal.financials?.hoaMonthly || deal.financials?.monthlyHOA || '',
      hoaCCRsReviewed: '',

      // S6: Closing Disclosure
      closingCosts: deal.financials?.closingCosts || deal.financials?.fixedAcquisitionCosts || '',
      closingDisclosureReviewed: deal.isClearToClose ? 'yes' : '',
      finalAPR: '',
      clearToClose: deal.isClearToClose ? 'yes' : '',

      // S7: Vendors & Date
      closingAttorneyName: deal.financials?.closingAttorneyName || '',
      acquisitionDate: formatDate(deal.financials?.acquisitionDate),
      totalCashInvested: deal.financials?.totalCashInvested || deal.financials?.financingCashInvested || '',
    }
  }), [deal]);

  const [formData, setFormData] = useState<any>(buildInitialData);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());

  // ── Sync state if deal updates externally ──
  useEffect(() => {
    setFormData(buildInitialData());
    // Pre-mark sections as complete for backdated entries
    if (isBackdated) {
      setCompletedSections(new Set(SECTIONS.map(s => s.id)));
    }
  }, [deal, buildInitialData, isBackdated]);

  // ── Date formatting helper ──
  function formatDate(dateVal: any): string {
    if (!dateVal) return '';
    try {
      if (typeof dateVal === 'object' && dateVal.toDate) {
        return dateVal.toDate().toISOString().split('T')[0];
      }
      return new Date(dateVal).toISOString().split('T')[0];
    } catch {
      return '';
    }
  }

  // ── Steps Configuration with Section Mapping ────────────────
  const steps: InterviewStep[] = useMemo(() => [
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // S1: PRICE & P&S AGREEMENT
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
      id: 'purchasePrice',
      sectionId: 'psa',
      question: "What is the actual purchase price?",
      description: "The final contracted price from the Purchase & Sale Agreement. This becomes the real basis for Cap Rate, GRM, and cost basis — replacing any projected target price from Phase 1.",
      field: 'financials.purchasePrice',
      type: 'currency',
      placeholder: '0.00',
      required: true,
      alert: "This is an ACTUAL figure — it replaces any projected target price from Phase 1.",
    },
    {
      id: 'emdAmount',
      sectionId: 'psa',
      question: "How much earnest money deposit (good-faith deposit)?",
      description: "The earnest money amount held in escrow. This signals commitment to the seller and is credited toward closing costs. Typical range: 1-3% of purchase price.",
      field: 'financials.emdAmount',
      type: 'currency',
      placeholder: '0.00',
      required: false,
    },
    {
      id: 'emdGoHardDate',
      sectionId: 'psa',
      question: "When does the earnest money go hard (become non-refundable)?",
      description: "After this date, the EMD is non-refundable even if you back out. This is your risk deadline — ensure all inspections and contingencies are resolved before this date.",
      field: 'financials.emdGoHardDate',
      type: 'date',
      required: false,
      alert: "After this date, your deposit is at risk. Schedule inspections BEFORE this deadline.",
    },
    {
      id: 'inspectionDeadline',
      sectionId: 'psa',
      question: "Inspection contingency deadline?",
      description: "The last day to complete your property inspection and negotiate repairs or back out. Typically 7-14 days from contract execution.",
      field: 'financials.inspectionDeadline',
      type: 'date',
      required: false,
    },
    {
      id: 'financingDeadline',
      sectionId: 'psa',
      question: "Financing contingency deadline?",
      description: "The last day to secure loan approval. If your financing falls through before this date, you can cancel the contract and get your EMD back.",
      field: 'financials.financingDeadline',
      type: 'date',
      required: false,
      condition: (data: any) => data.financials.financingType !== 'All Cash',
    },
    {
      id: 'appraisalDeadline',
      sectionId: 'psa',
      question: "Appraisal contingency deadline?",
      description: "The last day for the lender's appraisal to come back at or above the purchase price. If it appraises low, you can renegotiate or cancel.",
      field: 'financials.appraisalDeadline',
      type: 'date',
      required: false,
      condition: (data: any) => data.financials.financingType !== 'All Cash',
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // S2: LENDER & LOAN
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
      id: 'financingType',
      sectionId: 'lender',
      question: "How are you financing this acquisition?",
      description: "Select whether you are using debt financing (hard money, conventional, private lender) or paying entirely with cash. All-cash deals skip all loan questions.",
      field: 'financials.financingType',
      type: 'select',
      options: [
        { label: 'Financed (hard money, conventional, private lender)', value: 'Financed' },
        { label: 'All Cash — no loan', value: 'All Cash' },
      ],
      required: true,
    },
    {
      id: 'loanAmount',
      sectionId: 'lender',
      question: "What is the loan amount?",
      description: "Total principal borrowed from your lender. Used to compute monthly debt service, DSCR, and Loan-to-Value ratio.",
      field: 'financials.loanAmount',
      type: 'currency',
      placeholder: '0.00',
      required: true,
      condition: (data: any) => data.financials.financingType === 'Financed',
      marketplaceCTA: "Compare loan estimates from top lenders →",
    },
    {
      id: 'loanInterestRate',
      sectionId: 'lender',
      question: "What is the annual interest rate?",
      description: "The annual percentage rate on your loan. Hard money: 10-14%. Conventional: 6-8%. Private: varies.",
      field: 'financials.loanInterestRate',
      type: 'percentage',
      placeholder: 'e.g., 12',
      required: true,
      condition: (data: any) => data.financials.financingType === 'Financed',
    },
    {
      id: 'loanTermYears',
      sectionId: 'lender',
      question: "What is the loan term (in years)?",
      description: "Hard money: 1-2 years. Conventional: 15 or 30 years. This drives monthly payment and total interest cost.",
      field: 'financials.loanTermYears',
      type: 'integer',
      placeholder: 'e.g., 30',
      required: true,
      condition: (data: any) => data.financials.financingType === 'Financed',
    },
    {
      id: 'loanOriginationPoints',
      sectionId: 'lender',
      question: "How many origination points?",
      description: "Upfront percentage fee charged by the lender (e.g., 2 points = 2% of loan amount). Adds to your true cost of capital.",
      field: 'financials.loanOriginationPoints',
      type: 'percentage',
      placeholder: 'e.g., 2',
      required: false,
      condition: (data: any) => data.financials.financingType === 'Financed',
    },
    {
      id: 'loanProcessorName',
      sectionId: 'lender',
      question: "Who is your loan processor / loan officer?",
      description: "Name of the loan processor or loan officer handling your financing.",
      field: 'financials.loanProcessorName',
      type: 'text',
      placeholder: 'e.g., Jane Smith, ABC Lending',
      required: false,
      condition: (data: any) => data.financials.financingType === 'Financed',
      marketplaceCTA: "Find a lender in your market →",
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // S3: PROPERTY INSPECTION
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
      id: 'inspectionOrdered',
      sectionId: 'inspection',
      question: "Has a property inspection been ordered?",
      description: "A licensed home inspector examines structural integrity, plumbing, electrical, HVAC, roof, and foundation. For pre-1978 homes, consider lead paint and radon testing.",
      field: 'financials.inspectionOrdered',
      type: 'select',
      options: [
        { label: 'Yes — inspection ordered or complete', value: 'yes' },
        { label: 'Not yet — need to schedule', value: 'no' },
      ],
      required: true,
      marketplaceCTA: "Find a licensed inspector near you →",
    },
    {
      id: 'inspectorName',
      sectionId: 'inspection',
      question: "Who is your inspector?",
      description: "Name and firm of your licensed home inspector. They should carry E&O insurance.",
      field: 'financials.inspectorName',
      type: 'text',
      placeholder: 'e.g., Mike Johnson, Premier Inspections',
      required: false,
      condition: (data: any) => data.financials.inspectionOrdered === 'yes',
    },
    {
      id: 'inspectionCost',
      sectionId: 'inspection',
      question: "What was the inspection cost?",
      description: "Standard home inspection: $300-$500. Specialty inspections (pest/termite, radon, mold, sewer scope) are additional.",
      field: 'financials.inspectionCost',
      type: 'currency',
      placeholder: '0.00',
      required: false,
      condition: (data: any) => data.financials.inspectionOrdered === 'yes',
    },
    {
      id: 'inspectionPassed',
      sectionId: 'inspection',
      question: "Did the inspection pass?",
      description: "If issues were found, you can negotiate repairs, request credits, or re-inspect after repairs. A failed inspection may trigger your inspection contingency.",
      field: 'financials.inspectionPassed',
      type: 'select',
      options: [
        { label: 'Pass — no major issues', value: 'pass' },
        { label: 'Pass with repairs negotiated', value: 'pass_with_repairs' },
        { label: 'Fail — major issues found', value: 'fail' },
        { label: 'Pending — awaiting results', value: 'pending' },
      ],
      required: false,
      condition: (data: any) => data.financials.inspectionOrdered === 'yes',
    },
    // ── OLDER HOME BRANCH (pre-1978 environmental tests) ──
    {
      id: 'isOlderHome',
      sectionId: 'inspection',
      question: "Was this home built before 1978?",
      description: "Pre-1978 homes may contain lead-based paint, asbestos, or radon. Federal law requires sellers to disclose known lead paint hazards. Additional specialty inspections are strongly recommended.",
      field: 'financials.isOlderHome',
      type: 'select',
      options: [
        { label: 'Yes — built before 1978', value: 'yes' },
        { label: 'No — built 1978 or later', value: 'no' },
        { label: 'Unknown — need to verify', value: 'unknown' },
      ],
      required: false,
      alert: "Federal disclosure law (42 U.S.C. §4852d) requires lead paint disclosure for pre-1978 homes.",
    },
    {
      id: 'radonTestOrdered',
      sectionId: 'inspection',
      question: "Has a radon test been ordered?",
      description: "Radon is an odorless gas that causes lung cancer. EPA recommends testing ALL homes regardless of age. Cost: $150-$300. Mitigation if elevated: $800-$1,500.",
      field: 'financials.radonTestOrdered',
      type: 'select',
      options: [
        { label: 'Yes — ordered or complete', value: 'yes' },
        { label: 'Not yet — need to schedule', value: 'no' },
      ],
      required: false,
      condition: (data: any) => data.financials.isOlderHome === 'yes' || data.financials.isOlderHome === 'unknown',
      marketplaceCTA: "Find a radon testing company →",
    },
    {
      id: 'leadPaintTestOrdered',
      sectionId: 'inspection',
      question: "Has a lead paint inspection been ordered?",
      description: "Required for pre-1978 homes if using FHA/VA financing. XRF testing ($300-$500) or paint chip analysis. Lead abatement costs $8,000-$15,000 if found.",
      field: 'financials.leadPaintTestOrdered',
      type: 'select',
      options: [
        { label: 'Yes — ordered or complete', value: 'yes' },
        { label: 'Not yet — need to schedule', value: 'no' },
        { label: 'Waived — seller disclosure accepted', value: 'waived' },
      ],
      required: false,
      condition: (data: any) => data.financials.isOlderHome === 'yes' || data.financials.isOlderHome === 'unknown',
      marketplaceCTA: "Find a lead paint inspector →",
    },
    {
      id: 'termiteInspectionOrdered',
      sectionId: 'inspection',
      question: "Has a termite / wood-destroying organism (WDO) inspection been ordered?",
      description: "Required in many states and for VA/FHA loans. Also called a WDI (Wood Destroying Insect) report. Cost: $75-$150. Treatment if infested: $1,500-$5,000.",
      field: 'financials.termiteInspectionOrdered',
      type: 'select',
      options: [
        { label: 'Yes — ordered or complete', value: 'yes' },
        { label: 'Not yet — need to schedule', value: 'no' },
        { label: 'N/A — not required in this state', value: 'na' },
      ],
      required: false,
      condition: (data: any) => data.financials.isOlderHome === 'yes' || data.financials.isOlderHome === 'unknown',
      marketplaceCTA: "Find a pest/termite inspector →",
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // S4: TITLE SEARCH & SURVEY
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
      id: 'titleCompanyName',
      sectionId: 'title',
      question: "Who is your title company / escrow officer?",
      description: "The title company performs the title search, issues title insurance, and handles the escrow/closing process.",
      field: 'financials.titleCompanyName',
      type: 'text',
      placeholder: 'e.g., First American Title',
      required: false,
      marketplaceCTA: "Find a title company in your area →",
    },
    {
      id: 'titleSearchCost',
      sectionId: 'title',
      question: "What is the title search & insurance cost?",
      description: "Title search fee ($150-$400) plus owner's and lender's title insurance policies. This protects against liens, encumbrances, and ownership disputes.",
      field: 'financials.titleSearchCost',
      type: 'currency',
      placeholder: '0.00',
      required: false,
    },
    {
      id: 'liensFound',
      sectionId: 'title',
      question: "Were any liens or encumbrances found?",
      description: "The title search reveals existing liens (tax, mechanic's, judgment), easements, or other encumbrances. These must be cleared before closing.",
      field: 'financials.liensFound',
      type: 'select',
      options: [
        { label: 'Clear — no liens or issues', value: 'clear' },
        { label: 'Liens found — being resolved', value: 'liens_found' },
        { label: 'Pending title search', value: 'pending' },
      ],
      required: false,
    },
    {
      id: 'surveyOrdered',
      sectionId: 'title',
      question: "Has a property survey been ordered?",
      description: "A survey confirms lot boundaries, easements, setbacks, and encroachments. Required by most lenders and title companies.",
      field: 'financials.surveyOrdered',
      type: 'select',
      options: [
        { label: 'Yes — survey ordered or complete', value: 'yes' },
        { label: 'Not yet — need to order', value: 'no' },
        { label: 'Using existing survey', value: 'existing' },
      ],
      required: false,
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // S5: INSURANCE & HOA
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
      id: 'insuranceProvider',
      sectionId: 'insurance',
      question: "Who is your insurance provider?",
      description: "Hazard insurance (homeowner's insurance) is required by all lenders. Get quotes from at least 3 providers.",
      field: 'financials.insuranceProvider',
      type: 'text',
      placeholder: 'e.g., State Farm, Allstate',
      required: false,
      marketplaceCTA: "Compare insurance quotes →",
    },
    {
      id: 'insuranceCost',
      sectionId: 'insurance',
      question: "What is the annual insurance premium?",
      description: "Your total annual hazard insurance cost. This becomes a monthly holding cost (premium ÷ 12).",
      field: 'financials.insuranceCost',
      type: 'currency',
      placeholder: '0.00',
      required: false,
    },
    {
      id: 'floodRider',
      sectionId: 'insurance',
      question: "Does the property need flood or earthquake insurance?",
      description: "Properties in FEMA flood zones require separate flood insurance. Earthquake coverage is recommended in seismic zones.",
      field: 'financials.floodRider',
      type: 'select',
      options: [
        { label: 'No — standard hazard coverage only', value: 'no' },
        { label: 'Yes — flood insurance required', value: 'flood' },
        { label: 'Yes — earthquake insurance required', value: 'earthquake' },
        { label: 'Yes — both flood and earthquake', value: 'both' },
      ],
      required: false,
    },
    {
      id: 'hoaMonthly',
      sectionId: 'insurance',
      question: "Monthly HOA / condo association fees?",
      description: "If the property is in an HOA or condo association, enter the monthly dues. Enter 0 if no HOA. This is a recurring holding cost.",
      field: 'financials.hoaMonthly',
      type: 'currency',
      placeholder: '0.00',
      required: false,
    },
    {
      id: 'hoaCCRsReviewed',
      sectionId: 'insurance',
      question: "Have you reviewed the HOA CC&Rs (Covenants, Conditions & Restrictions)?",
      description: "CC&Rs govern what you can and cannot do with the property (rental restrictions, renovation rules, pet policies). Review BEFORE closing.",
      field: 'financials.hoaCCRsReviewed',
      type: 'select',
      options: [
        { label: 'Yes — reviewed and acceptable', value: 'yes' },
        { label: 'Not yet — need to request', value: 'no' },
        { label: 'N/A — no HOA', value: 'na' },
      ],
      required: false,
      condition: (data: any) => {
        const hoa = Number(data.financials.hoaMonthly);
        return hoa > 0;
      },
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // S6: CLOSING DISCLOSURE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
      id: 'closingCosts',
      sectionId: 'disclosure',
      question: "What are the total closing costs?",
      description: "All buy-side closing costs from the Closing Disclosure: title insurance, escrow fees, recording fees, transfer taxes, attorney fees, and lender charges. Capitalized into cost basis.",
      field: 'financials.closingCosts',
      type: 'currency',
      placeholder: '0.00',
      required: true,
    },
    {
      id: 'closingDisclosureReviewed',
      sectionId: 'disclosure',
      question: "Have you reviewed the Closing Disclosure (CD)?",
      description: "Your lender must provide the CD at least 3 business days before closing. Compare it line-by-line against your Loan Estimate. Flag any changes in fees, rate, or APR.",
      field: 'financials.closingDisclosureReviewed',
      type: 'select',
      options: [
        { label: 'Yes — reviewed and approved', value: 'yes' },
        { label: 'Not yet — awaiting CD', value: 'no' },
      ],
      required: false,
      condition: (data: any) => data.financials.financingType === 'Financed',
    },
    {
      id: 'finalAPR',
      sectionId: 'disclosure',
      question: "What is the final APR?",
      description: "The Annual Percentage Rate includes interest rate plus all lender fees. This is the true cost of borrowing — compare against your original Loan Estimate.",
      field: 'financials.finalAPR',
      type: 'percentage',
      placeholder: 'e.g., 12.5',
      required: false,
      condition: (data: any) => data.financials.financingType === 'Financed',
    },
    {
      id: 'clearToClose',
      sectionId: 'disclosure',
      question: "Are you clear to close?",
      description: "This milestone means all conditions are satisfied: loan approved, title clear, insurance bound, inspections resolved, and closing disclosure reviewed. This gates the transition to Phase 3.",
      field: 'financials.clearToClose',
      type: 'select',
      options: [
        { label: 'Yes — clear to close', value: 'yes' },
        { label: 'Not yet — conditions outstanding', value: 'no' },
      ],
      required: true,
      alert: "Setting this to 'Yes' enables the Phase 2 → Phase 3 transition.",
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // S7: VENDORS & CLOSING DATE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
      id: 'closingAttorneyName',
      sectionId: 'vendors',
      question: "Who is your real estate closing attorney?",
      description: "The attorney handling closing, title work, and legal review.",
      field: 'financials.closingAttorneyName',
      type: 'text',
      placeholder: 'e.g., John Doe, Doe Legal Group',
      required: false,
      marketplaceCTA: "Find a real estate attorney →",
    },
    {
      id: 'acquisitionDate',
      sectionId: 'vendors',
      question: "What is the closing / acquisition date?",
      description: "The date the property officially closes and title transfers. This anchors ALL time-based metrics: IRR timeline, holding cost clock, and days-on-market calculations.",
      field: 'financials.acquisitionDate',
      type: 'date',
      required: true,
      alert: "This date starts the holding cost clock and IRR timeline.",
    },
    {
      id: 'totalCashInvested',
      sectionId: 'vendors',
      question: "Total cash you put in (down payment + closing costs)?",
      description: "Your total out-of-pocket investment at the closing table. This is the denominator for Cash-on-Cash Return and the t₀ outflow for IRR.",
      field: 'financials.totalCashInvested',
      type: 'currency',
      placeholder: '0.00',
      required: true,
    },
  ], []);

  // ── Active steps filtered by conditions ─────────────────────
  const activeSteps = useMemo(() => {
    return steps.filter(s => !s.condition || s.condition(formData));
  }, [steps, formData]);

  // ── Steps grouped by section ────────────────────────────────
  const activeSection = SECTIONS[activeSectionIndex];
  const sectionSteps = useMemo(() => {
    return activeSteps.filter(s => s.sectionId === activeSection?.id);
  }, [activeSteps, activeSection]);

  const activeStep = sectionSteps[currentStepIndex] || null;

  // ── Value helpers ───────────────────────────────────────────
  const getValue = (path: string) => {
    const parts = path.split('.');
    let current: any = formData;
    for (const part of parts) {
      if (current === undefined || current === null) return '';
      current = current[part];
    }
    return current ?? '';
  };

  const updateValue = (path: string, val: any) => {
    setFormData((prev: any) => {
      const copy = JSON.parse(JSON.stringify(prev));
      const parts = path.split('.');
      let current = copy;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) current[parts[i]] = {};
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = val;
      return copy;
    });
  };

  // ── Monthly Debt Service Preview ────────────────────────────
  const monthlyDebtService = useMemo(() => {
    const principal = Number(formData.financials.loanAmount) || 0;
    const annualRate = Number(formData.financials.loanInterestRate) || 0;
    const termYears = Number(formData.financials.loanTermYears) || 0;
    if (principal <= 0 || annualRate <= 0 || termYears <= 0) return 0;
    const monthlyRate = annualRate / 100 / 12;
    const numPayments = termYears * 12;
    const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
    return Math.round(payment);
  }, [formData.financials.loanAmount, formData.financials.loanInterestRate, formData.financials.loanTermYears]);

  // ── Section Progress ────────────────────────────────────────
  const getSectionProgress = useCallback((sectionId: string): 'complete' | 'active' | 'pending' => {
    if (completedSections.has(sectionId)) return 'complete';
    if (SECTIONS[activeSectionIndex]?.id === sectionId) return 'active';
    return 'pending';
  }, [completedSections, activeSectionIndex]);

  // ── Generate Artifacts (Contingencies, DueDiligence, Documents) ──
  const generateArtifacts = useCallback(() => {
    const f = formData.financials;
    const now = new Date();

    // Contingency records from S1
    const contingencies: Contingency[] = [];
    if (f.inspectionDeadline) {
      contingencies.push({
        id: `contingency-inspection-${Date.now()}`,
        type: 'Inspection',
        deadlineDate: new Date(f.inspectionDeadline),
        isWaived: false,
        isSatisfied: f.inspectionPassed === 'pass' || f.inspectionPassed === 'pass_with_repairs',
      });
    }
    if (f.financingDeadline && f.financingType === 'Financed') {
      contingencies.push({
        id: `contingency-financing-${Date.now()}`,
        type: 'Financing',
        deadlineDate: new Date(f.financingDeadline),
        isWaived: false,
        isSatisfied: f.clearToClose === 'yes',
      });
    }
    if (f.appraisalDeadline && f.financingType === 'Financed') {
      contingencies.push({
        id: `contingency-appraisal-${Date.now()}`,
        type: 'Appraisal',
        deadlineDate: new Date(f.appraisalDeadline),
        isWaived: false,
        isSatisfied: f.clearToClose === 'yes',
      });
    }

    // Due Diligence items
    const ddItems: DueDiligenceItem[] = [
      { id: `dd-loan-compare-${Date.now()}`, label: 'Compare Loan Estimates', completed: f.financingType === 'All Cash' || !!f.loanAmount, completedAt: f.loanAmount ? now : undefined },
      { id: `dd-inspection-${Date.now()}`, label: 'Property Inspection', completed: f.inspectionOrdered === 'yes', completedAt: f.inspectionOrdered === 'yes' ? now : undefined },
      { id: `dd-title-${Date.now()}`, label: 'Title Search & Commitment', completed: f.liensFound === 'clear', completedAt: f.liensFound === 'clear' ? now : undefined },
      { id: `dd-survey-${Date.now()}`, label: 'Survey', completed: f.surveyOrdered === 'yes' || f.surveyOrdered === 'existing', completedAt: (f.surveyOrdered === 'yes' || f.surveyOrdered === 'existing') ? now : undefined },
      { id: `dd-insurance-${Date.now()}`, label: 'Homeowners Insurance', completed: !!f.insuranceCost, completedAt: f.insuranceCost ? now : undefined },
      { id: `dd-closing-disclosure-${Date.now()}`, label: 'Closing Disclosure Review', completed: f.closingDisclosureReviewed === 'yes' || f.financingType === 'All Cash', completedAt: (f.closingDisclosureReviewed === 'yes' || f.financingType === 'All Cash') ? now : undefined },
    ];

    // Older-home environmental test DD items (guardrail: pre-1978 triggers these)
    if (f.isOlderHome === 'yes' || f.isOlderHome === 'unknown') {
      ddItems.push(
        { id: `dd-radon-${Date.now()}`, label: 'Radon Test', completed: f.radonTestOrdered === 'yes', completedAt: f.radonTestOrdered === 'yes' ? now : undefined },
        { id: `dd-lead-paint-${Date.now()}`, label: 'Lead Paint Inspection', completed: f.leadPaintTestOrdered === 'yes' || f.leadPaintTestOrdered === 'waived', completedAt: (f.leadPaintTestOrdered === 'yes' || f.leadPaintTestOrdered === 'waived') ? now : undefined },
        { id: `dd-termite-${Date.now()}`, label: 'Termite / WDO Inspection', completed: f.termiteInspectionOrdered === 'yes' || f.termiteInspectionOrdered === 'na', completedAt: (f.termiteInspectionOrdered === 'yes' || f.termiteInspectionOrdered === 'na') ? now : undefined },
      );
    }

    // Only add HOA CC&Rs if HOA exists
    if (Number(f.hoaMonthly) > 0) {
      ddItems.push({
        id: `dd-hoa-ccrs-${Date.now()}`,
        label: 'HOA CC&Rs Review',
        completed: f.hoaCCRsReviewed === 'yes',
        completedAt: f.hoaCCRsReviewed === 'yes' ? now : undefined,
      });
    }

    // Document requests — each diligence step generates a file todo
    const docRequests: RoleLinkedDocument[] = [];
    const makeDoc = (category: RoleLinkedDocument['category'], linkedRole: ProjectRole, notes: string): RoleLinkedDocument => ({
      id: `doc-${category.toLowerCase().replace(/\s/g, '-')}-${Date.now()}`,
      category,
      fileName: `${category} — ${deal.address || 'Property'}`,
      linkedRole,
      verified: false,
      notes,
    });

    // S1: P&S Agreement upload
    docRequests.push(makeDoc('Buyer Agreements', 'Real Estate Agent', 'Upload the fully executed Purchase & Sale Agreement'));

    // S2: Loan Estimate comparison
    if (f.financingType === 'Financed') {
      docRequests.push(makeDoc('Loan Estimate', 'Loan Officer/Broker', 'Upload Loan Estimates from your top 2-3 lenders for comparison'));
    }

    // S3: Inspection report
    if (f.inspectionOrdered === 'yes') {
      docRequests.push(makeDoc('Inspection Report', 'Appraiser', 'Upload the full inspection report'));
    }

    // S3: Environmental report for older homes
    if (f.isOlderHome === 'yes' || f.isOlderHome === 'unknown') {
      docRequests.push(makeDoc('Environmental Report', 'Appraiser', 'Upload radon, lead paint, and/or termite inspection reports'));
    }

    // S4: Title & Survey
    docRequests.push(makeDoc('Title Commitment', 'Title Company/Escrow Officer', 'Upload the title commitment / preliminary title report'));
    docRequests.push(makeDoc('Survey', 'Title Company/Escrow Officer', 'Upload the property survey'));

    // S5: Insurance binder
    docRequests.push(makeDoc('Insurance Binder', 'Loan Officer/Broker', 'Upload proof of insurance / insurance binder'));

    // S5: HOA CC&Rs
    if (Number(f.hoaMonthly) > 0) {
      docRequests.push(makeDoc('General Sale Disclosures', 'Real Estate Agent', 'Upload HOA CC&Rs, bylaws, and meeting minutes'));
    }

    // S6: Closing Disclosure
    if (f.financingType === 'Financed') {
      docRequests.push(makeDoc('Closing Disclosure', 'Closing Agent', 'Upload the final Closing Disclosure (CD)'));
    }

    // S7: Settlement statement (for all deals)
    docRequests.push(makeDoc('Final Settlement Statement', 'Closing Agent', 'Upload the HUD-1 / ALTA Settlement Statement'));

    return { contingencies, ddItems, docRequests };
  }, [formData, deal.address]);

  // ── Save Handler ────────────────────────────────────────────
  const handleSave = async () => {
    if (!user) return;
    try {
      setIsSaving(true);
      const f = formData.financials;

      const toNum = (v: any): number | undefined => {
        if (v === '' || v === null || v === undefined) return undefined;
        const n = Number(v);
        return isNaN(n) ? undefined : n;
      };

      const toDate = (v: any): Date | null => {
        if (!v) return null;
        return new Date(v);
      };

      const purchasePrice = toNum(f.purchasePrice) ?? 0;
      const closingCosts = toNum(f.closingCosts) ?? 0;
      const inspectionCost = toNum(f.inspectionCost) ?? 0;
      const titleSearchCost = toNum(f.titleSearchCost) ?? 0;
      const insuranceCost = toNum(f.insuranceCost) ?? 0;
      const hoaMonthly = toNum(f.hoaMonthly) ?? 0;
      const totalCashInvested = toNum(f.totalCashInvested) ?? 0;

      const isFinanced = f.financingType === 'Financed';
      const loanAmount = isFinanced ? (toNum(f.loanAmount) ?? 0) : 0;
      const loanInterestRate = isFinanced ? (toNum(f.loanInterestRate) ?? 0) : 0;
      const loanTermYears = isFinanced ? (toNum(f.loanTermYears) ?? 0) : 0;
      const loanOriginationPoints = isFinanced ? (toNum(f.loanOriginationPoints) ?? 0) : 0;

      const isClearToClose = f.clearToClose === 'yes' || isBackdated;

      // Capitalized basis: purchase + closing + inspection + title
      const initialCapitalizedBasis = purchasePrice + closingCosts + inspectionCost + titleSearchCost;

      // Derive monthly holding cost from annual insurance
      const monthlyInsuranceFromAnnual = insuranceCost > 0 ? Math.round(insuranceCost / 12) : undefined;

      // Generate artifacts
      const { contingencies, ddItems, docRequests } = generateArtifacts();

      // Merge artifacts — don't overwrite existing ones, only add new
      const existingContingencyTypes = new Set((deal.contingencies || []).map(c => c.type));
      const newContingencies = contingencies.filter(c => !existingContingencyTypes.has(c.type));
      const mergedContingencies = [...(deal.contingencies || []), ...newContingencies];

      const existingDDLabels = new Set((deal.dueDiligenceChecklist || []).map(d => d.label));
      const newDDItems = ddItems.filter(d => !existingDDLabels.has(d.label));
      // Update existing items' completion status
      const updatedExisting = (deal.dueDiligenceChecklist || []).map(existing => {
        const matching = ddItems.find(d => d.label === existing.label);
        if (matching && matching.completed && !existing.completed) {
          return { ...existing, completed: true, completedAt: new Date() };
        }
        return existing;
      });
      const mergedDD = [...updatedExisting, ...newDDItems];

      const existingDocCategories = new Set((deal.roleLinkedDocuments || []).map(d => d.category));
      const newDocs = docRequests.filter(d => !existingDocCategories.has(d.category));
      const mergedDocs = [...(deal.roleLinkedDocuments || []), ...newDocs];

      const updates: Partial<Project> = {
        isClearToClose,
        contingencies: mergedContingencies,
        dueDiligenceChecklist: mergedDD,
        roleLinkedDocuments: mergedDocs,
        financials: {
          ...deal.financials,

          // S1: Purchase & P&S
          purchasePrice,
          emdAmount: toNum(f.emdAmount),
          emdGoHardDate: toDate(f.emdGoHardDate) ?? undefined,

          // S2: Financing
          financingType: f.financingType || undefined,
          loanAmount,
          loanInterestRate,
          loanTermYears,
          loanOriginationPoints,
          loanProcessorName: isFinanced ? (f.loanProcessorName || undefined) : undefined,

          // S3: Inspection
          inspectionCost: inspectionCost || undefined,

          // S4: Title
          titleSearchCost: titleSearchCost || undefined,

          // S5: Insurance & HOA
          insuranceCost: insuranceCost || undefined,
          hoaMonthly: hoaMonthly || undefined,
          monthlyHOA: hoaMonthly || undefined, // Sync canonical field
          holdingCostInsurance: monthlyInsuranceFromAnnual ?? deal.financials?.holdingCostInsurance,

          // S6: Closing
          closingCosts,
          fixedAcquisitionCosts: closingCosts, // Sync for MAO formula
          totalCashInvested,
          financingCashInvested: totalCashInvested, // Sync for CoC return

          // S7: Vendors & Date
          closingAttorneyName: f.closingAttorneyName || undefined,
          acquisitionDate: toDate(f.acquisitionDate) ?? undefined,

          // Computed
          initialCapitalizedBasis,

          // Preserve existing arrays
          costs: deal.financials?.costs ?? [],
        },
      };

      await projectsService.updateProject(deal.id, updates);

      // ── Wire Contingency Deadlines → Notification Center ──
      // Fire DEADLINE_ALERT for each contingency with a future deadline
      if (user?.uid) {
        for (const c of mergedContingencies) {
          if (c.deadlineDate && !c.isSatisfied && !c.isWaived) {
            const deadline = c.deadlineDate instanceof Date ? c.deadlineDate : new Date(c.deadlineDate);
            const now = new Date();
            if (deadline > now) {
              const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              try {
                const idToken = await user.getIdToken();
                await fetch('/api/notifications/deadline-alert', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`,
                  },
                  body: JSON.stringify({
                    recipientId: user.uid,
                    projectId: deal.id,
                    dealAddress: deal.address || 'Property',
                    contingencyType: c.type,
                    deadlineDate: deadline.toISOString(),
                    daysUntil,
                  }),
                });
              } catch (notifErr) {
                // Non-blocking — don't break save on notification failure
                console.warn('[PurchaseInterview] Deadline notification failed:', notifErr);
              }
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to save progress.");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Section Navigation ──────────────────────────────────────
  const handleNextStep = async () => {
    if (!activeStep) return;

    const value = getValue(activeStep.field);
    if (activeStep.required && (value === '' || value === undefined || value === null)) {
      toast.error("This field is required.");
      return;
    }

    if (currentStepIndex < sectionSteps.length - 1) {
      // Move to next step in section
      setCurrentStepIndex(prev => prev + 1);
      // Save on each next
      await handleSave();
    } else {
      // Section complete — save & mark
      await handleSave();
      setCompletedSections(prev => new Set([...prev, activeSection.id]));

      if (activeSectionIndex < SECTIONS.length - 1) {
        setActiveSectionIndex(prev => prev + 1);
        setCurrentStepIndex(0);
        toast.success(`${activeSection.title} — Complete ✓`);
      } else {
        toast.success("Purchase diligence complete! All sections captured.");
      }
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    } else if (activeSectionIndex > 0) {
      // Go back to previous section's last step
      const prevSectionId = SECTIONS[activeSectionIndex - 1].id;
      const prevSectionSteps = activeSteps.filter(s => s.sectionId === prevSectionId);
      setActiveSectionIndex(prev => prev - 1);
      setCurrentStepIndex(prevSectionSteps.length - 1);
    }
  };

  const jumpToSection = (index: number) => {
    setActiveSectionIndex(index);
    setCurrentStepIndex(0);
  };

  // ── Advance Criteria Checklist ──────────────────────────────
  const advanceCriteria = useMemo(() => {
    const f = formData.financials;
    const criteria = [
      { label: 'Actual Purchase Price', met: (Number(f.purchasePrice) || 0) > 0 },
      { label: 'Total Cash Invested', met: (Number(f.totalCashInvested) || 0) > 0 },
      { label: 'Closing / Acquisition Date', met: !!f.acquisitionDate },
      { label: 'Clear to Close', met: f.clearToClose === 'yes' || isBackdated },
    ];
    if (f.financingType === 'Financed') {
      criteria.splice(1, 0,
        { label: 'Loan Amount', met: (Number(f.loanAmount) || 0) > 0 },
        { label: 'Interest Rate', met: (Number(f.loanInterestRate) || 0) > 0 },
        { label: 'Loan Term', met: (Number(f.loanTermYears) || 0) > 0 },
      );
    }
    return criteria;
  }, [formData, isBackdated]);

  const allCriteriaMet = advanceCriteria.every(c => c.met);

  const isLastStepInSection = currentStepIndex === sectionSteps.length - 1;
  const isLastSection = activeSectionIndex === SECTIONS.length - 1;
  const isVeryLast = isLastStepInSection && isLastSection;

  // ── Render Input ────────────────────────────────────────────
  const renderInput = () => {
    if (!activeStep) return null;
    const value = getValue(activeStep.field);

    switch (activeStep.type) {
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => updateValue(activeStep.field, e.target.value)}
            className="pw-input text-lg py-3 px-4 w-full max-w-lg border border-pw-black rounded-none focus:outline-none"
          >
            <option value="" disabled>Select an option</option>
            {activeStep.options?.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        );
      case 'currency':
        return (
          <div className="relative w-full max-w-lg">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-medium text-text-secondary">$</span>
            <input
              type="number"
              value={value}
              onChange={(e) => updateValue(activeStep.field, e.target.value)}
              placeholder={activeStep.placeholder}
              className="pw-input text-lg py-3 pl-10 pr-4 w-full border border-pw-black rounded-none focus:outline-none tabular-nums"
            />
          </div>
        );
      case 'percentage':
        return (
          <div className="relative w-full max-w-lg">
            <input
              type="number"
              value={value}
              onChange={(e) => updateValue(activeStep.field, e.target.value)}
              placeholder={activeStep.placeholder}
              className="pw-input text-lg py-3 pl-4 pr-10 w-full border border-pw-black rounded-none focus:outline-none tabular-nums"
              min="0"
              step="0.1"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-medium text-text-secondary">%</span>
          </div>
        );
      case 'integer':
        return (
          <div className="relative w-full max-w-lg">
            <input
              type="number"
              value={value}
              onChange={(e) => updateValue(activeStep.field, e.target.value)}
              placeholder={activeStep.placeholder}
              className="pw-input text-lg py-3 px-4 w-full border border-pw-black rounded-none focus:outline-none tabular-nums"
              min="0"
            />
          </div>
        );
      case 'date':
        return (
          <div className="relative w-full max-w-lg">
            <input
              type="date"
              value={value}
              onChange={(e) => updateValue(activeStep.field, e.target.value)}
              className="pw-input text-lg py-3 px-4 w-full border border-pw-black rounded-none focus:outline-none"
            />
          </div>
        );
      case 'boolean':
      case 'text':
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => updateValue(activeStep.field, e.target.value)}
            placeholder={activeStep.placeholder}
            className="pw-input text-lg py-3 px-4 w-full max-w-lg border border-pw-black rounded-none focus:outline-none"
          />
        );
    }
  };

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════

  return (
    <div className="bg-pw-white border border-pw-black p-6 md:p-8 rounded-none text-left shadow-sm mb-8 w-full max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex justify-between items-center border-b border-pw-border pb-4 mb-6">
        <div>
          <h2 className="text-xs font-black uppercase tracking-[0.18em] text-text-primary">Purchase Due Diligence</h2>
          <p className="text-[10px] text-text-secondary font-semibold uppercase mt-0.5 tracking-wider">
            {isBackdated ? 'REVIEW MODE — ACTUALS PRE-POPULATED' : 'GUIDED DILIGENCE SEQUENCE'}
          </p>
        </div>
        <div className="text-[11px] font-mono text-text-secondary bg-pw-bg px-2.5 py-1 border border-pw-border">
          S{activeSectionIndex + 1}.{currentStepIndex + 1} — {activeSection?.title}
        </div>
      </div>

      {/* Section Progress Bar */}
      <div className="flex items-center gap-1 mb-8">
        {SECTIONS.map((section, i) => {
          const progress = getSectionProgress(section.id);
          return (
            <button
              key={section.id}
              onClick={() => jumpToSection(i)}
              className={`
                flex-1 h-9 flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] transition-all cursor-pointer border
                ${progress === 'complete'
                  ? 'bg-black text-white border-black'
                  : progress === 'active'
                    ? 'bg-pw-bg text-text-primary border-pw-black'
                    : 'bg-transparent text-text-secondary/50 border-pw-border hover:bg-pw-bg/50'
                }
              `}
              title={section.title}
            >
              {progress === 'complete' ? (
                <CheckCircle className="w-3 h-3" />
              ) : (
                <span>{i + 1}</span>
              )}
              <span className="hidden md:inline truncate">{section.title.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>

      {/* Active Question */}
      {activeStep && (
        <div className="space-y-6">
          {/* Section label */}
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary/50">
            {activeSection?.icon}
            <span>{activeSection?.title}</span>
            <span className="ml-auto">Step {currentStepIndex + 1} of {sectionSteps.length}</span>
          </div>

          {/* Question */}
          <div className="space-y-2">
            <h3 className="text-xl font-light tracking-tight text-text-primary">
              {activeStep.question}
            </h3>
            {activeStep.description && (
              <p className="text-sm text-text-secondary max-w-xl">{activeStep.description}</p>
            )}
          </div>

          {/* Alert callout */}
          {activeStep.alert && (
            <div className="flex items-start gap-3 p-4 bg-pw-bg border border-pw-border max-w-lg text-xs leading-relaxed text-text-secondary">
              <AlertTriangle className="w-4 h-4 text-text-primary flex-shrink-0 mt-0.5" />
              <div>{activeStep.alert}</div>
            </div>
          )}

          {/* Input */}
          <div className="pt-2">
            {renderInput()}
          </div>

          {/* Monthly Debt Service Preview — S2 loan term step */}
          {activeStep.id === 'loanTermYears' && monthlyDebtService > 0 && (
            <div className="flex items-start gap-3 p-4 bg-pw-bg border border-pw-border max-w-lg text-xs leading-relaxed text-text-secondary">
              <Info className="w-4 h-4 text-text-primary flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-text-primary">Monthly Debt Service Preview:</span> Based on a ${Number(formData.financials.loanAmount).toLocaleString()} loan at {formData.financials.loanInterestRate}% for {formData.financials.loanTermYears} years, your estimated monthly payment is <span className="font-bold text-text-primary">${monthlyDebtService.toLocaleString()}</span>/mo.
              </div>
            </div>
          )}

          {/* All-Cash confirmation */}
          {activeStep.id === 'financingType' && formData.financials.financingType === 'All Cash' && (
            <div className="flex items-start gap-3 p-4 bg-pw-bg border border-pw-border max-w-lg text-xs leading-relaxed text-text-secondary">
              <Info className="w-4 h-4 text-text-primary flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-text-primary">All-Cash Deal:</span> Loan questions, financing contingency, and Closing Disclosure APR will be skipped. DSCR will display as N/A.
              </div>
            </div>
          )}

          {/* Marketplace CTA Placeholder */}
          {activeStep.marketplaceCTA && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-pw-bg/50 border border-dashed border-pw-border max-w-lg text-xs text-text-secondary/60 cursor-not-allowed">
              <Search className="w-3.5 h-3.5" />
              <span>{activeStep.marketplaceCTA}</span>
              <span className="ml-auto text-[9px] font-bold uppercase tracking-widest opacity-40">Coming Soon</span>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-6 border-t border-pw-border mt-8">
            <button
              onClick={handlePrevStep}
              disabled={activeSectionIndex === 0 && currentStepIndex === 0}
              className="pw-btn pw-btn--sm pw-btn--secondary font-bold uppercase tracking-widest text-[11px] flex items-center gap-1.5 disabled:opacity-30"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Back
            </button>
            <div className="flex items-center gap-3">
              {!activeStep.required && (
                <button
                  onClick={() => {
                    if (currentStepIndex < sectionSteps.length - 1) {
                      setCurrentStepIndex(prev => prev + 1);
                    } else {
                      handleNextStep();
                    }
                  }}
                  className="text-xs text-text-secondary hover:text-text-primary px-3 py-1 font-medium"
                >
                  Skip
                </button>
              )}
              <button
                onClick={handleNextStep}
                disabled={isSaving}
                className="pw-btn pw-btn--sm pw-btn--primary font-bold uppercase tracking-widest text-[11px] flex items-center gap-1.5"
              >
                {isSaving ? 'Saving...' : isVeryLast ? 'Complete Purchase Setup' : isLastStepInSection ? `Complete ${activeSection?.title.split(' ')[0]}` : 'Next'}
                {!isVeryLast && <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Advance Criteria Checklist — shown at bottom when not all met */}
      <div className="mt-8 pt-6 border-t border-pw-border">
        <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary/50 mb-3">
          Phase 2 → Phase 3 Requirements
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {advanceCriteria.map(c => (
            <div key={c.label} className="flex items-center gap-2 text-xs">
              {c.met ? (
                <CheckCircle className="w-3.5 h-3.5 text-text-primary" />
              ) : (
                <Circle className="w-3.5 h-3.5 text-text-secondary/30" />
              )}
              <span className={c.met ? 'text-text-primary' : 'text-text-secondary/50'}>{c.label}</span>
            </div>
          ))}
        </div>
        {allCriteriaMet && (
          <p className="text-xs text-text-primary font-bold mt-3">
            ✓ All criteria met — ready to advance to Phase 3: Hold & Rehab
          </p>
        )}
      </div>
    </div>
  );
}
