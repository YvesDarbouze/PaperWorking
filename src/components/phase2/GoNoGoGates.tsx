import React, { useState } from 'react';

export function GoNoGoGates() {
  const [physicalCleared, setPhysicalCleared] = useState(false);
  const [titleCleared, setTitleCleared] = useState(false);
  const [financialCleared, setFinancialCleared] = useState(false);

  const allCleared = physicalCleared && titleCleared && financialCleared;

  return (
    <div className="w-full border border-pw-border bg-pw-white">
      <div className="border-b border-pw-border px-6 py-4 pw-surface-dark pw-text-on-dark flex justify-between items-center">
        <h2 className="text-lg font-light uppercase tracking-widest text-pw-white">Go/No-Go Approval Gates</h2>
        {allCleared && (
          <span className="text-xs uppercase tracking-widest font-black text-pw-white border border-pw-white px-2 py-1">Clear to Close</span>
        )}
      </div>
      
      <div className="p-6 space-y-4">
        
        <div className={`border p-4 flex items-center justify-between ${physicalCleared ? 'border-pw-border bg-pw-bg' : 'border-pw-border'}`}>
          <div>
            <h3 className="text-sm uppercase tracking-widest font-black text-pw-black">Physical Diligence Gate</h3>
            <p className="text-xs text-pw-muted mt-1">Inspections reviewed, repairs negotiated.</p>
          </div>
          <button 
            onClick={() => setPhysicalCleared(!physicalCleared)}
            className={`pw-interactive pw-btn pw-btn--sm ${physicalCleared ? 'pw-btn--outline' : 'pw-btn--primary'}`}
          >
            {physicalCleared ? 'Revoke Approval' : 'Approve'}
          </button>
        </div>

        <div className={`border p-4 flex items-center justify-between ${titleCleared ? 'border-pw-border bg-pw-bg' : 'border-pw-border'}`}>
          <div>
            <h3 className="text-sm uppercase tracking-widest font-black text-pw-black">Title & Legal Gate</h3>
            <p className="text-xs text-pw-muted mt-1">Title commitment clean, entity documents finalized.</p>
          </div>
          <button 
            onClick={() => setTitleCleared(!titleCleared)}
            className={`pw-interactive pw-btn pw-btn--sm ${titleCleared ? 'pw-btn--outline' : 'pw-btn--primary'}`}
          >
            {titleCleared ? 'Revoke Approval' : 'Approve'}
          </button>
        </div>

        <div className={`border p-4 flex items-center justify-between ${financialCleared ? 'border-pw-border bg-pw-bg' : 'border-pw-border'}`}>
          <div>
            <h3 className="text-sm uppercase tracking-widest font-black text-pw-black">Financial & Capital Gate</h3>
            <p className="text-xs text-pw-muted mt-1">Appraisal meets value, financing clear to close.</p>
          </div>
          <button 
            onClick={() => setFinancialCleared(!financialCleared)}
            className={`pw-interactive pw-btn pw-btn--sm ${financialCleared ? 'pw-btn--outline' : 'pw-btn--primary'}`}
          >
            {financialCleared ? 'Revoke Approval' : 'Approve'}
          </button>
        </div>

      </div>

      <div className="border-t border-pw-border px-6 py-4 flex justify-end">
        <button 
          className="pw-interactive pw-btn pw-btn--primary pw-btn--block"
          disabled={!allCleared}
        >
          {allCleared ? 'Transition to Phase 3 (Closing)' : 'Pending Contingencies'}
        </button>
      </div>
    </div>
  );
}
