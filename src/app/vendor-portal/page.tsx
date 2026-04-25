'use client';

import React, { useState } from 'react';
import { 
  Briefcase, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  DollarSign, 
  FileUp, 
  ExternalLink,
  MessageSquare,
  Search,
  MoreVertical
} from 'lucide-react';

const MOCK_REQUESTS = [
  {
    id: 'req_1',
    dealName: 'Nashville Duplex Modernization',
    investor: 'Nashville Metro Holdings',
    status: 'PENDING',
    type: 'Legal Review',
    requestedAt: '2024-04-15',
    sharedFolderId: 'folder_abc_123',
  },
  {
    id: 'req_2',
    dealName: 'Austin High-Rise Unit 402',
    investor: 'Capital Equity Partners',
    status: 'QUOTED',
    type: 'Appraisal Report',
    requestedAt: '2024-04-12',
    quotedFee: 850,
    sharedFolderId: 'folder_def_456',
  },
  {
    id: 'req_3',
    dealName: 'Atlanta Suburban Portfolio',
    investor: 'PeachState Acquisitions',
    status: 'ACCEPTED',
    type: 'Title Insurance',
    requestedAt: '2024-04-10',
    quotedFee: 1200,
    sharedFolderId: 'folder_ghi_789',
  }
];

export default function VendorPortalDashboard() {
  const [filter, setFilter] = useState('All');

  return (
    <div className="min-h-screen bg-pw-dashboard flex">
      {/* Institutional Sidebar */}
      <aside className="w-80 bg-pw-black text-white flex flex-col hidden lg:flex">
        <div className="p-12">
          <div className="flex items-center gap-4 mb-16">
            <div className="w-10 h-10 border border-white/20 flex items-center justify-center">
              <Briefcase className="w-5 h-5" />
            </div>
            <span className="text-xl font-black tracking-tighter uppercase">Vendor Hub</span>
          </div>

          <nav className="space-y-4">
            <NavItem icon={<Briefcase className="w-4 h-4" />} label="Marketplace Active" active />
            <NavItem icon={<CheckCircle className="w-4 h-4" />} label="Completed Deals" />
            <NavItem icon={<MessageSquare className="w-4 h-4" />} label="Inbox" badge={3} />
            <NavItem icon={<DollarSign className="w-4 h-4" />} label="Fee Invoicing" />
          </nav>
        </div>

        <div className="mt-auto p-12 bg-bg-surface/5 border-t border-white/10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 border border-white/20 flex items-center justify-center text-xs font-black">
              MS
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-white">Marcus Sterling</p>
              <p className="text-xs text-text-secondary font-bold tracking-widest uppercase">Verified Lawyer (TX)</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-bg-surface border-b border-border-accent px-12 h-24 flex items-center justify-between">
          <div className="relative w-full max-w-lg">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input 
              type="text"
              placeholder="FILTER PROJECT REQUESTS..."
              className="w-full pl-11 pr-4 py-3 bg-pw-dashboard border border-border-accent rounded-none text-xs font-black uppercase tracking-widest focus:outline-none focus:border-pw-black transition-all"
            />
          </div>
          <div className="flex items-center gap-4">
            <button className="px-8 py-3 bg-pw-black text-white rounded-none text-xs font-black uppercase tracking-[0.2em] hover:bg-pw-fg transition-all">
              Update Status
            </button>
          </div>
        </header>

        <section className="p-12 max-w-7xl">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-16">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.4em] text-text-secondary mb-3">Portfolio Operations</p>
              <h2 className="text-4xl font-black text-text-primary tracking-tighter uppercase">Engagement Pipeline</h2>
            </div>
            <div className="flex bg-pw-dashboard border border-border-accent">
              {['All', 'PENDING', 'QUOTED', 'ACCEPTED'].map(f => (
                <button 
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-6 py-3 text-xs font-black uppercase tracking-widest transition-all ${
                    filter === f ? 'bg-pw-black text-white' : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {f === 'All' ? 'Aggregate' : f}
                </button>
              ))}
            </div>
          </div>

          <div className="border border-border-accent bg-pw-border space-y-px">
            {MOCK_REQUESTS.filter(r => filter === 'All' || r.status === filter).map((req) => (
              <RequestRow key={req.id} request={req} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function RequestRow({ request }: { request: any }) {
  const statusLabels: any = {
    'PENDING': 'bg-pw-phase-1 text-text-primary',
    'QUOTED': 'bg-pw-phase-3 text-white',
    'ACCEPTED': 'bg-pw-black text-white',
  };

  return (
    <div className="bg-bg-surface p-8 flex flex-col lg:flex-row items-start lg:items-center gap-12 group transition-colors hover:bg-pw-dashboard/50">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-4">
          <span className={`px-2 py-0.5 text-xs font-black uppercase tracking-widest ${statusLabels[request.status]}`}>
            {request.status}
          </span>
          <span className="text-xs text-text-secondary font-black uppercase tracking-widest">{request.type}</span>
        </div>
        <h4 className="text-xl font-black text-text-primary uppercase tracking-tighter mb-1">{request.dealName}</h4>
        <p className="text-xs text-text-secondary font-black uppercase tracking-widest">{request.investor}</p>
      </div>

      <div className="flex items-center gap-16 w-full lg:w-auto">
        <div className="min-w-[120px]">
          <p className="text-xs font-black text-text-secondary uppercase tracking-widest mb-1.5">Origin Date</p>
          <div className="flex items-center gap-1.5 text-xs font-black text-text-primary uppercase tracking-widest">
            <Clock className="w-3 h-3 text-text-secondary" /> {request.requestedAt}
          </div>
        </div>

        <div className="min-w-[120px]">
          <p className="text-xs font-black text-text-secondary uppercase tracking-widest mb-1.5">Proposed Fee</p>
          <p className="text-base font-black text-text-primary tracking-tight">
            {request.quotedFee ? `$${request.quotedFee.toLocaleString()}` : '--'}
          </p>
        </div>

        <div className="flex items-center gap-2 ml-auto lg:ml-0">
          <div className="flex gap-1">
             <button className="p-3 border border-border-accent text-text-secondary hover:text-text-primary hover:border-pw-black transition-all">
               <ExternalLink className="w-4 h-4" />
             </button>
             {request.status === 'PENDING' && (
               <button className="px-8 py-3 bg-pw-black text-white font-black text-xs uppercase tracking-widest hover:bg-pw-fg transition-all">
                 Propose Quote
               </button>
             )}
             {request.status === 'ACCEPTED' && (
               <button className="px-8 py-3 bg-bg-surface border border-pw-black text-text-primary font-black text-xs uppercase tracking-widest hover:bg-pw-black hover:text-white transition-all flex items-center gap-2">
                 <FileUp className="w-4 h-4" /> Transmit Report
               </button>
             )}
          </div>
          <button className="p-3 text-text-secondary hover:text-text-primary">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function NavItem({ icon, label, active = false, badge }: { icon: any, label: string, active?: boolean, badge?: number }) {
  return (
    <button className={`w-full flex items-center justify-between px-6 py-4 transition-all ${
      active ? 'bg-bg-surface/10 text-white' : 'text-text-secondary hover:bg-bg-surface/5 hover:text-white'
    }`}>
      <div className="flex items-center gap-4">
        {icon}
        <span className="text-xs font-black uppercase tracking-[0.2em]">{label}</span>
      </div>
      {badge && (
        <span className="bg-bg-surface text-text-primary text-xs font-black px-2 py-0.5">
          {badge}
        </span>
      )}
    </button>
  );
}
