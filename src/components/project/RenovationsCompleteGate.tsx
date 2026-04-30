import React, { useState } from 'react';
import { CheckSquare, AlertTriangle, ArrowRight, ClipboardCheck, HardHat, ShieldCheck } from 'lucide-react';

interface RenovationsCompleteGateProps {
  onComplete: () => void;
  unpaidInvoicesCount: number;
  uncompletedMilestonesCount: number;
}

export function RenovationsCompleteGate({ onComplete, unpaidInvoicesCount, uncompletedMilestonesCount }: RenovationsCompleteGateProps) {
  const [finalInspectionPassed, setFinalInspectionPassed] = useState(false);
  const [lienWaiversSigned, setLienWaiversSigned] = useState(false);
  const [allCostsLogged, setAllCostsLogged] = useState(false);

  const hasBlockers = unpaidInvoicesCount > 0 || uncompletedMilestonesCount > 0;
  const isReady = !hasBlockers && finalInspectionPassed && lienWaiversSigned && allCostsLogged;

  return (
    <div className="p-6 rounded-lg border-2 transition-colors duration-300" style={{ backgroundColor: 'var(--bg-surface)', borderColor: isReady ? 'var(--border-ui)' : '#fee2e2' }}>
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-full ${!hasBlockers ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
          {!hasBlockers ? <ShieldCheck className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Complete Rehab & Exit</h3>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Sign off on Phase 3 and transition the project to Phase 4 (Hold & Exit). All rehab milestones must be closed out.
          </p>

          {/* Automated Blockers */}
          {hasBlockers && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <h4 className="text-sm font-semibold text-red-800">Cannot complete phase yet</h4>
              <ul className="list-disc ml-5 mt-2 text-sm text-red-700 space-y-1">
                {unpaidInvoicesCount > 0 && <li>There are <strong>{unpaidInvoicesCount} unpaid invoices</strong>. Please resolve all payments.</li>}
                {uncompletedMilestonesCount > 0 && <li>There are <strong>{uncompletedMilestonesCount} uncompleted milestones</strong> in the draw schedule.</li>}
              </ul>
            </div>
          )}

          {/* Manual Confirmations */}
          {!hasBlockers && (
            <div className="mt-6 space-y-4 p-4 rounded-md border" style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-canvas)' }}>
              <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Final Clearances</h4>
              
              <label className="flex items-start gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={finalInspectionPassed} 
                  onChange={(e) => setFinalInspectionPassed(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <div>
                  <div className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <ClipboardCheck className="w-4 h-4 text-green-600" /> Final Inspection Passed
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    Municipal and internal quality inspections are fully approved.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={lienWaiversSigned} 
                  onChange={(e) => setLienWaiversSigned(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <div>
                  <div className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <HardHat className="w-4 h-4 text-green-600" /> Contractor Lien Waivers Signed
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    All final payments have been dispersed and unconditional lien waivers are secured.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={allCostsLogged} 
                  onChange={(e) => setAllCostsLogged(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <div>
                  <div className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <CheckSquare className="w-4 h-4 text-green-600" /> All Rehab Costs Logged
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    All rehab costs have been logged and construction is complete.
                  </div>
                </div>
              </label>
            </div>
          )}

          {/* Action Button */}
          <div className="mt-6">
            <button
              onClick={onComplete}
              disabled={!isReady}
              className={`flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3 rounded-md text-white font-semibold transition-all ${
                isReady 
                  ? 'bg-green-600 hover:bg-green-700 shadow-sm' 
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              Property Ready for Exit <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
