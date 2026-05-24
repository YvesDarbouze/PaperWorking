import React from 'react';

export default function SourcingDashboard() {
  return (
    <div className="pw-phase-sourcing min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="border-b border-pw-border pb-4 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-thin tracking-tight">Lead Sourcing</h1>
            <p className="text-sm font-light pw-muted mt-1 uppercase tracking-widest">Phase 1 Operations</p>
          </div>
          <button className="pw-interactive pw-btn pw-btn--primary rounded-none">
            Add Manual Lead
          </button>
        </header>

        {/* Dual-Scope Metrics Row (R0) */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="pw-surface-light border border-pw-border p-6 rounded-none">
            <h3 className="text-xs font-black uppercase tracking-widest pw-subtle mb-2">Total Pipeline</h3>
            <p className="text-4xl font-light">142</p>
          </div>
          <div className="pw-surface-light border border-pw-border p-6 rounded-none">
            <h3 className="text-xs font-black uppercase tracking-widest pw-subtle mb-2">Avg Cost Per Lead</h3>
            <p className="text-4xl font-light">$42.50</p>
            <p className="text-xs mt-2 pw-muted">Operational Metric</p>
          </div>
          <div className="pw-surface-light border border-pw-border p-6 rounded-none">
            <h3 className="text-xs font-black uppercase tracking-widest pw-subtle mb-2">Est. Equity Margin</h3>
            <p className="text-4xl font-light">$2.4M</p>
            <p className="text-xs mt-2 pw-muted">Financial Metric</p>
          </div>
        </section>

        {/* Leads Table */}
        <section className="border border-pw-border bg-pw-white rounded-none">
          <div className="border-b border-pw-border p-4 flex justify-between items-center">
            <h2 className="text-base font-regular">Recent Ingestion</h2>
            <div className="pw-tabs">
              <button className="pw-tab pw-tab--active" aria-selected="true">All Leads</button>
              <button className="pw-tab">PropStream</button>
              <button className="pw-tab">Manual</button>
            </div>
          </div>
          
          <div className="p-0">
            <table className="w-full text-left text-sm">
              <thead className="bg-pw-bg border-b border-pw-border">
                <tr>
                  <th className="p-4 font-light text-xs uppercase tracking-widest pw-subtle">Address</th>
                  <th className="p-4 font-light text-xs uppercase tracking-widest pw-subtle">Source</th>
                  <th className="p-4 font-light text-xs uppercase tracking-widest pw-subtle">Criteria Version</th>
                  <th className="p-4 font-light text-xs uppercase tracking-widest pw-subtle">Ownership</th>
                  <th className="p-4 font-light text-xs uppercase tracking-widest pw-subtle">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pw-border">
                {/* Dummy Row 1 */}
                <tr className="hover:bg-pw-bg transition-colors">
                  <td className="p-4 font-regular">123 Elm St, Austin TX</td>
                  <td className="p-4">PropStream</td>
                  <td className="p-4"><span className="border border-pw-border px-2 py-1 text-xs">v1</span></td>
                  <td className="p-4">SYSTEM (100%)</td>
                  <td className="p-4">
                    <span className="text-xs uppercase tracking-widest font-black">New</span>
                  </td>
                </tr>
                {/* Dummy Row 2 */}
                <tr className="hover:bg-pw-bg transition-colors">
                  <td className="p-4 font-regular">456 Oak Ave, Dallas TX</td>
                  <td className="p-4">ListSource</td>
                  <td className="p-4"><span className="border border-pw-border px-2 py-1 text-xs">v2</span></td>
                  <td className="p-4">JV_PARTNER (50%)</td>
                  <td className="p-4">
                    <span className="text-xs uppercase tracking-widest font-black pw-muted">Qualified</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        
      </div>
    </div>
  );
}
