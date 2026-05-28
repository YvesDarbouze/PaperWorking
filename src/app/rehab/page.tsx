'use client';

import React, { useState } from 'react';
import { Briefcase, CheckCircle, Clock, DollarSign, Hammer, AlertTriangle, FileUp, MoreVertical, Plus, ChevronRight } from 'lucide-react';

export default function RehabDashboard() {
  const [activeTab, setActiveTab] = useState('milestones');

  return (
    <div className="min-h-screen bg-pw-bg flex flex-col font-sans">
      {/* Header */}
      <header className="glass-card rounded-none border-x-0 border-t-0 border-b border-pw-border px-12 h-20 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
            <Hammer className="w-4 h-4 text-text-primary" />
          </div>
          <span className="text-lg font-bold tracking-tight text-text-primary">Phase 3: Rehab</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-xs font-semibold tracking-wider px-4 py-2 bg-white/5 border border-white/10 rounded-full text-text-secondary uppercase">
            Ownership Scope: Active
          </div>
          <div className="text-xs font-semibold tracking-wider px-4 py-2 bg-teal-400/10 border border-teal-400/20 text-teal-400 rounded-full uppercase">
            Dual-Scope Sync: Real-Time
          </div>
          <button className="pw-interactive pw-btn pw-btn--primary rounded-full text-sm font-semibold">
            New Project
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="w-72 border-r border-pw-border flex flex-col hidden lg:flex">
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
        <main className="flex-1 overflow-auto p-12">
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
      className={`w-full flex items-center justify-between px-6 py-3.5 transition-all border rounded-xl ${
        active 
          ? 'bg-white/10 text-white border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.05)]' 
          : 'bg-transparent text-slate-400 border-transparent hover:border-white/10 hover:text-white hover:bg-white/5'
      }`}
    >
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-sm font-semibold">{label}</span>
      </div>
    </button>
  );
}

function MilestoneTracker() {
  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-text-primary">Milestone Tracker</h2>
          <p className="text-sm text-text-secondary mt-1">v1 - Enforcing R0 Versioning</p>
        </div>
        <button className="pw-interactive pw-btn pw-btn--primary rounded-full text-sm font-semibold flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Milestone
        </button>
      </div>

      <div className="glass-card border border-pw-border overflow-hidden">
        {/* Sample row */}
        <div className="p-6 border-b border-pw-border flex justify-between items-center hover:bg-white/5 transition-colors">
          <div>
            <div className="text-xs font-semibold tracking-wider text-text-secondary uppercase mb-1">Pending</div>
            <h3 className="text-lg font-semibold text-text-primary">Foundation Repair</h3>
            <p className="text-sm text-text-secondary mt-1">Est. $15,000 &bull; Actual $0</p>
          </div>
          <button className="pw-interactive pw-btn pw-btn--outline rounded-full text-xs font-semibold">
            Manage <ChevronRight className="w-4 h-4 inline ml-1" />
          </button>
        </div>
        <div className="p-6 flex justify-between items-center hover:bg-white/5 transition-colors">
          <div>
            <div className="text-xs font-semibold tracking-wider text-teal-400 uppercase mb-1">In Progress</div>
            <h3 className="text-lg font-semibold text-text-primary">Roof Replacement</h3>
            <p className="text-sm text-text-secondary mt-1">Est. $12,000 &bull; Actual $4,000</p>
          </div>
          <button className="pw-interactive pw-btn pw-btn--outline rounded-full text-xs font-semibold">
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
          <h2 className="text-3xl font-bold tracking-tight text-text-primary">Budget vs. Actuals</h2>
          <p className="text-sm text-text-secondary mt-1">Dual-Scope Metrics Real-Time Sync</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="glass-card border border-pw-border p-8">
          <h4 className="text-sm font-semibold text-text-secondary mb-2">Estimated Budget</h4>
          <p className="text-4xl font-bold tracking-tighter text-text-primary">$85,000</p>
        </div>
        <div className="glass-card border border-pw-border p-8">
          <h4 className="text-sm font-semibold text-text-secondary mb-2">Actual Cost</h4>
          <p className="text-4xl font-bold tracking-tighter text-text-primary">$42,500</p>
        </div>
        <div className="glass-card bg-teal-400/5 border border-teal-400/20 p-8">
          <h4 className="text-sm font-semibold text-teal-400/80 mb-2">Variance</h4>
          <p className="text-4xl font-bold tracking-tighter text-teal-400">-$42,500</p>
        </div>
      </div>
      
      <div className="glass-card border border-pw-border p-8 mt-8">
        <h3 className="text-lg font-semibold text-text-primary border-b border-pw-border pb-4 mb-4">Dual-Scope Metric Impact</h3>
        <p className="text-sm text-text-secondary leading-relaxed">Real-time update: Ownership % distribution adjusted based on actual cost overruns. Current investor ROI projection: <span className="font-bold text-teal-400">14.2%</span>.</p>
      </div>
    </div>
  );
}

function VendorPortal() {
  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-text-primary">Vendor Portal</h2>
          <p className="text-sm text-text-secondary mt-1">Bids & Invoices</p>
        </div>
        <button className="pw-interactive pw-btn pw-btn--primary rounded-full font-semibold text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Vendor
        </button>
      </div>

      <div className="glass-card border border-pw-border overflow-hidden">
        <div className="p-6 border-b border-pw-border flex justify-between items-center hover:bg-white/5 transition-colors">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Ace Plumbing Co.</h3>
            <p className="text-sm text-text-secondary mt-1">Plumbing Contractor</p>
          </div>
          <div className="flex gap-4">
             <button className="pw-interactive pw-btn pw-btn--outline rounded-full text-xs font-semibold">
               View Bids
             </button>
             <button className="pw-interactive pw-btn pw-btn--secondary rounded-full text-xs font-semibold border border-pw-border">
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
          <h2 className="text-3xl font-bold tracking-tight text-text-primary">Change Orders</h2>
          <p className="text-sm text-text-secondary mt-1">Workflow Management</p>
        </div>
        <button className="pw-interactive pw-btn pw-btn--primary rounded-full font-semibold text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Request
        </button>
      </div>

      <div className="glass-card border border-pw-border overflow-hidden">
        <div className="p-6 border-b border-pw-border flex justify-between items-center hover:bg-white/5 transition-colors">
          <div>
            <div className="text-xs font-semibold tracking-wider text-teal-400 uppercase mb-1">Pending Approval</div>
            <h3 className="text-lg font-semibold text-text-primary">Additional Electrical Rewiring</h3>
            <p className="text-sm text-text-secondary mt-1">Requested Cost: $3,200</p>
          </div>
          <div className="flex gap-4">
            <button className="pw-interactive pw-btn pw-btn--outline rounded-full text-xs font-semibold border border-red-500/30 text-red-400 hover:bg-red-500/10">
              Reject
            </button>
            <button className="pw-interactive pw-btn pw-btn--primary rounded-full text-xs font-semibold">
              Approve
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
