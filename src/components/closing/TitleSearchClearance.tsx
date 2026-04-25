'use client';

import React, { useState } from 'react';
import { Shield, CheckCircle, Clock, AlertTriangle, Search, FileText, Link as LinkIcon } from 'lucide-react';
import toast from 'react-hot-toast';

/* ═══════════════════════════════════════════════════════
   Title Search Clearance — Phase 2 Module
   Tracks title search status, liens, encumbrances,
   and clearance milestones.
   ═══════════════════════════════════════════════════════ */

type ClearanceStatus = 'Pending' | 'In Review' | 'Cleared' | 'Issue Found';

interface TitleCheckItem {
  id: string;
  name: string;
  status: ClearanceStatus;
  detail?: string;
}

const STATUS_CONFIG: Record<ClearanceStatus, { icon: React.ReactNode; bg: string; text: string }> = {
  Pending: { icon: <Clock className="w-3.5 h-3.5" />, bg: 'bg-bg-primary', text: 'text-text-secondary' },
  'In Review': { icon: <Search className="w-3.5 h-3.5" />, bg: 'bg-blue-50', text: 'text-blue-600' },
  Cleared: { icon: <CheckCircle className="w-3.5 h-3.5" />, bg: 'bg-emerald-50', text: 'text-emerald-600' },
  'Issue Found': { icon: <AlertTriangle className="w-3.5 h-3.5" />, bg: 'bg-red-50', text: 'text-red-600' },
};

const INITIAL_CHECKS: TitleCheckItem[] = [
  { id: 'ownership', name: 'Chain of Ownership Verification', status: 'Cleared', detail: 'Clear chain verified through 2003' },
  { id: 'liens', name: 'Outstanding Liens & Judgments', status: 'In Review', detail: 'County records search in progress' },
  { id: 'taxes', name: 'Property Tax Clearance', status: 'Cleared', detail: 'Current through Q2 2026' },
  { id: 'easements', name: 'Easements & Encumbrances', status: 'Pending' },
  { id: 'survey', name: 'Survey / Boundary Confirmation', status: 'Pending' },
  { id: 'hoa', name: 'HOA/Condo Special Assessments', status: 'Cleared', detail: 'No HOA restrictions apply' },
];

export default function TitleSearchClearance() {
  const [checks, setChecks] = useState<TitleCheckItem[]>(INITIAL_CHECKS);
  const [searching, setSearching] = useState(false);

  const handleRunSearch = () => {
    setSearching(true);
    toast.loading('Searching county records...', { id: 'title-search' });
    setTimeout(() => {
      setChecks(prev => prev.map(c => {
        if (c.status === 'Pending') return { ...c, status: 'In Review' as ClearanceStatus };
        return c;
      }));
      setSearching(false);
      toast.success('Title search initiated for all pending items', { id: 'title-search' });
    }, 2000);
  };

  const clearedCount = checks.filter(c => c.status === 'Cleared').length;
  const issueCount = checks.filter(c => c.status === 'Issue Found').length;
  const isFullyCleared = clearedCount === checks.length;

  return (
    <div className="bg-bg-surface rounded-xl shadow-sm border border-border-accent p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center space-x-2">
          <Shield className="w-5 h-5 text-text-primary" />
          <h3 className="text-lg font-medium tracking-tight text-text-primary">Title Search Clearance</h3>
        </div>
        <div className="flex items-center gap-2">
          {isFullyCleared ? (
            <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> ALL CLEAR
            </span>
          ) : issueCount > 0 ? (
            <span className="bg-red-50 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full border border-red-200 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {issueCount} ISSUE{issueCount > 1 ? 'S' : ''}
            </span>
          ) : null}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-5">
        <div className="flex justify-between text-xs text-text-secondary mb-1.5">
          <span>Clearance Progress</span>
          <span>{clearedCount}/{checks.length} cleared</span>
        </div>
        <div className="w-full bg-bg-primary rounded-full h-2 flex overflow-hidden">
          <div
            className="bg-emerald-500 h-2 transition-all"
            style={{ width: `${(clearedCount / checks.length) * 100}%` }}
          />
          {issueCount > 0 && (
            <div
              className="bg-red-400 h-2 transition-all"
              style={{ width: `${(issueCount / checks.length) * 100}%` }}
            />
          )}
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-2">
        {checks.map(check => {
          const config = STATUS_CONFIG[check.status];
          return (
            <div key={check.id} className={`flex items-center justify-between p-3 rounded-lg ${config.bg} transition`}>
              <div className="flex items-center space-x-3">
                <span className={config.text}>{config.icon}</span>
                <div>
                  <p className="text-sm font-medium text-text-primary">{check.name}</p>
                  {check.detail && (
                    <p className="text-xs text-text-secondary mt-0.5">{check.detail}</p>
                  )}
                </div>
              </div>
              <span className={`text-xs font-bold uppercase tracking-wider ${config.text}`}>
                {check.status}
              </span>
            </div>
          );
        })}
      </div>

      {/* Action Button */}
      {!isFullyCleared && (
        <button
          onClick={handleRunSearch}
          disabled={searching}
          className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition disabled:opacity-60"
        >
          {searching ? (
            <span className="animate-pulse">Searching Records...</span>
          ) : (
            <>
              <Search className="w-4 h-4" /> Run Full Title Search
            </>
          )}
        </button>
      )}
    </div>
  );
}
