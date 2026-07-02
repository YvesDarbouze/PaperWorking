import React from 'react';

export function ProFormaSnapshot() {
  return (
    <div className="w-full border border-pw-border bg-pw-white">
      <div className="border-b border-pw-border px-6 py-4 pw-phase-contract flex justify-between items-center">
        <h2 className="text-lg font-light uppercase tracking-widest text-pw-black">R0 Baseline Snapshot</h2>
        <span className="text-xs font-black uppercase tracking-widest text-pw-black border border-pw-border px-2 py-1">Locked v1.0</span>
      </div>
      
      <div className="p-6">
        <p className="text-sm text-pw-muted mb-6">
          This snapshot represents the financial underwriting locked at the conclusion of Phase 1 (Sourcing). All diligence deviations will be measured against this baseline.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="border border-pw-border p-4">
            <h4 className="text-xs uppercase tracking-widest font-black text-pw-muted">Purchase Price</h4>
            <span className="text-lg font-light text-pw-black">$1,200,000</span>
          </div>
          <div className="border border-pw-border p-4">
            <h4 className="text-xs uppercase tracking-widest font-black text-pw-muted">Rehab Budget</h4>
            <span className="text-lg font-light text-pw-black">$150,000</span>
          </div>
          <div className="border border-pw-border p-4">
            <h4 className="text-xs uppercase tracking-widest font-black text-pw-muted">Expected ARV</h4>
            <span className="text-lg font-light text-pw-black">$1,600,000</span>
          </div>
          <div className="border border-pw-border p-4">
            <h4 className="text-xs uppercase tracking-widest font-black text-pw-muted">Target IRR</h4>
            <span className="text-lg font-light text-pw-black">18.5%</span>
          </div>
        </div>
      </div>
      
      <div className="border-t border-pw-border px-6 py-4 flex justify-end space-x-4">
        <button className="pw-interactive pw-btn pw-btn--secondary">
          Export R0 Model
        </button>
        <button className="pw-interactive pw-btn pw-btn--primary">
          Compare Current State
        </button>
      </div>
    </div>
  );
}
