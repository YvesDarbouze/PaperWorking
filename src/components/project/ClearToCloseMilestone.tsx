import React, { useState, useEffect } from 'react';
import { DueDiligenceItem, ProjectTeamMember, LoanStatus, CostBasisLedger } from '@/types/schema';
import { CheckCircle2, Lock, Unlock } from 'lucide-react';

interface ClearToCloseMilestoneProps {
  dueDiligenceChecklist: DueDiligenceItem[];
  teamMembers: ProjectTeamMember[];
  loanStatus?: LoanStatus;
  costBasisLedger?: CostBasisLedger;
  isClearToClose: boolean;
  onToggle: (status: boolean) => void;
  onExecutePurchase?: () => void;
}

export function ClearToCloseMilestone({
  dueDiligenceChecklist,
  teamMembers,
  loanStatus,
  costBasisLedger,
  isClearToClose,
  onToggle,
  onExecutePurchase,
}: ClearToCloseMilestoneProps) {
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    // Validation 1: Due Diligence is 100% complete
    const isChecklistComplete =
      dueDiligenceChecklist.length > 0 &&
      dueDiligenceChecklist.every((item) => item.completed);

    // Validation 2: Acquisition Team has valid emails
    const isTeamValid =
      teamMembers.length > 0 &&
      teamMembers.every((m) => m.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.email));

    // Validation 3: Loan Status is Clear-To-Close
    const isLoanCleared = loanStatus === 'Clear-To-Close';

    // Validation 4: Settlement Statement fully logged
    const attorneyFees = costBasisLedger?.directAcquisition?.find(i => i.label === 'Attorney Fees')?.amount || 0;
    const titleInsurance = costBasisLedger?.directAcquisition?.find(i => i.label === 'Title Insurance')?.amount || 0;
    const loanOrigination = costBasisLedger?.financing?.find(i => i.label === 'Loan Origination Fees')?.amount || 0;
    const isSettlementLogged = attorneyFees > 0 && titleInsurance > 0 && loanOrigination > 0;

    const conditionsMet = isChecklistComplete && isTeamValid && isLoanCleared && isSettlementLogged;
    setUnlocked(conditionsMet);
    
    // Auto-revoke if conditions are no longer met
    if (!conditionsMet && isClearToClose) {
       onToggle(false);
    }
  }, [dueDiligenceChecklist, teamMembers, loanStatus, costBasisLedger, isClearToClose, onToggle]);

  return (
    <div 
      className={`p-6 rounded-lg shadow-sm border-2 transition-all duration-300 ${
        unlocked 
          ? isClearToClose 
            ? 'bg-green-50 border-green-500' 
            : 'border-[var(--border-ui)]'
          : 'bg-gray-50 border-gray-200 opacity-80'
      }`}
      style={!unlocked ? undefined : (!isClearToClose ? { backgroundColor: 'var(--bg-surface)' } : undefined)}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            {unlocked ? (
              <Unlock className={`w-6 h-6 ${isClearToClose ? 'text-green-600' : 'text-[var(--text-secondary)]'}`} />
            ) : (
              <Lock className="w-6 h-6 text-gray-400" />
            )}
            <h2 className={`text-xl font-bold ${
              unlocked ? (isClearToClose ? 'text-green-700' : 'text-[var(--text-primary)]') : 'text-gray-500'
            }`}>
              Clear to Close Milestone
            </h2>
          </div>
          <p className="text-sm max-w-xl" style={{ color: unlocked ? 'var(--text-secondary)' : '#6b7280' }}>
            Final confirmation before moving to the closing phase. This gate requires 100% completion of the Due Diligence checklist and valid email assignments for all Acquisition Team members.
          </p>
        </div>

        <div className="flex flex-col items-start md:items-end gap-2">
          <button
            disabled={!unlocked}
            onClick={() => onToggle(!isClearToClose)}
            className={`flex items-center gap-2 px-8 py-4 rounded-lg font-bold text-lg shadow-sm transition-all ${
              !unlocked
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : isClearToClose
                  ? 'bg-green-600 hover:bg-green-700 text-white shadow-md transform hover:scale-105'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md transform hover:scale-105'
            }`}
            style={(!unlocked || isClearToClose) ? undefined : { backgroundColor: 'var(--color-blue-600, #2563eb)' }}
          >
            <CheckCircle2 className={`w-6 h-6 ${isClearToClose ? 'text-white' : 'text-blue-100'}`} />
            {isClearToClose ? 'Cleared to Close!' : 'Mark Clear to Close'}
          </button>
          
          {isClearToClose && onExecutePurchase && (
            <button
              onClick={onExecutePurchase}
              className="flex items-center justify-center w-full px-8 py-3 rounded-lg font-bold shadow-md transform hover:scale-105 transition-all text-white bg-emerald-600 hover:bg-emerald-700 mt-2"
            >
              Execute Purchase
            </button>
          )}
          
          {!unlocked && (
            <p className="text-xs text-red-500 font-medium max-w-[250px] text-left md:text-right">
              Prerequisites not met. Complete DD, verify team emails, log closing costs, and get Loan Cleared to Close.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
