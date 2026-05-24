import React, { useState } from 'react';

export function DiligenceDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="w-full border border-pw-border bg-pw-white">
      <div className="border-b border-pw-border px-6 py-4 flex items-center justify-between pw-surface-light pw-text-on-light">
        <h2 className="text-lg font-light uppercase tracking-widest text-pw-black">Diligence Dashboard</h2>
        <div className="pw-tabs">
          <button 
            className={`pw-tab ${activeTab === 'overview' ? 'pw-tab--active' : ''}`}
            onClick={() => setActiveTab('overview')}
            aria-selected={activeTab === 'overview'}
          >
            Overview
          </button>
          <button 
            className={`pw-tab ${activeTab === 'physical' ? 'pw-tab--active' : ''}`}
            onClick={() => setActiveTab('physical')}
            aria-selected={activeTab === 'physical'}
          >
            Physical
          </button>
          <button 
            className={`pw-tab ${activeTab === 'legal' ? 'pw-tab--active' : ''}`}
            onClick={() => setActiveTab('legal')}
            aria-selected={activeTab === 'legal'}
          >
            Legal
          </button>
        </div>
      </div>
      
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border border-pw-border p-4 pw-surface-light pw-text-on-light">
              <h3 className="text-xs uppercase tracking-widest font-black mb-2">Inspection Period</h3>
              <div className="text-2xl font-light">14 Days</div>
              <div className="text-sm text-pw-muted mt-2">Ends on Nov 14, 2026</div>
            </div>
            <div className="border border-pw-border p-4 pw-surface-light pw-text-on-light">
              <h3 className="text-xs uppercase tracking-widest font-black mb-2">Financing Contingency</h3>
              <div className="text-2xl font-light">21 Days</div>
              <div className="text-sm text-pw-muted mt-2">Ends on Nov 21, 2026</div>
            </div>
            <div className="border border-pw-border p-4 pw-surface-light pw-text-on-light">
              <h3 className="text-xs uppercase tracking-widest font-black mb-2">Title Review</h3>
              <div className="text-2xl font-light">Pending</div>
              <div className="text-sm text-pw-muted mt-2">Report expected Nov 10, 2026</div>
            </div>
          </div>
        )}

        {activeTab !== 'overview' && (
          <div className="flex items-center justify-center py-12 text-pw-muted text-sm uppercase tracking-widest">
            {activeTab} Diligence View Coming Soon
          </div>
        )}
      </div>

      <div className="border-t border-pw-border px-6 py-4 flex justify-end">
        <button className="pw-interactive pw-btn pw-btn--primary">
          Update Timelines
        </button>
      </div>
    </div>
  );
}
