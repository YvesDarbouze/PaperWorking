'use client';

import React, { useState } from 'react';
import { Search, DollarSign, Send, Users, FileSignature, CheckCircle, Video } from 'lucide-react';
import ExplainerVideoModal from './ExplainerVideoModal';

export default function AcquisitionPanel() {
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [template, setTemplate] = useState('standard_psa');
  const [offerPrice, setOfferPrice] = useState('420000');

  // Response tracker state
  const [offers, setOffers] = useState([
    { id: '1', address: '452 Operational Pkwy', amount: 420000, dateSent: '2026-08-10', status: 'pending' },
    { id: '2', address: '100 Ocean Drive', amount: 350000, dateSent: '2026-07-28', status: 'countered' },
  ]);

  const handleGenerateOffer = () => {
    alert(`Generating ${template.toUpperCase()} Offer Letter for $${Number(offerPrice).toLocaleString()} and triggering DocuSign API...`);
  };

  return (
    <section data-testid="acquisition-panel" id="acquisition-panel" className="p-6 rounded-2xl bg-black/40 border border-white/10 space-y-6 text-white backdrop-blur-md">
      {/* Top Banner & Explainer Video Trigger */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500" />
            Acquisition Phase Management
          </h2>
          <p className="text-xs text-slate-300">Target sourcing, crowdfunding commitments, offer letters, & seller responses.</p>
        </div>

        <button
          onClick={() => setIsVideoOpen(true)}
          data-testid="acquisition-video-btn"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600/30 border border-blue-400/40 text-blue-300 text-xs font-semibold hover:bg-blue-600/40 transition"
        >
          <Video className="w-4 h-4" />
          <span>Watch Explainer</span>
        </button>
      </div>

      {/* KPI Header Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <span className="text-xs text-slate-400 block">Offers Sent</span>
          <span className="text-xl font-bold text-white">4</span>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <span className="text-xs text-slate-400 block">Response Rate</span>
          <span className="text-xl font-bold text-emerald-400">75%</span>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <span className="text-xs text-slate-400 block">Avg Days to Respond</span>
          <span className="text-xl font-bold text-white">2.4 Days</span>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <span className="text-xs text-slate-400 block">Capital Committed</span>
          <span className="text-xl font-bold text-emerald-400">$185,000</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deal Finder Form */}
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Search className="w-4 h-4 text-blue-400" />
            Deal Finder & Target Criteria
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-400 block">Target Zip Code</label>
              <input type="text" defaultValue="78701" className="w-full p-2.5 rounded bg-black/40 border border-white/10 text-white mt-1" />
            </div>
            <div>
              <label className="text-slate-400 block">Max Price ($)</label>
              <input type="number" defaultValue="500000" className="w-full p-2.5 rounded bg-black/40 border border-white/10 text-white mt-1" />
            </div>
            <div>
              <label className="text-slate-400 block">Min Beds / Baths</label>
              <input type="text" defaultValue="3 Beds / 2 Baths" className="w-full p-2.5 rounded bg-black/40 border border-white/10 text-white mt-1" />
            </div>
            <div>
              <label className="text-slate-400 block">Target Cap Rate (%)</label>
              <input type="number" defaultValue="7.5" className="w-full p-2.5 rounded bg-black/40 border border-white/10 text-white mt-1" />
            </div>
          </div>
        </div>

        {/* Crowdfunding Tracker */}
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            Crowdfunding Tracker
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Total Raised:</span>
              <span className="font-bold text-emerald-400">$185,000 / $250,000 Target</span>
            </div>
            <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400 w-[74%]" />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 text-slate-300">
              <div>Investors Count: <strong>6</strong></div>
              <div>Min Investment: <strong>$10,000</strong></div>
            </div>
          </div>
        </div>
      </div>

      {/* Offer Letter Generator & Response Tracker */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <FileSignature className="w-4 h-4 text-blue-400" />
            Offer Letter Generator (DocuSign API)
          </h3>
          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-400 block">Select Template</label>
              <select value={template} onChange={e => setTemplate(e.target.value)} className="w-full p-2.5 rounded bg-black/40 border border-white/10 text-white mt-1">
                <option value="standard_psa">Standard Purchase & Sale Agreement</option>
                <option value="all_cash_loi">All-Cash Letter of Intent (LOI)</option>
                <option value="seller_finance">Seller Financing Offer Addendum</option>
              </select>
            </div>
            <div>
              <label className="text-slate-400 block">Offer Amount ($)</label>
              <input type="number" value={offerPrice} onChange={e => setOfferPrice(e.target.value)} className="w-full p-2.5 rounded bg-black/40 border border-white/10 text-white mt-1" />
            </div>
            <button onClick={handleGenerateOffer} className="w-full p-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 font-bold text-white flex items-center justify-center gap-2 transition">
              <Send className="w-4 h-4" />
              <span>Generate & Send DocuSign Envelope</span>
            </button>
          </div>
        </div>

        {/* Response Tracker Table */}
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Seller Response Tracker</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="py-2">Address</th>
                  <th className="py-2">Amount</th>
                  <th className="py-2">Sent Date</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {offers.map(o => (
                  <tr key={o.id}>
                    <td className="py-2.5 font-medium text-white">{o.address}</td>
                    <td className="py-2.5 text-slate-300">${o.amount.toLocaleString()}</td>
                    <td className="py-2.5 text-slate-400">{o.dateSent}</td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded uppercase text-[10px] font-bold ${
                        o.status === 'accepted' ? 'bg-emerald-500/20 text-emerald-400' :
                        o.status === 'countered' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-blue-500/20 text-blue-300'
                      }`}>
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ExplainerVideoModal
        isOpen={isVideoOpen}
        onClose={() => setIsVideoOpen(false)}
        title="Acquisition & Underwriting Masterclass"
        videoUrl="https://www.youtube.com/embed/dQw4w9WgXcQ"
      />
    </section>
  );
}
