'use client';

import React, { useState, useCallback } from 'react';
import {
  FileText, Sparkles, RefreshCw, Check, ChevronDown, ChevronRight,
  Loader2, AlertTriangle, CheckCircle,
} from 'lucide-react';
import { OCRConfirmField } from './OCRConfirmField';
import { getConfidenceTier } from '@/lib/ocr/types';
import type { ExtractedFields } from '@/lib/ocr/types';
import { auth } from '@/lib/firebase/config';
import toast from 'react-hot-toast';

/* ═══════════════════════════════════════════════════════
   OCRReviewPanel — Document Extraction Review

   Renders all extracted fields from OCR with per-field
   confirm/edit/reject actions. Supports:
     - Bulk confirm all high-confidence fields
     - Per-field confirm with edit override
     - Reprocess (re-OCR) trigger
     - Expandable/collapsible layout

   Used inside DocumentVault after OCR completes.
   ═══════════════════════════════════════════════════════ */

interface OCRReviewPanelProps {
  docId: string;
  projectId: string;
  documentName: string;
  extractedFields: ExtractedFields;
  overallConfidence: number;
  ocrStatus: 'pending' | 'processing' | 'complete' | 'failed';
  onFieldConfirm: (docId: string, fieldName: string, value: any) => void;
  onReprocess: (docId: string) => void;
  onBulkConfirm: (docId: string, fields: Record<string, any>) => void;
}

/** Human-readable labels for extracted field names */
const FIELD_LABELS: Record<string, string> = {
  purchasePrice: 'Purchase Price',
  loanAmount: 'Loan Amount',
  interestRate: 'Interest Rate (%)',
  loanTerm: 'Loan Term (months)',
  closingCosts: 'Total Closing Costs',
  monthlyPayment: 'Monthly Payment',
  closingDate: 'Closing Date',
  propertyAddress: 'Property Address',
  borrowerName: 'Borrower Name',
  lenderName: 'Lender Name',
  vendor: 'Vendor',
  amount: 'Amount',
  date: 'Date',
  category: 'Category',
  description: 'Description',
  paymentMethod: 'Payment Method',
  tenantName: 'Tenant Name',
  startDate: 'Start Date',
  endDate: 'End Date',
  monthlyRent: 'Monthly Rent',
  securityDeposit: 'Security Deposit',
  landlordName: 'Landlord Name',
  inspectorName: 'Inspector Name',
  inspectionDate: 'Inspection Date',
  overallCondition: 'Overall Condition',
  majorFindings: 'Major Findings',
  estimatedRepairCost: 'Estimated Repair Cost',
  appraiserName: 'Appraiser Name',
  appraisalDate: 'Appraisal Date',
  appraised_value: 'Appraised Value',
  comparablesSummary: 'Comparables Summary',
  contractorName: 'Contractor Name',
  bidDate: 'Bid Date',
  totalAmount: 'Total Amount',
  laborCost: 'Labor Cost',
  materialsCost: 'Materials Cost',
  scopeOfWork: 'Scope of Work',
  ownerName: 'Owner Name',
  lienAmount: 'Lien Amount',
  encumbrances: 'Encumbrances',
  titleCompany: 'Title Company',
  effectiveDate: 'Effective Date',
  documentTitle: 'Document Title',
  summary: 'Summary',
};

function formatFieldValue(value: string | number | null): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') {
    // Format currency-like numbers
    if (value >= 100) return `$${value.toLocaleString()}`;
    // Percentages or small numbers
    return String(value);
  }
  return String(value);
}

