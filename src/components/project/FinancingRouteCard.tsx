'use client';

import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { LoanRecord } from '@/types/schema';
import { 
  Building2, 
  HelpCircle, 
  ArrowRight, 
  Check, 
  RefreshCw, 
  AlertCircle,
  FileText,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  projectId: string;
}

type InstrumentType = 'Conventional' | 'Hard Money' | 'Bridge' | 'SBA 504';

interface RouteOption {
  id: InstrumentType;
  label: string;
  description: string;
  guidance: string;
}

const ROUTE_OPTIONS: RouteOption[] = [
  {
    id: 'Conventional',
    label: 'Conventional Financing',
    description: 'Standard long-term commercial or residential debt.',
    guidance: 'Requires stable financials, strong leadInvestor credit, and a standard down payment (15-25%). Typically 15-30 year terms.',
  },
  {
    id: 'Hard Money',
    label: 'Hard Money Loan',
    description: 'Rehab/ARV-based short-term asset funding.',
    guidance: 'Asset/ARV-based qualification. Extremely fast closing times (5-10 days), high rates (8-12%), and short duration (6-24 months).',
  },
  {
    id: 'Bridge',
    label: 'Bridge Loan',
    description: 'Gap liquidity between a buy and a sale.',
    guidance: 'Designed to bridge temporary transitions. Quick approvals with interest-only structures until permanent refinancing or exit.',
  },
  {
    id: 'SBA 504',
    label: 'SBA 504 Commercial',
    description: 'Owner-occupied commercial real estate financing.',
    guidance: 'Requires business occupancy projection (>=51% for existing, >=60% for new construction). Structured as: Bank 1st Lien (50%), CDC 2nd Lien (35-40%), Borrower Equity (10-15%).',
  }
];

