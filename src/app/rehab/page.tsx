'use client';

import React, { useState } from 'react';
import { Briefcase, CheckCircle, Clock, DollarSign, Hammer, AlertTriangle, FileUp, MoreVertical, Plus, ChevronRight } from 'lucide-react';

export default function RehabDashboard() {
  const [activeTab, setActiveTab] = useState('milestones');

  return (
    <div className="min-h-screen bg-pw-bg flex flex-col font-sans">
      {/* Header */}
      <header className="bg-pw-black text-white px-12 h-20 flex items-center justify-between border-b border-pw-border shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 border border-white/20 flex items-center justify-center">
            <Hammer className="w-4 h-4" />
          </div>
          <span className="text-xl font-black tracking-tighter uppercase">Phase 3: Rehab</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-xs font-black uppercase tracking-widest px-4 py-2 bg-white/10">
            Ownership Scope: Active
          </div>
          <div className="text-xs font-black uppercase tracking-widest px-4 py-2 bg-pw-accent text-white">
            Dual-Scope Sync: Real-Time
          </div>
          <button className="pw-interactive pw-btn pw-btn--primary bg-white text-pw-black border-none rounded-none text-xs font-black uppercase tracking-widest hover:bg-gray-200">
            New Project
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="w-72 bg-white border-r border-pw-black flex flex-col hidden lg:flex">
          <nav className="p-8 space-y-2">
            <NavItem 
              icon={<CheckCircle className="w-4 h-4" />} 
              label="Milestone Tracker" 
              active={activeTab === 'milestones'} 
              onClick={() => setActiveTab('milestones')}
            />
            <NavItem 
              icon={<DollarSign className="w-4 h-4" />} 
              label="Budget vs. Actuals" 
              active={activeTab === 'budget'} 
              onClick={() => setActiveTab('budget')}
            />
            <NavItem 
              icon={<Briefcase className="w-4 h-4" />} 
              label="Vendor Portal" 
              active={activeTab === 'vendor'} 
              onClick={() => setActiveTab('vendor')}
            />
            <NavItem 
              icon={<AlertTriangle className="w-4 h-4" />} 
              label="Change Orders" 
              active={activeTab === 'change-orders'} 
              onClick={() => setActiveTab('change-orders')}
            />
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-pw-bg p-12">
          {activeTab === 'milestones' && <MilestoneTracker />}
          {activeTab === 'budget' && <BudgetActuals />}
          {activeTab === 'vendor' && <VendorPortal />}
          {activeTab === 'change-orders' && <ChangeOrders />}
        </main>
      </div>
    </div>
  );
}

function NavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center justify-between px-6 py-4 transition-all border ${
        active 
          ? 'bg-pw-black text-white border-pw-black' 
          : 'bg-transparent text-pw-muted border-transparent hover:border-pw-black hover:text-pw-black'
      } rounded-none`}
    >
      <div className="flex items-center gap-4">
        {icon}
        <span className="text-xs font-black uppercase tracking-widest">{label}</span>
      </div>
    </button>
  );
}

function MilestoneTracker() {
  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-pw-black">Milestone Tracker</h2>
          <p className="text-xs font-black uppercase tracking-widest text-pw-muted mt-2">v1 - Enforcing R0 Versioning</p>
        </div>
        <button className="pw-interactive pw-btn pw-btn--primary rounded-none font-black uppercase tracking-widest text-xs flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Milestone
        </button>
      </div>

      <div className="border border-pw-black bg-white">
        {/* Sample row */}
        <div className="p-6 border-b border-pw-black flex justify-between items-center hover:bg-gray-50 transition-colors">
          <div>
            <div className="text-xs font-black uppercase tracking-widest text-pw-muted mb-1">Pending</div>
            <h3 className="text-lg font-black uppercase tracking-tighter">Foundation Repair</h3>
            <p className="text-sm text-pw-subtle font-medium mt-1">Est. $15,000 &bull; Actual $0</p>
          </div>
          <button className="pw-interactive pw-btn pw-btn--outline rounded-none text-xs font-black uppercase tracking-widest">
            Manage <ChevronRight className="w-4 h-4 inline ml-1" />
          </button>
        </div>
        <div className="p-6 flex justify-between items-center hover:bg-gray-50 transition-colors">
          <div>
            <div className="text-xs font-black uppercase tracking-widest text-pw-accent mb-1">In Progress</div>
            <h3 className="text-lg font-black uppercase tracking-tighter">Roof Replacement</h3>
            <p className="text-sm text-pw-subtle font-medium mt-1">Est. $12,000 &bull; Actual $4,000</p>
          </div>
          <button className="pw-interactive pw-btn pw-btn--outline rounded-none text-xs font-black uppercase tracking-widest">
            Manage <ChevronRight className="w-4 h-4 inline ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
}

function BudgetActuals() {
  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-pw-black">Budget vs. Actuals</h2>
          <p className="text-xs font-black uppercase tracking-widest text-pw-muted mt-2">Dual-Scope Metrics Real-Time Sync</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="bg-pw-black text-white border border-pw-black p-8">
          <h4 className="text-xs font-black uppercase tracking-widest text-pw-muted mb-4">Estimated Budget</h4>
          <p className="text-4xl font-black tracking-tighter">$85,000</p>
        </div>
        <div className="bg-white border border-pw-black p-8">
          <h4 className="text-xs font-black uppercase tracking-widest text-pw-muted mb-4">Actual Cost</h4>
          <p className="text-4xl font-black tracking-tighter">$42,500</p>
        </div>
        <div className="bg-pw-phase-rehab text-pw-black border border-pw-black p-8">
          <h4 className="text-xs font-black uppercase tracking-widest text-pw-black/60 mb-4">Variance</h4>
          <p className="text-4xl font-black tracking-tighter">-$42,500</p>
        </div>
      </div>
      
      <div className="border border-pw-black bg-white p-8 mt-8">
        <h3 className="text-sm font-black uppercase tracking-widest border-b border-pw-black pb-4 mb-4">Dual-Scope Metric Impact</h3>
        <p className="text-sm">Real-time update: Ownership % distribution adjusted based on actual cost overruns. Current investor ROI projection: <span className="font-black text-pw-accent">14.2%</span>.</p>
      </div>
    </div>
  );
}

function VendorPortal() {
  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-pw-black">Vendor Portal</h2>
          <p className="text-xs font-black uppercase tracking-widest text-pw-muted mt-2">Bids & Invoices</p>
        </div>
        <button className="pw-interactive pw-btn pw-btn--primary rounded-none font-black uppercase tracking-widest text-xs flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Vendor
        </button>
      </div>

      <div className="border border-pw-black bg-white">
        <div className="p-6 border-b border-pw-black flex justify-between items-center">
          <div>
            <h3 className="text-lg font-black uppercase tracking-tighter">Ace Plumbing Co.</h3>
            <p className="text-sm text-pw-subtle font-medium mt-1">Plumbing Contractor</p>
          </div>
          <div className="flex gap-4">
             <button className="pw-interactive pw-btn pw-btn--outline rounded-none text-xs font-black uppercase tracking-widest">
               View Bids
             </button>
             <button className="pw-interactive pw-btn pw-btn--secondary rounded-none text-xs font-black uppercase tracking-widest border border-pw-black">
               View Invoices
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChangeOrders() {
  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-pw-black">Change Orders</h2>
          <p className="text-xs font-black uppercase tracking-widest text-pw-muted mt-2">Workflow Management</p>
        </div>
        <button className="pw-interactive pw-btn pw-btn--primary rounded-none font-black uppercase tracking-widest text-xs flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Request
        </button>
      </div>

      <div className="border border-pw-black bg-white">
        <div className="p-6 border-b border-pw-black flex justify-between items-center bg-gray-50">
          <div>
            <div className="text-xs font-black uppercase tracking-widest text-pw-accent mb-1">Pending Approval</div>
            <h3 className="text-lg font-black uppercase tracking-tighter">Additional Electrical Rewiring</h3>
            <p className="text-sm text-pw-subtle font-medium mt-1">Requested Cost: $3,200</p>
          </div>
          <div className="flex gap-4">
            <button className="pw-interactive pw-btn pw-btn--outline rounded-none text-xs font-black uppercase tracking-widest border border-pw-black text-red-600 hover:bg-red-50">
              Reject
            </button>
            <button className="pw-interactive pw-btn pw-btn--primary rounded-none text-xs font-black uppercase tracking-widest">
              Approve
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