export function OCRReviewPanel({
  docId,
  projectId,
  documentName,
  extractedFields,
  overallConfidence,
  ocrStatus,
  onFieldConfirm,
  onReprocess,
  onBulkConfirm,
}: OCRReviewPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [confirmedSet, setConfirmedSet] = useState<Set<string>>(
    new Set(
      Object.entries(extractedFields)
        .filter(([, f]) => f.confirmed)
        .map(([k]) => k)
    )
  );
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [hardened, setHardened] = useState(false);

  const fieldEntries = Object.entries(extractedFields);
  const totalFields = fieldEntries.length;
  const confirmedCount = confirmedSet.size;
  const greenFields = fieldEntries.filter(([, f]) => getConfidenceTier(f.confidence) === 'green' && !f.confirmed);

  const handleConfirm = useCallback((fieldName: string, value: any) => {
    setConfirmedSet((prev) => new Set([...prev, fieldName]));
    onFieldConfirm(docId, fieldName, value);
  }, [docId, onFieldConfirm]);

  const handleEdit = useCallback((_fieldName: string) => {
    // Edit mode is handled by OCRConfirmField internally
  }, []);

  const handleBulkConfirm = useCallback(() => {
    const bulkFields: Record<string, any> = {};
    for (const [name, field] of greenFields) {
      bulkFields[name] = field.value;
      setConfirmedSet((prev) => new Set([...prev, name]));
    }
    onBulkConfirm(docId, bulkFields);
    toast.success(`${greenFields.length} high-confidence fields confirmed`);
  }, [docId, greenFields, onBulkConfirm]);

  const handleHarden = useCallback(() => {
    const allFields: Record<string, any> = {};
    for (const [name, field] of fieldEntries) {
      allFields[name] = field.value;
    }
    setConfirmedSet(new Set(fieldEntries.map(([k]) => k)));
    onBulkConfirm(docId, allFields);
    setHardened(true);
    toast.success('Project hardened — all fields confirmed');
  }, [docId, fieldEntries, onBulkConfirm]);

  const handleReprocess = useCallback(async () => {
    setIsReprocessing(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Not authenticated');

      const res = await fetch(`/api/projects/${projectId}/documents/${docId}/reprocess`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Reprocess failed (${res.status})`);
      }

      onReprocess(docId);
      setConfirmedSet(new Set());
      toast.success('Document re-processed successfully');
    } catch (err: any) {
      toast.error(`Re-processing failed: ${err.message}`);
    } finally {
      setIsReprocessing(false);
    }
  }, [docId, projectId, onReprocess]);

  const confidencePercent = Math.round(overallConfidence * 100);

  // ── Loading/failed states ──────────────────────────
  if (ocrStatus === 'pending' || ocrStatus === 'processing') {
    return (
      <div className="mt-3 px-4 py-3 rounded-lg bg-surface-container/30 backdrop-blur-xl border-t border-l border-white/10 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          {ocrStatus === 'pending' ? 'OCR queued...' : 'Processing with AI...'}
        </div>
      </div>
    );
  }

  if (ocrStatus === 'failed') {
    return (
      <div className="mt-3 px-4 py-3 rounded-lg bg-red-500/5 border border-red-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertTriangle className="w-4 h-4" />
            OCR processing failed
          </div>
          <button
            onClick={handleReprocess}
            disabled={isReprocessing}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-text-secondary hover:text-text-primary rounded-md border border-border-accent hover:border-gray-400 transition disabled:opacity-40"
          >
            {isReprocessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (totalFields === 0) return null;

  // ── Extraction review panel ────────────────────────
  return (
    <div className="mt-3 rounded-lg bg-surface-container/30 backdrop-blur-xl border-t border-l border-white/10 shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition"
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown className="w-4 h-4 text-text-secondary" /> : <ChevronRight className="w-4 h-4 text-text-secondary" />}
          <FileText className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-text-primary">
            Extracted Fields
          </span>
          <span className="text-xs text-text-secondary">
            {confirmedCount}/{totalFields} confirmed
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
            confidencePercent >= 85
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'
              : confidencePercent >= 70
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-600'
              : 'bg-red-500/10 border-red-500/20 text-red-600'
          }`}>
            <Sparkles className="w-3 h-3" />
            {confidencePercent}% avg
          </span>
          {confirmedCount === totalFields && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600">
              <CheckCircle className="w-3 h-3" />
              All confirmed
            </span>
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4">
          {/* Action bar */}
          <div className="flex items-center justify-between mb-3 pt-1 border-t border-white/5">
            <p className="text-[10px] text-text-secondary uppercase tracking-wider">
              {documentName}
            </p>
            <div className="flex items-center gap-2">
              {hardened ? (
                <span className="hardened-badge inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600">
                  <CheckCircle className="w-3 h-3" />
                  Project Hardened
                </span>
              ) : (
                <>
                  {greenFields.length > 0 && (
                    <button
                      onClick={handleBulkConfirm}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/20 transition active:scale-95"
                    >
                      <Check className="w-3 h-3" />
                      Confirm all high-confidence ({greenFields.length})
                    </button>
                  )}
                  <button
                    onClick={handleHarden}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold rounded-full bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition active:scale-95"
                  >
                    <CheckCircle className="w-3 h-3" />
                    Confirm &amp; Harden Project
                  </button>
                </>
              )}
              <button
                onClick={handleReprocess}
                disabled={isReprocessing || hardened}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium text-text-secondary hover:text-text-primary rounded-full border border-border-accent/40 hover:border-gray-400 transition disabled:opacity-40"
              >
                {isReprocessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                Reprocess
              </button>
            </div>
          </div>

          {/* Field list */}
          <div className="space-y-2">
            {fieldEntries.map(([fieldName, field]) => (
              <OCRConfirmField
                key={fieldName}
                fieldName={fieldName}
                label={FIELD_LABELS[fieldName] || fieldName.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                extractedValue={field.value}
                confidence={field.confidence}
                confirmed={confirmedSet.has(fieldName)}
                sourceText={field.sourceText}
                onConfirm={handleConfirm}
                onEdit={handleEdit}
                formatValue={formatFieldValue}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
