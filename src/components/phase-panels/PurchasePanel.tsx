'use client';

import React, { useState } from 'react';
import { FileCheck, Landmark, Scale, Calculator, Video, CheckSquare, Square } from 'lucide-react';
import ExplainerVideoModal from './ExplainerVideoModal';

export default function PurchasePanel() {
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [attorney, setAttorney] = useState('Sarah Jenkins, Esq. (Austin Title Law)');
  const [closingCosts, setClosingCosts] = useState({
    titleFee: 1850,
    attorneyFee: 2200,
    originationPoints: 3500,
    transferTax: 1200,
    escrowDeposit: 4000,
  });

  const [docs, setDocs] = useState([
    { id: '1', title: 'Uniform Residential Loan Application (Form 1003)', completed: true },
    { id: '2', title: 'Executed Purchase & Sale Agreement (PSA)', completed: true },
    { id: '3', title: 'Preliminary Title Report & Insurance Policy', completed: true },
    { id: '4', title: 'Property Inspection & Structural Engineering Report', completed: false },
    { id: '5', title: 'Licensed Real Estate Appraisal Report', completed: false },
    { id: '6', title: 'Closing Disclosure (HUD-1 / CD Settlement Statement)', completed: false },
  ]);

  const toggleDoc = (id: string) => {
    setDocs(prev => prev.map(d => d.id === id ? { ...d, completed: !d.completed } : d));
  };

  const totalClosingCosts = Object.values(closingCosts).reduce((acc, curr) => acc + curr, 0);
  const completedDocsCount = docs.filter(d => d.completed).length;

  return (
    <section data-testid="purchase-panel" id="purchase-panel" className="p-6 rounded-2xl bg-black/40 border border-white/10 space-y-6 text-white backdrop-blur-md">
      {/* Top Banner & Video Trigger */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            Purchase & Closing Phase Management
          </h2>
          <p className="text-xs text-slate-300">Loan underwriting, title clearance, legal counsel, & closing statements.</p>
        </div>

        <button
          onClick={() => setIsVideoOpen(true)}
          data-testid="purchase-video-btn"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600/30 border border-emerald-400/40 text-emerald-300 text-xs font-semibold hover:bg-emerald-600/40 transition"
        >
          <Video className="w-4 h-4" />
          <span>Watch Explainer</span>
        </button>
      </div>

      {/* KPI Header Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <span className="text-xs text-slate-400 block">Days to Target Close</span>
          <span className="text-xl font-bold text-white">18 Days</span>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <span className="text-xs text-slate-400 block">Loan Approval Status</span>
          <span className="text-xl font-bold text-emerald-400">Conditionally Approved</span>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <span className="text-xs text-slate-400 block">Attorney Assigned</span>
          <span className="text-xl font-bold text-emerald-400">Yes</span>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <span className="text-xs text-slate-400 block">Closing Docs Collected</span>
          <span className="text-xl font-bold text-white">{completedDocsCount} / {docs.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Document Checklist */}
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-emerald-400" />
            Closing Document Checklist
          </h3>
          <div className="space-y-2">
            {docs.map(doc => (
              <button
                key={doc.id}
                onClick={() => toggleDoc(doc.id)}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-black/40 hover:bg-white/10 text-left text-xs transition border border-white/5"
              >
                {doc.completed ? (
                  <CheckSquare className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-slate-500 flex-shrink-0" />
                )}
                <span className={doc.completed ? 'line-through text-slate-400' : 'text-white font-medium'}>
                  {doc.title}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Loan Processing & Attorney Assignment */}
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Landmark className="w-4 h-4 text-emerald-400" />
              Loan Processing Tracker
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block">Lender Name</span>
                <span className="font-semibold text-white">First Horizon Commercial</span>
              </div>
              <div>
                <span className="text-slate-400 block">Loan Type / Term</span>
                <span className="font-semibold text-white">30-Yr Fixed (DSCR)</span>
              </div>
              <div>
                <span className="text-slate-400 block">Interest Rate</span>
                <span className="font-semibold text-white">6.25%</span>
              </div>
              <div>
                <span className="text-slate-400 block">Loan Amount</span>
                <span className="font-semibold text-emerald-400">$336,000</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Scale className="w-4 h-4 text-emerald-400" />
              Real Estate Attorney Assignment
            </h3>
            <div className="space-y-2 text-xs">
              <label className="text-slate-400 block">Assigned Legal Counsel</label>
              <input
                type="text"
                value={attorney}
                onChange={e => setAttorney(e.target.value)}
                className="w-full p-2.5 rounded bg-black/40 border border-white/10 text-white font-medium"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Closing Cost Calculator */}
      <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Calculator className="w-4 h-4 text-emerald-400" />
          Closing Cost Calculator (Auto-Summing)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="text-slate-400 block">Title Insurance</label>
            <input
              type="number"
              value={closingCosts.titleFee}
              onChange={e => setClosingCosts({ ...closingCosts, titleFee: Number(e.target.value) })}
              className="w-full p-2 rounded bg-black/40 border border-white/10 text-white mt-1"
            />
          </div>
          <div>
            <label className="text-slate-400 block">Attorney Fees</label>
            <input
              type="number"
              value={closingCosts.attorneyFee}
              onChange={e => setClosingCosts({ ...closingCosts, attorneyFee: Number(e.target.value) })}
              className="w-full p-2 rounded bg-black/40 border border-white/10 text-white mt-1"
            />
          </div>
          <div>
            <label className="text-slate-400 block">Origination Pts</label>
            <input
              type="number"
              value={closingCosts.originationPoints}
              onChange={e => setClosingCosts({ ...closingCosts, originationPoints: Number(e.target.value) })}
              className="w-full p-2 rounded bg-black/40 border border-white/10 text-white mt-1"
            />
          </div>
          <div>
            <label className="text-slate-400 block">Transfer Taxes</label>
            <input
              type="number"
              value={closingCosts.transferTax}
              onChange={e => setClosingCosts({ ...closingCosts, transferTax: Number(e.target.value) })}
              className="w-full p-2 rounded bg-black/40 border border-white/10 text-white mt-1"
            />
          </div>
          <div>
            <label className="text-slate-400 block">Escrow Deposit</label>
            <input
              type="number"
              value={closingCosts.escrowDeposit}
              onChange={e => setClosingCosts({ ...closingCosts, escrowDeposit: Number(e.target.value) })}
              className="w-full p-2 rounded bg-black/40 border border-white/10 text-white mt-1"
            />
          </div>
        </div>
        <div className="pt-2 border-t border-white/10 flex justify-between items-center text-sm font-bold">
          <span>Total Projected Closing Costs:</span>
          <span className="text-emerald-400">${totalClosingCosts.toLocaleString()}</span>
        </div>
      </div>

      <ExplainerVideoModal
        isOpen={isVideoOpen}
        onClose={() => setIsVideoOpen(false)}
        title="Closing & Loan Processing Guide"
        videoUrl="https://www.youtube.com/embed/dQw4w9WgXcQ"
      />
    </section>
  );
}
