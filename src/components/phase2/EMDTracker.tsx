import React from 'react';

export function EMDTracker() {
  return (
    <div className="w-full border border-pw-border bg-pw-white">
      <div className="border-b border-pw-border px-6 py-4 pw-surface-dark pw-text-on-dark flex items-center justify-between">
        <h2 className="text-lg font-light uppercase tracking-widest text-pw-white">EMD Tracker</h2>
        <span className="text-xs uppercase tracking-widest font-black text-pw-accent">Status: At Risk</span>
      </div>
      
      <div className="p-6">
        <div className="flex flex-col md:flex-row gap-6 mb-6">
          <div className="flex-1 border border-pw-border p-4">
            <h3 className="text-xs uppercase tracking-widest text-pw-muted font-black mb-1">Deposit Amount</h3>
            <div className="text-xl font-light text-pw-black">$25,000</div>
          </div>
          <div className="flex-1 border border-pw-border p-4">
            <h3 className="text-xs uppercase tracking-widest text-pw-muted font-black mb-1">Held By</h3>
            <div className="text-xl font-light text-pw-black">First American Title Co.</div>
          </div>
          <div className="flex-1 border border-pw-border p-4">
            <h3 className="text-xs uppercase tracking-widest text-pw-muted font-black mb-1">Refundability Deadline</h3>
            <div className="text-xl font-light text-pw-black">Nov 14, 2026</div>
          </div>
        </div>

        <div className="border border-pw-border">
          <div className="border-b border-pw-border px-4 py-2 bg-pw-bg text-xs uppercase tracking-widest font-black">
            Timeline Events
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-light">PSA Executed</div>
                <div className="text-xs text-pw-muted">Nov 1, 2026</div>
              </div>
              <div className="text-xs uppercase tracking-widest text-pw-muted">Completed</div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-light">EMD Wire Sent</div>
                <div className="text-xs text-pw-muted">Nov 3, 2026</div>
              </div>
              <div className="text-xs uppercase tracking-widest text-pw-muted">Completed</div>
            </div>
            <div className="flex items-center justify-between border-l-2 border-pw-accent pl-2">
              <div>
                <div className="font-light">EMD Goes Hard</div>
                <div className="text-xs text-pw-muted">Nov 14, 2026 (5:00 PM EST)</div>
              </div>
              <div className="text-xs uppercase tracking-widest text-pw-accent font-black">Pending</div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="border-t border-pw-border px-6 py-4 flex justify-between">
        <button className="pw-interactive pw-btn pw-btn--outline">
          Log Return
        </button>
        <button className="pw-interactive pw-btn pw-btn--danger">
          Release Funds
        </button>
      </div>
    </div>
  );
}