export function FinancingRouteCard({ projectId }: Props) {
  const [project, setProject] = useState<any>(null);
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedInstruments, setSelectedInstruments] = useState<InstrumentType[]>([]);

  // 1. Listen to Project details
  useEffect(() => {
    if (!projectId) return;
    const unsub = onSnapshot(doc(db, 'projects', projectId), (snap) => {
      if (snap.exists()) {
        setProject(snap.data());
      }
    });
    return unsub;
  }, [projectId]);

  // 2. Listen to Loans subcollection
  useEffect(() => {
    if (!projectId) return;

    // Check for E2E testing mock
    if (typeof window !== 'undefined' && document.cookie.includes('__e2e_test')) {
      const key = `pw_e2e_loans_${projectId}`;
      const load = () => {
        try {
          const val = localStorage.getItem(key);
          setLoans(val ? JSON.parse(val) : []);
          setLoading(false);
        } catch (e) {
          console.error(e);
        }
      };
      load();
      window.addEventListener('storage', (e) => {
        if (e.key === key) load();
      });
      return;
    }

    const unsub = onSnapshot(
      collection(db, 'projects', projectId, 'loans'),
      (snap) => {
        const docs = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as LoanRecord[];
        setLoans(docs);
        setLoading(false);
      },
      (err) => {
        console.error('[FinancingRouteCard] Firestore loans onSnapshot error:', err);
        setLoading(false);
      }
    );
    return unsub;
  }, [projectId]);

  // Initialize selected instruments from database loans
  useEffect(() => {
    if (loans.length > 0) {
      const activeInsts = Array.from(new Set(loans.map((l) => l.instrument))) as InstrumentType[];
      setSelectedInstruments(activeInsts);
    } else {
      setSelectedInstruments([]);
    }
  }, [loans]);

  const handleToggleOption = (inst: InstrumentType) => {
    if (selectedInstruments.includes(inst)) {
      setSelectedInstruments(selectedInstruments.filter((x) => x !== inst));
    } else {
      setSelectedInstruments([...selectedInstruments, inst]);
    }
  };

  const handleSetRoute = async () => {
    if (selectedInstruments.length === 0) {
      toast.error('Please select at least one financing instrument.');
      return;
    }

    setSubmitting(true);
    try {
      const auth = getAuth();
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('Authentication token required.');

      const res = await fetch(`/api/projects/${projectId}/loans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          instruments: selectedInstruments,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to configure financing route.');
      }

      toast.success(`Financing Route updated: ${selectedInstruments.join(', ')}.`);
    } catch (err: any) {
      toast.error(err.message || 'Error occurred during route selection.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetRoute = async () => {
    if (!window.confirm('Resetting will clear all existing loan records and set financing mode back to All Cash. Proceed?')) return;

    setSubmitting(true);
    try {
      const auth = getAuth();
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('Authentication token required.');

      const res = await fetch(`/api/projects/${projectId}/loans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          reset: true,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to reset route.');
      }

      toast.success('Financing route reset successfully.');
      setSelectedInstruments([]);
    } catch (err: any) {
      toast.error(err.message || 'Error resetting financing route.');
    } finally {
      setSubmitting(false);
    }
  };

  const isActive = project?.financials?.financingType === 'Financed' && loans.length > 0;
  const activeInstrumentsList = Array.from(new Set(loans.map((l) => l.instrument))).join(' + ');

  if (loading) {
    return (
      <div className="glass-card p-6 flex flex-col items-center justify-center min-h-[150px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#7A9EAA] mb-2" />
        <span className="text-xs text-pw-muted font-light uppercase tracking-wider">Loading Financing Route...</span>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start border-b border-pw-border pb-4">
        <div>
          <h3 className="text-lg font-light uppercase tracking-widest text-pw-black flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-[#7A9EAA]" />
            Financing Route Selection
          </h3>
          <p className="text-xs text-pw-muted font-light mt-1">
            Determine the debt structure and route gating for this acquisition. Supports hybrid multi-loan stacks.
          </p>
        </div>
        {isActive && (
          <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
            Financed Mode Active
          </span>
        )}
      </div>

      {isActive ? (
        // Active Route Panel
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-pw-muted uppercase tracking-wider">Active Instrument</span>
                <h4 className="text-[16px] leading-[22px] font-semibold text-pw-black mt-0.5">
                  {activeInstrumentsList || 'Custom'} Route
                </h4>
              </div>
              <button 
                onClick={handleResetRoute}
                disabled={submitting}
                className="pw-interactive px-3 py-1.5 border border-pw-border text-[10px] font-bold uppercase tracking-wider text-red-600 bg-pw-white hover:bg-red-50 flex items-center gap-1.5 rounded transition-all"
              >
                {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                Reset Financing Route
              </button>
            </div>
            
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-pw-muted font-light block">Loan Count</span>
                <strong className="text-pw-black font-semibold text-sm">{loans.length} configured</strong>
              </div>
              <div>
                <span className="text-pw-muted font-light block">Combined Amount</span>
                <strong className="text-pw-black font-semibold text-sm">
                  ${(loans.reduce((sum, l) => sum + ((l.amountCents ?? 0) / 100), 0)).toLocaleString()}
                </strong>
              </div>
              <div>
                <span className="text-pw-muted font-light block">Timeline Status</span>
                <span className="px-2 py-0.5 text-[9px] uppercase font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200 inline-block mt-0.5">
                  {project?.loanStatus?.replace(/-/g, ' ') || 'Processing'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-4 rounded bg-amber-50 text-amber-900 border border-amber-200 text-xs">
            <AlertCircle className="w-4.5 h-4.5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5">Debt Mode Enabled</span>
              Underwriting milestones, loan estimate split-views, and locked terms calculations are now visible on this project.
            </div>
          </div>
        </div>
      ) : (
        // Selector Interface
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ROUTE_OPTIONS.map((opt) => {
              const isSelected = selectedInstruments.includes(opt.id);
              return (
                <div 
                  key={opt.id}
                  onClick={() => handleToggleOption(opt.id)}
                  className={`p-4 border rounded-lg cursor-pointer transition-all hover:bg-pw-bg/5 flex flex-col justify-between ${
                    isSelected 
                      ? 'border-[#7A9EAA] bg-[#7A9EAA]/5 shadow-sm' 
                      : 'border-pw-border bg-pw-white'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="text-xs uppercase font-black tracking-widest text-pw-black">{opt.label}</h4>
                      <span className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        isSelected 
                          ? 'bg-[#7A9EAA] border-[#7A9EAA]' 
                          : 'border-pw-border bg-pw-white'
                      }`}>
                        {isSelected && <Check className="w-2.5 h-2.5 text-pw-white" />}
                      </span>
                    </div>
                    <p className="text-[11px] text-pw-muted mb-3">{opt.description}</p>
                  </div>
                  
                  {/* Guidance Chip */}
                  <div className="p-2 bg-gray-50 border border-gray-100 text-[10px] text-pw-muted font-light leading-relaxed">
                    <strong>Guidance:</strong> {opt.guidance}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-2 border-t border-pw-border">
            <button 
              onClick={handleSetRoute}
              disabled={selectedInstruments.length === 0 || submitting}
              className={`pw-interactive px-4 py-2 text-xs font-semibold uppercase tracking-wider text-pw-white flex items-center gap-1.5 transition-all ${
                selectedInstruments.length > 0 && !submitting 
                  ? 'bg-[#7A9EAA] hover:bg-[#688a95] shadow-sm' 
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Set Financing Route
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
