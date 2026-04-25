'use client';

import React, { useState, useMemo, useRef } from 'react';
import { Project, ProspectProperty, OfferLetter } from '@/types/schema';
import { useProjectStore } from '@/store/projectStore';
import { DealFolderIcon } from './DealFolder';
import {
  FileText, X, ChevronDown,
  Calendar, DollarSign, User, MapPin,
  Printer, Download, CheckSquare,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   OfferLetterQuickAction — One-Click Offer Letter Generator

   Embedded shortcut on the Pipeline Home that lets users:
   1. Select a deal in the Find & Fund phase
   2. Pick a prospect from that deal
   3. Fill pre-populated offer details
   4. Generate a print-ready offer letter

   The generated letter is appended to the prospect's
   offerLetters[] array and can be printed / downloaded.
   ═══════════════════════════════════════════════════════════════ */

interface OfferLetterQuickActionProps {
  projects: Project[];
}

interface OfferFormData {
  recipientName: string;
  offerAmount: string;
  earnestMoney: string;
  expiryDays: string;
  contingencyInspection: boolean;
  contingencyFinancing: boolean;
  contingencyAppraisal: boolean;
  notes: string;
}

const INITIAL_FORM: OfferFormData = {
  recipientName: '',
  offerAmount: '',
  earnestMoney: '',
  expiryDays: '7',
  contingencyInspection: true,
  contingencyFinancing: true,
  contingencyAppraisal: false,
  notes: '',
};

function shortAddress(address: string): string {
  const comma = address.indexOf(',');
  return comma > 0 ? address.slice(0, comma) : address;
}

export default function OfferLetterQuickAction({ projects }: OfferLetterQuickActionProps) {
  const [open, setOpen] = useState(false);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null);
  const [form, setForm] = useState<OfferFormData>(INITIAL_FORM);
  const [generated, setGenerated] = useState(false);
  const letterRef = useRef<HTMLDivElement>(null);
  const updateProspects = useProjectStore(s => s.updateProspects);

  // Filter to only projects in the "Lead" (Find & Fund) phase with prospects
  const eligibleDeals = useMemo(
    () => projects.filter(d => d.status === 'Lead' && d.prospects && d.prospects.length > 0),
    [projects]
  );

  const selectedDeal = eligibleDeals.find(d => d.id === selectedDealId);
  const selectedProspect = selectedDeal?.prospects?.find(p => p.id === selectedProspectId);

  // Pre-populate when a prospect is selected
  const handleSelectProspect = (prospect: ProspectProperty) => {
    setSelectedProspectId(prospect.id);
    setForm({
      ...INITIAL_FORM,
      offerAmount: prospect.maxOffer > 0 ? prospect.maxOffer.toString() : '',
      earnestMoney: prospect.maxOffer > 0 ? Math.round(prospect.maxOffer * 0.01).toString() : '',
    });
    setGenerated(false);
  };

  const handleGenerate = () => {
    if (!selectedDeal || !selectedProspect || !form.recipientName || !form.offerAmount) return;

    const now = new Date();
    const expiryDate = new Date(now);
    expiryDate.setDate(expiryDate.getDate() + parseInt(form.expiryDays, 10));

    const newLetter: OfferLetter = {
      id: `ol_${Date.now()}`,
      recipientName: form.recipientName,
      offerAmount: parseFloat(form.offerAmount),
      sentDate: now,
      expiresDate: expiryDate,
      status: 'Draft',
      notes: form.notes,
    };

    // Append to prospect's offer letters
    const updatedProspects = selectedDeal.prospects!.map(p => {
      if (p.id !== selectedProspectId) return p;
      return { ...p, offerLetters: [...p.offerLetters, newLetter] };
    });
    updateProspects(selectedDeal.id, updatedProspects);

    setGenerated(true);
  };

  const handlePrint = () => {
    if (!letterRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
      <head><title>Offer Letter</title>
      <style>
        body { font-family: 'Georgia', serif; max-width: 700px; margin: 40px auto; padding: 0 20px; color: #1a1a1a; line-height: 1.6; }
        h1 { font-size: 20px; font-weight: normal; letter-spacing: 2px; text-transform: uppercase; border-bottom: 1px solid #ccc; padding-bottom: 8px; }
        .meta { color: #666; font-size: 13px; margin-bottom: 24px; }
        .field { margin-bottom: 16px; }
        .field-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #999; }
        .field-value { font-size: 15px; }
        .amount { font-size: 28px; font-weight: bold; }
        .contingencies { margin-top: 24px; padding: 16px; background: #f9f9f9; border-radius: 4px; }
        .signature { margin-top: 48px; border-top: 1px solid #ccc; padding-top: 24px; }
        .sig-line { border-bottom: 1px solid #333; width: 250px; margin-top: 48px; }
        @media print { body { margin: 0; } }
      </style>
      </head>
      <body>${letterRef.current.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedDealId(null);
    setSelectedProspectId(null);
    setForm(INITIAL_FORM);
    setGenerated(false);
  };

  const contingencies = [
    form.contingencyInspection && 'Property Inspection',
    form.contingencyFinancing && 'Buyer Financing',
    form.contingencyAppraisal && 'Property Appraisal',
  ].filter(Boolean);

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center space-x-3 px-6 py-4 border-2 border-pw-black bg-bg-surface text-text-primary font-black uppercase tracking-[0.2em] text-[10px] hover:bg-pw-black hover:text-pw-white transition-all shadow-[4px_4px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
      >
        <FileText className="w-4 h-4" />
        <span>Action: Generate_Offer</span>
      </button>

      {/* Slide-out Drawer */}
      {open && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Drawer panel */}
          <div className="relative w-full max-w-lg bg-bg-surface shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-8 py-6 bg-pw-black border-b border-pw-black">
              <div>
                <h2 className="text-xl font-black text-pw-white uppercase tracking-tighter">Offer_Letter_System</h2>
                <p className="text-[9px] text-pw-accent font-bold mt-1 uppercase tracking-[0.3em]">PROXIMITY_ACTION_PROTOCOL</p>
              </div>
              <button
                onClick={handleClose}
                className="p-2 bg-bg-surface text-text-primary hover:bg-pw-accent transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

              {/* Step 1: Select Deal */}
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">
                  1. Select Deal
                </label>
                {eligibleDeals.length === 0 ? (
                  <p className="text-sm text-text-secondary bg-bg-primary rounded-lg p-4 text-center">
                    No projects in Find & Fund phase with prospects.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {eligibleDeals.map(deal => (
                      <button
                        key={deal.id}
                        onClick={() => {
                          setSelectedDealId(deal.id);
                          setSelectedProspectId(null);
                          setForm(INITIAL_FORM);
                          setGenerated(false);
                        }}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                          selectedDealId === deal.id
                            ? 'border-gray-900 bg-bg-primary'
                            : 'border-border-accent hover:border-border-accent'
                        }`}
                      >
                        <DealFolderIcon status={deal.status} size={20} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">
                            {shortAddress(deal.address || deal.propertyName)}
                          </p>
                          <p className="text-xs text-text-secondary">
                            {deal.prospects?.length || 0} prospect{(deal.prospects?.length || 0) !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-gray-300 transition-transform ${selectedDealId === deal.id ? 'rotate-180' : ''}`} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Step 2: Select Prospect (expands under selected deal) */}
              {selectedDeal && selectedDeal.prospects && (
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">
                    2. Select Prospect
                  </label>
                  <div className="space-y-1.5">
                    {selectedDeal.prospects.map(prospect => (
                      <button
                        key={prospect.id}
                        onClick={() => handleSelectProspect(prospect)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                          selectedProspectId === prospect.id
                            ? 'border-gray-900 bg-bg-primary'
                            : 'border-border-accent hover:border-border-accent'
                        }`}
                      >
                        <MapPin className="w-4 h-4 text-text-secondary flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">
                            {prospect.address}
                          </p>
                          <p className="text-xs text-text-secondary">
                            Asking: ${prospect.askingPrice.toLocaleString()} · Max Offer: ${prospect.maxOffer.toLocaleString()}
                          </p>
                        </div>
                        <span className="text-xs font-mono text-text-secondary bg-bg-primary px-2 py-0.5 rounded">
                          {prospect.status}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Offer Details */}
              {selectedProspect && !generated && (
                <div className="space-y-4">
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest">
                    3. Offer Details
                  </label>

                  {/* Recipient */}
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">Recipient Name *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                      <input
                        type="text"
                        value={form.recipientName}
                        onChange={e => setForm({...form, recipientName: e.target.value})}
                        placeholder="Property owner or seller's agent"
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border-accent text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-border-accent"
                      />
                    </div>
                  </div>

                  {/* Offer Amount + Earnest Money */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-text-secondary mb-1">Offer Amount *</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                        <input
                          type="number"
                          value={form.offerAmount}
                          onChange={e => setForm({...form, offerAmount: e.target.value})}
                          placeholder="350,000"
                          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border-accent text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-border-accent"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-text-secondary mb-1">Earnest Money</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                        <input
                          type="number"
                          value={form.earnestMoney}
                          onChange={e => setForm({...form, earnestMoney: e.target.value})}
                          placeholder="3,500"
                          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border-accent text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-border-accent"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Expiry */}
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">Offer Valid For (days)</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                      <input
                        type="number"
                        value={form.expiryDays}
                        onChange={e => setForm({...form, expiryDays: e.target.value})}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border-accent text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-border-accent"
                      />
                    </div>
                  </div>

                  {/* Contingencies */}
                  <div>
                    <label className="block text-xs text-text-secondary mb-2">Contingencies</label>
                    <div className="space-y-2">
                      {[
                        { key: 'contingencyInspection' as const, label: 'Inspection Contingency' },
                        { key: 'contingencyFinancing' as const, label: 'Financing Contingency' },
                        { key: 'contingencyAppraisal' as const, label: 'Appraisal Contingency' },
                      ].map(({ key, label }) => (
                        <label
                          key={key}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-border-accent hover:bg-bg-primary cursor-pointer transition"
                        >
                          <input
                            type="checkbox"
                            checked={form[key]}
                            onChange={() => setForm({...form, [key]: !form[key]})}
                            className="w-4 h-4 rounded border-border-accent text-text-primary focus:ring-gray-200"
                          />
                          <span className="text-sm text-text-primary">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">Additional Notes</label>
                    <textarea
                      value={form.notes}
                      onChange={e => setForm({...form, notes: e.target.value})}
                      rows={3}
                      placeholder="Special terms, closing timeline preferences..."
                      className="w-full px-4 py-2.5 rounded-lg border border-border-accent text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-border-accent resize-none"
                    />
                  </div>

                  {/* Generate CTA */}
                  <button
                    onClick={handleGenerate}
                    disabled={!form.recipientName || !form.offerAmount}
                    className="w-full py-3 rounded-lg bg-gray-900 text-white font-medium text-sm hover:bg-gray-800 disabled:bg-gray-200 disabled:text-text-secondary disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Generate Offer Letter
                  </button>
                </div>
              )}

              {/* Step 4: Preview */}
              {generated && selectedProspect && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-green-600 uppercase tracking-widest">
                      ✓ Letter Generated
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={handlePrint}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border-accent hover:bg-bg-primary transition"
                      >
                        <Printer className="w-3.5 h-3.5" /> Print
                      </button>
                    </div>
                  </div>

                  {/* Letter Preview */}
                  <div
                    ref={letterRef}
                    className="bg-bg-surface border border-border-accent rounded-xl p-6 shadow-sm text-sm leading-relaxed"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    <h1 style={{ fontSize: '16px', fontWeight: 'normal', letterSpacing: '2px', textTransform: 'uppercase', borderBottom: '1px solid #ccc', paddingBottom: '8px', marginBottom: '16px' }}>
                      Letter of Intent — Purchase Offer
                    </h1>

                    <p style={{ color: '#666', fontSize: '12px', marginBottom: '20px' }}>
                      Date: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>

                    <p style={{ marginBottom: '16px' }}>
                      Dear <strong>{form.recipientName}</strong>,
                    </p>

                    <p style={{ marginBottom: '16px' }}>
                      This letter constitutes a formal offer to purchase the real property located at:
                    </p>

                    <p style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '20px', padding: '12px', background: '#f9f9f9', borderRadius: '4px' }}>
                      {selectedProspect.address}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                      <div>
                        <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: '#999' }}>Offer Amount</p>
                        <p style={{ fontSize: '22px', fontWeight: 'bold' }}>${parseFloat(form.offerAmount).toLocaleString()}</p>
                      </div>
                      {form.earnestMoney && (
                        <div>
                          <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: '#999' }}>Earnest Money Deposit</p>
                          <p style={{ fontSize: '16px' }}>${parseFloat(form.earnestMoney).toLocaleString()}</p>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                      <div>
                        <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: '#999' }}>Offer Valid Until</p>
                        <p>{(() => { const d = new Date(); d.setDate(d.getDate() + parseInt(form.expiryDays)); return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); })()}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: '#999' }}>Asking Price</p>
                        <p>${selectedProspect.askingPrice.toLocaleString()}</p>
                      </div>
                    </div>

                    {contingencies.length > 0 && (
                      <div style={{ marginTop: '20px', padding: '16px', background: '#f9f9f9', borderRadius: '4px' }}>
                        <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: '#999', marginBottom: '8px' }}>Contingencies</p>
                        <ul style={{ paddingLeft: '20px', margin: 0 }}>
                          {contingencies.map(c => (
                            <li key={c as string} style={{ marginBottom: '4px' }}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {form.notes && (
                      <div style={{ marginTop: '20px' }}>
                        <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: '#999', marginBottom: '8px' }}>Additional Terms</p>
                        <p>{form.notes}</p>
                      </div>
                    )}

                    <div style={{ marginTop: '48px', borderTop: '1px solid #ccc', paddingTop: '24px' }}>
                      <p style={{ fontSize: '12px', color: '#666' }}>Sincerely,</p>
                      <div style={{ borderBottom: '1px solid #333', width: '250px', marginTop: '48px' }} />
                      <p style={{ fontSize: '11px', color: '#999', marginTop: '8px' }}>Buyer Signature & Date</p>
                    </div>
                  </div>

                  {/* Action row */}
                  <button
                    onClick={handleClose}
                    className="w-full py-3 rounded-lg bg-bg-primary text-text-primary font-medium text-sm hover:bg-gray-200 transition-all"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
