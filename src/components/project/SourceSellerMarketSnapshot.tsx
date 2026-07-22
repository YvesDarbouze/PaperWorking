'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Compass, User, TrendingUp, Edit3, X, CheckCircle2, Loader2, AlertTriangle, Link as LinkIcon, DollarSign, Calendar, FileText } from 'lucide-react';
import type { Project } from '@/types/schema';

interface SourceSellerMarketSnapshotProps {
  project: Project;
  phaseColor?: string;
  onSave: (updates: any) => Promise<void>;
}

export function SourceSellerMarketSnapshot({
  project,
  phaseColor = '#595959',
  onSave,
}: SourceSellerMarketSnapshotProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Initialize form state
  const [formData, setFormData] = useState({
    // Source details
    leadSource: project.leadSource || '',
    listingUrl: project.listingUrl || '',
    askingPrice: project.askingPriceCents ? (project.askingPriceCents / 100).toString() : '',
    subjectDom: project.subjectDom != null ? project.subjectDom.toString() : '',
    leadAgent: project.leadAgent || '',
    dateIdentified: project.dateIdentified
      ? new Date(project.dateIdentified).toISOString().split('T')[0]
      : '',

    // Seller details
    sellerName: project.sellerName || '',
    sellerType: project.sellerType || '',
    sellerMotivation: project.sellerMotivation || '',
    sellerContact: project.sellerContact || '',

    // Market details
    submarket: project.submarket || '',
    medianSalesPrice: project.medianSalesPriceCents ? (project.medianSalesPriceCents / 100).toString() : '',
    medianRent: project.medianRentCents ? (project.medianRentCents / 100).toString() : '',
    marketVacancyRate: project.marketVacancyRate != null ? project.marketVacancyRate.toString() : '',
    hazardFlag: !!project.hazardFlag,
    hazardNote: project.hazardNote || '',
  });

  // Re-sync form state when project changes externally
  useEffect(() => {
    setFormData({
      leadSource: project.leadSource || '',
      listingUrl: project.listingUrl || '',
      askingPrice: project.askingPriceCents ? (project.askingPriceCents / 100).toString() : '',
      subjectDom: project.subjectDom != null ? project.subjectDom.toString() : '',
      leadAgent: project.leadAgent || '',
      dateIdentified: project.dateIdentified
        ? new Date(project.dateIdentified).toISOString().split('T')[0]
        : '',
      sellerName: project.sellerName || '',
      sellerType: project.sellerType || '',
      sellerMotivation: project.sellerMotivation || '',
      sellerContact: project.sellerContact || '',
      submarket: project.submarket || '',
      medianSalesPrice: project.medianSalesPriceCents ? (project.medianSalesPriceCents / 100).toString() : '',
      medianRent: project.medianRentCents ? (project.medianRentCents / 100).toString() : '',
      marketVacancyRate: project.marketVacancyRate != null ? project.marketVacancyRate.toString() : '',
      hazardFlag: !!project.hazardFlag,
      hazardNote: project.hazardNote || '',
    });
  }, [project]);

  // Live rent-to-price ratio calculation
  const liveRentToPriceRatio = useMemo(() => {
    const rent = parseFloat(formData.medianRent);
    const price = parseFloat(formData.medianSalesPrice);
    if (isNaN(rent) || isNaN(price) || price === 0) return null;
    return (rent / price) * 100;
  }, [formData.medianRent, formData.medianSalesPrice]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates: any = {
        // Source
        leadSource: formData.leadSource || null,
        listingUrl: formData.listingUrl || null,
        askingPriceCents: formData.askingPrice ? Math.round(parseFloat(formData.askingPrice) * 100) : null,
        subjectDom: formData.subjectDom ? parseInt(formData.subjectDom, 10) : null,
        leadAgent: formData.leadAgent || null,
        dateIdentified: formData.dateIdentified ? new Date(formData.dateIdentified).toISOString() : null,

        // Seller
        sellerName: formData.sellerName || null,
        sellerType: formData.sellerType || null,
        sellerMotivation: formData.sellerMotivation || null,
        sellerContact: formData.sellerContact || null,

        // Market
        submarket: formData.submarket || null,
        medianSalesPriceCents: formData.medianSalesPrice ? Math.round(parseFloat(formData.medianSalesPrice) * 100) : null,
        medianRentCents: formData.medianRent ? Math.round(parseFloat(formData.medianRent) * 100) : null,
        marketVacancyRate: formData.marketVacancyRate ? parseFloat(formData.marketVacancyRate) : null,
        hazardFlag: formData.hazardFlag,
        hazardNote: formData.hazardFlag ? formData.hazardNote || null : null,
      };

      // Ensure financials.listedPrice and listedPrice are kept in sync with askingPrice
      updates['financials.listedPrice'] = updates.askingPriceCents;
      updates.listedPrice = updates.askingPriceCents;

      // Prefill purchasePrice if not already set (AQ-5 / AQ-15 integration)
      if (!project.financials?.purchasePrice && updates.askingPriceCents) {
        updates['financials.purchasePrice'] = updates.askingPriceCents;
      }

      await onSave(updates);
      setIsEditing(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save snapshot:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null || isNaN(amount)) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const isSellerComplete = !!(formData.sellerName || formData.sellerType);

  return (
    <section className="space-y-6">
      {/* Group Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-white" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Deal, Seller &amp; Market Snapshot
          </h3>
          {showSuccess && (
            <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-green-500/20 text-green-100 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Saved
            </span>
          )}
        </div>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white text-[10px] font-bold uppercase tracking-widest"
          >
            <Edit3 className="w-3 h-3" /> Edit Snapshot
          </button>
        ) : (
          <button
            onClick={() => {
              setIsEditing(false);
              // Revert
              setFormData({
                leadSource: project.leadSource || '',
                listingUrl: project.listingUrl || '',
                askingPrice: project.askingPriceCents ? (project.askingPriceCents / 100).toString() : '',
                subjectDom: project.subjectDom != null ? project.subjectDom.toString() : '',
                leadAgent: project.leadAgent || '',
                dateIdentified: project.dateIdentified
                  ? new Date(project.dateIdentified).toISOString().split('T')[0]
                  : '',
                sellerName: project.sellerName || '',
                sellerType: project.sellerType || '',
                sellerMotivation: project.sellerMotivation || '',
                sellerContact: project.sellerContact || '',
                submarket: project.submarket || '',
                medianSalesPrice: project.medianSalesPriceCents ? (project.medianSalesPriceCents / 100).toString() : '',
                medianRent: project.medianRentCents ? (project.medianRentCents / 100).toString() : '',
                marketVacancyRate: project.marketVacancyRate != null ? project.marketVacancyRate.toString() : '',
                hazardFlag: !!project.hazardFlag,
                hazardNote: project.hazardNote || '',
              });
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white text-[10px] font-bold uppercase tracking-widest"
          >
            <X className="w-3 h-3" /> Cancel
          </button>
        )}
      </div>

      {/* Snapshot Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* CARD 1: Source Snapshot */}
        <div className="rounded-xl overflow-hidden border border-white/5 bg-[#161217]" style={{ backdropFilter: 'blur(16px)' }}>
          <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2.5 bg-white/[0.02]">
            <Compass className="w-4 h-4 text-[#9E9DA0]" />
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-white">Source Snapshot</h4>
          </div>
          <div className="p-5 space-y-4">
            {isEditing ? (
              <>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0] mb-1.5">Lead Source</label>
                  <input
                    type="text"
                    value={formData.leadSource}
                    onChange={(e) => setFormData({ ...formData, leadSource: e.target.value })}
                    className="w-full rounded-lg px-3 py-2 text-xs bg-[#241e26] border border-white/10 text-white focus:outline-none focus:border-[#454955]"
                    placeholder="e.g. MLS, Direct Mail"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0] mb-1.5">Listing URL</label>
                  <input
                    type="text"
                    value={formData.listingUrl}
                    onChange={(e) => setFormData({ ...formData, listingUrl: e.target.value })}
                    className="w-full rounded-lg px-3 py-2 text-xs bg-[#241e26] border border-white/10 text-white focus:outline-none focus:border-[#454955]"
                    placeholder="e.g. https://redfin.com/..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0] mb-1.5">Asking Price ($)</label>
                    <input
                      type="number"
                      value={formData.askingPrice}
                      onChange={(e) => setFormData({ ...formData, askingPrice: e.target.value })}
                      className="w-full rounded-lg px-3 py-2 text-xs bg-[#241e26] border border-white/10 text-white focus:outline-none focus:border-[#454955] font-mono"
                      placeholder="e.g. 295000"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0] mb-1.5">Subject DOM</label>
                    <input
                      type="number"
                      value={formData.subjectDom}
                      onChange={(e) => setFormData({ ...formData, subjectDom: e.target.value })}
                      className="w-full rounded-lg px-3 py-2 text-xs bg-[#241e26] border border-white/10 text-white focus:outline-none focus:border-[#454955] font-mono"
                      placeholder="e.g. 14"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0] mb-1.5">Agent</label>
                  <input
                    type="text"
                    value={formData.leadAgent}
                    onChange={(e) => setFormData({ ...formData, leadAgent: e.target.value })}
                    className="w-full rounded-lg px-3 py-2 text-xs bg-[#241e26] border border-white/10 text-white focus:outline-none focus:border-[#454955]"
                    placeholder="e.g. Jane Doe, RE/MAX"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0] mb-1.5">Date Identified</label>
                  <input
                    type="date"
                    value={formData.dateIdentified}
                    onChange={(e) => setFormData({ ...formData, dateIdentified: e.target.value })}
                    className="w-full rounded-lg px-3 py-2 text-xs bg-[#241e26] border border-white/10 text-white focus:outline-none focus:border-[#454955] font-mono"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
              </>
            ) : (
              <div className="space-y-3.5 text-xs">
                <div>
                  <span className="block text-[9px] uppercase tracking-widest text-[#9E9DA0]">Lead Source</span>
                  <span className="font-semibold text-white">{project.leadSource || '—'}</span>
                </div>
                <div>
                  <span className="block text-[9px] uppercase tracking-widest text-[#9E9DA0]">Listing URL</span>
                  {project.listingUrl ? (
                    <a
                      href={project.listingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#7A9EAA] hover:underline flex items-center gap-1 font-medium truncate"
                    >
                      <LinkIcon className="w-3 h-3 shrink-0" /> Link
                    </a>
                  ) : (
                    <span className="text-[#9E9DA0] italic">None provided</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="block text-[9px] uppercase tracking-widest text-[#9E9DA0]">Asking Price</span>
                    <span className="font-bold text-white font-mono">{project.askingPriceCents ? formatCurrency(project.askingPriceCents / 100) : '—'}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase tracking-widest text-[#9E9DA0]">Subject DOM</span>
                    <span className="font-semibold text-white font-mono">{project.subjectDom != null ? `${project.subjectDom} days` : '—'}</span>
                  </div>
                </div>
                <div>
                  <span className="block text-[9px] uppercase tracking-widest text-[#9E9DA0]">Listing Agent</span>
                  <span className="font-semibold text-white">{project.leadAgent || '—'}</span>
                </div>
                <div>
                  <span className="block text-[9px] uppercase tracking-widest text-[#9E9DA0]">Date Identified</span>
                  <span className="font-semibold text-white font-mono">
                    {project.dateIdentified
                      ? new Date(project.dateIdentified).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                      : '—'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CARD 2: Seller Snapshot */}
        <div className="rounded-xl overflow-hidden border border-white/5 bg-[#161217]" style={{ backdropFilter: 'blur(16px)' }}>
          <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-2.5">
              <User className="w-4 h-4 text-[#9E9DA0]" />
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-white">Seller Snapshot</h4>
            </div>
            <span
              className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                isSellerComplete ? 'bg-green-500/10 text-green-400 border border-green-500/25' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/25'
              }`}
            >
              {isSellerComplete ? '✓ Complete' : '○ Name or Type Required'}
            </span>
          </div>
          <div className="p-5 space-y-4">
            {isEditing ? (
              <>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0] mb-1.5">Seller Name</label>
                  <input
                    type="text"
                    value={formData.sellerName}
                    onChange={(e) => setFormData({ ...formData, sellerName: e.target.value })}
                    className="w-full rounded-lg px-3 py-2 text-xs bg-[#241e26] border border-white/10 text-white focus:outline-none focus:border-[#454955]"
                    placeholder="e.g. John Smith"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0] mb-1.5">Seller Type</label>
                  <select
                    value={formData.sellerType}
                    onChange={(e) => setFormData({ ...formData, sellerType: e.target.value })}
                    className="w-full rounded-lg px-3 py-2 text-xs bg-[#241e26] border border-white/10 text-white focus:outline-none focus:border-[#454955]"
                  >
                    <option value="">Select seller type...</option>
                    <option value="Individual">Individual</option>
                    <option value="Estate">Estate / Inherited</option>
                    <option value="Bank">Bank / REO</option>
                    <option value="Institutional">Institutional / Corporate</option>
                    <option value="Government">Government / HUD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0] mb-1.5">Motivation</label>
                  <input
                    type="text"
                    value={formData.sellerMotivation}
                    onChange={(e) => setFormData({ ...formData, sellerMotivation: e.target.value })}
                    className="w-full rounded-lg px-3 py-2 text-xs bg-[#241e26] border border-white/10 text-white focus:outline-none focus:border-[#454955]"
                    placeholder="e.g. Foreclosure, Tired landlord"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0] mb-1.5">Contact Info</label>
                  <input
                    type="text"
                    value={formData.sellerContact}
                    onChange={(e) => setFormData({ ...formData, sellerContact: e.target.value })}
                    className="w-full rounded-lg px-3 py-2 text-xs bg-[#241e26] border border-white/10 text-white focus:outline-none focus:border-[#454955]"
                    placeholder="e.g. 555-0199 or email"
                  />
                </div>
              </>
            ) : (
              <div className="space-y-3.5 text-xs">
                <div>
                  <span className="block text-[9px] uppercase tracking-widest text-[#9E9DA0]">Seller Name</span>
                  <span className="font-semibold text-white">{project.sellerName || '—'}</span>
                </div>
                <div>
                  <span className="block text-[9px] uppercase tracking-widest text-[#9E9DA0]">Seller Type</span>
                  <span className="font-semibold text-white">{project.sellerType || '—'}</span>
                </div>
                <div>
                  <span className="block text-[9px] uppercase tracking-widest text-[#9E9DA0]">Motivation</span>
                  <span className="font-semibold text-white">{project.sellerMotivation || '—'}</span>
                </div>
                <div>
                  <span className="block text-[9px] uppercase tracking-widest text-[#9E9DA0]">Contact Information</span>
                  <span className="font-semibold text-white">{project.sellerContact || '—'}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CARD 3: Market Snapshot */}
        <div className="rounded-xl overflow-hidden border border-white/5 bg-[#161217]" style={{ backdropFilter: 'blur(16px)' }}>
          <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2.5 bg-white/[0.02]">
            <TrendingUp className="w-4 h-4 text-[#9E9DA0]" />
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-white">Market Snapshot</h4>
          </div>
          <div className="p-5 space-y-4">
            {isEditing ? (
              <>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0] mb-1.5">Submarket</label>
                  <input
                    type="text"
                    value={formData.submarket}
                    onChange={(e) => setFormData({ ...formData, submarket: e.target.value })}
                    className="w-full rounded-lg px-3 py-2 text-xs bg-[#241e26] border border-white/10 text-white focus:outline-none focus:border-[#454955]"
                    placeholder="e.g. Brickell, Downtown"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0] mb-1.5">Median Sales ($)</label>
                    <input
                      type="number"
                      value={formData.medianSalesPrice}
                      onChange={(e) => setFormData({ ...formData, medianSalesPrice: e.target.value })}
                      className="w-full rounded-lg px-3 py-2 text-xs bg-[#241e26] border border-white/10 text-white focus:outline-none focus:border-[#454955] font-mono"
                      placeholder="e.g. 350000"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0] mb-1.5">Median Rent ($/mo)</label>
                    <input
                      type="number"
                      value={formData.medianRent}
                      onChange={(e) => setFormData({ ...formData, medianRent: e.target.value })}
                      className="w-full rounded-lg px-3 py-2 text-xs bg-[#241e26] border border-white/10 text-white focus:outline-none focus:border-[#454955] font-mono"
                      placeholder="e.g. 2100"
                    />
                  </div>
                </div>

                {/* Live calculated rent-to-price ratio */}
                <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                  <span className="block text-[9px] uppercase tracking-widest text-[#9E9DA0]">Rent-to-Price Ratio (Live)</span>
                  <span className="text-xs font-bold font-mono text-[#7A9EAA]">
                    {liveRentToPriceRatio !== null ? `${liveRentToPriceRatio.toFixed(3)}%` : 'Enter Medians to Compute'}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0] mb-1.5">Vacancy Estimate (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.marketVacancyRate}
                      onChange={(e) => setFormData({ ...formData, marketVacancyRate: e.target.value })}
                      className="w-full rounded-lg px-3 py-2 text-xs bg-[#241e26] border border-white/10 text-white focus:outline-none focus:border-[#454955] font-mono"
                      placeholder="e.g. 5.5"
                    />
                  </div>
                </div>

                {/* Hazard Flag + Note */}
                <div className="pt-2 border-t border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0]">Environmental Hazard?</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.hazardFlag}
                        onChange={(e) => setFormData({ ...formData, hazardFlag: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-white/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-500"></div>
                    </label>
                  </div>
                  {formData.hazardFlag && (
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-red-400 mb-1">Hazard Notes</label>
                      <textarea
                        value={formData.hazardNote}
                        onChange={(e) => setFormData({ ...formData, hazardNote: e.target.value })}
                        className="w-full rounded-lg px-3 py-2 text-xs bg-[#241e26] border border-red-500/20 text-white focus:outline-none focus:border-red-500"
                        placeholder="e.g. Flood Zone AE, high radon risk"
                        rows={2}
                      />
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-3.5 text-xs">
                <div>
                  <span className="block text-[9px] uppercase tracking-widest text-[#9E9DA0]">Submarket</span>
                  <span className="font-semibold text-white">{project.submarket || '—'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="block text-[9px] uppercase tracking-widest text-[#9E9DA0]">Median Sales Price</span>
                    <span className="font-semibold text-white font-mono">{project.medianSalesPriceCents ? formatCurrency(project.medianSalesPriceCents / 100) : '—'}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase tracking-widest text-[#9E9DA0]">Median Rent</span>
                    <span className="font-semibold text-white font-mono">{project.medianRentCents ? `${formatCurrency(project.medianRentCents / 100)}/mo` : '—'}</span>
                  </div>
                </div>

                {/* Rent-to-price ratio display */}
                <div>
                  <span className="block text-[9px] uppercase tracking-widest text-[#9E9DA0]">Rent-to-Price Ratio</span>
                  <span className="font-bold text-[#7A9EAA] font-mono">
                    {project.medianRentCents && project.medianSalesPriceCents
                      ? `${((project.medianRentCents / project.medianSalesPriceCents) * 100).toFixed(3)}%`
                      : '—'}
                  </span>
                </div>

                <div>
                  <span className="block text-[9px] uppercase tracking-widest text-[#9E9DA0]">Market Vacancy Rate</span>
                  <span className="font-semibold text-white font-mono">{project.marketVacancyRate != null ? `${project.marketVacancyRate}%` : '—'}</span>
                </div>

                {/* Hazard Info */}
                {project.hazardFlag ? (
                  <div className="p-3 rounded-lg bg-red-950/20 border border-red-900/30 flex gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-[9px] font-bold uppercase tracking-widest text-red-400">Hazard Identified</span>
                      <p className="text-red-200 mt-1 text-[11px] leading-relaxed">{project.hazardNote || 'No description provided'}</p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <span className="block text-[9px] uppercase tracking-widest text-[#9E9DA0]">Environmental Hazards</span>
                    <span className="font-semibold text-green-400">✓ None Indicated</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Edit Mode Save Action (Single Dispatch) */}
      {isEditing && (
        <div className="flex justify-end pt-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-3 rounded-lg text-white text-xs font-bold uppercase tracking-widest transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: phaseColor }}
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Save Snapshot Details
          </button>
        </div>
      )}
    </section>
  );
}
