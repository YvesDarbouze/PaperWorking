import React from 'react';

export function CapitalStackUI() {
  return (
    <div className="w-full border border-pw-border bg-pw-white">
      <div className="border-b border-pw-border px-6 py-4">
        <h2 className="text-lg font-light uppercase tracking-widest text-pw-black">Capital Stack (Dual-Scope)</h2>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Senior Debt */}
          <div className="border border-pw-border">
            <div className="border-b border-pw-border bg-pw-bg px-4 py-2">
              <h3 className="text-xs uppercase tracking-widest font-black text-pw-black">Debt (70%)</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-light text-pw-muted">Primary Lender</span>
                <span className="text-sm text-pw-black">Chase Commercial</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-light text-pw-muted">Amount</span>
                <span className="text-sm font-black text-pw-black">$840,000</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-light text-pw-muted">Rate / Term</span>
                <span className="text-sm text-pw-black">6.5% / 5yr Interest Only</span>
              </div>
            </div>
          </div>

          {/* Equity */}
          <div className="border border-pw-border">
            <div className="border-b border-pw-border bg-pw-bg px-4 py-2 flex justify-between items-center">
              <h3 className="text-xs uppercase tracking-widest font-black text-pw-black">Equity (30%)</h3>
              <span className="text-xs font-black text-pw-accent">Locked</span>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-light text-pw-muted">Total Requirement</span>
                <span className="text-sm font-black text-pw-black">$360,000</span>
              </div>
              
              <div className="border-t border-pw-border pt-4 mt-2">
                <h4 className="text-xs uppercase tracking-widest font-black text-pw-muted mb-2">Ownership Breakdown</h4>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-light">Lead Investor</span>
                  <span className="text-sm text-pw-black">20% ($72,000)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-light">Investment Team</span>
                  <span className="text-sm text-pw-black">80% ($288,000)</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
      
      <div className="border-t border-pw-border px-6 py-4 flex justify-end">
        <button className="pw-interactive pw-btn pw-btn--secondary">
          Edit Tranches
        </button>
      </div>
    </div>
  );
}
