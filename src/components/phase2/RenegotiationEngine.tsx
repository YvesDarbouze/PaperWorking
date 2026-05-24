import React, { useState } from 'react';

export function RenegotiationEngine() {
  const [credit, setCredit] = useState(0);
  const [priceReduction, setPriceReduction] = useState(0);

  const baselinePrice = 1200000;
  const newEffectivePrice = baselinePrice - priceReduction - credit;

  return (
    <div className="w-full border border-pw-border bg-pw-white">
      <div className="border-b border-pw-border px-6 py-4 pw-surface-light">
        <h2 className="text-lg font-light uppercase tracking-widest text-pw-black">Renegotiation Engine</h2>
      </div>
      
      <div className="p-6 flex flex-col md:flex-row gap-8">
        <div className="flex-1 space-y-6">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest font-black text-pw-black block">Seller Credit Request</label>
            <input 
              type="number" 
              className="pw-input w-full border border-pw-border p-2" 
              placeholder="e.g. 15000"
              value={credit || ''}
              onChange={(e) => setCredit(Number(e.target.value))}
            />
            <p className="text-xs text-pw-muted">Credit towards closing costs or repairs.</p>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest font-black text-pw-black block">Purchase Price Reduction</label>
            <input 
              type="number" 
              className="pw-input w-full border border-pw-border p-2" 
              placeholder="e.g. 50000"
              value={priceReduction || ''}
              onChange={(e) => setPriceReduction(Number(e.target.value))}
            />
            <p className="text-xs text-pw-muted">Direct reduction of contract price.</p>
          </div>
        </div>

        <div className="flex-1 border border-pw-border p-6 bg-pw-bg flex flex-col justify-center">
          <h3 className="text-xs uppercase tracking-widest font-black text-pw-muted mb-4">Effective Impact</h3>
          
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-light">Baseline Price</span>
            <span className="text-sm font-light">${baselinePrice.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center mb-2 text-pw-accent">
            <span className="text-sm font-light">Total Adjustments</span>
            <span className="text-sm font-light">-${(credit + priceReduction).toLocaleString()}</span>
          </div>
          <div className="border-t border-pw-border my-4"></div>
          <div className="flex justify-between items-center">
            <span className="text-base uppercase tracking-widest font-black">New Effective Price</span>
            <span className="text-xl font-light text-pw-black">${newEffectivePrice.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="border-t border-pw-border px-6 py-4 flex justify-end">
        <button className="pw-interactive pw-btn pw-btn--primary">
          Commit to R2 Branch
        </button>
      </div>
    </div>
  );
}
