'use client';

import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  CheckCircle, 
  HelpCircle, 
  Upload, 
  Info, 
  Users, 
  RefreshCw, 
  AlertCircle,
  TrendingUp,
  FileText
} from 'lucide-react';
import type { Project, FractionalInvestor } from '@/types/schema';
import { deriveAllProjectMetrics } from '@/lib/metrics/reiMetrics';
import { uploadFile } from '@/lib/storage/uploadService';
import { IS_DEMO_MODE } from '@/lib/config/demo';
import toast from 'react-hot-toast';

interface TitleHoldingCardProps {
  project: Project;
  onSaveFinancials: (updates: any) => Promise<void>;
  onSaveProject?: (updates: Partial<Project>) => Promise<void>;
  refresh: () => void;
  readOnly?: boolean;
}

export function TitleHoldingCard({
  project,
  onSaveFinancials,
  onSaveProject,
  refresh,
  readOnly = false,
}: TitleHoldingCardProps) {
  const financials = project.financials || {};
  
  // Local form states synced with database or defaulting
  const titleHolding = financials.titleHolding || 'TIC';
  const titleHoldingDerived = financials.titleHoldingDerived !== false;
  
  const agreementUrl = financials.titleCoOwnershipAgreementUrl || null;
  const agreementName = financials.titleCoOwnershipAgreementName || null;
  const agreementStatus = financials.titleCoOwnershipAgreementStatus || 'unsigned';

  // Manual ownership share states
  const [manualShares, setManualShares] = useState<Record<string, string>>({});
  const [savingSplits, setSavingSplits] = useState(false);

  useEffect(() => {
    if (project?.fractionalInvestors) {
      const initial: Record<string, string> = {};
      project.fractionalInvestors.forEach((inv) => {
        initial[inv.id] = String(inv.equityPercentage ?? 0);
      });
      setManualShares(initial);
    }
  }, [project]);
  
  // State for the interactive FX-2 simulator
  const [simulationActive, setSimulationActive] = useState(false);
  const [uploading, setUploading] = useState(false);

  // FX-2 Recalculation Engine (Lives inside this card for preview, aligned with deriveAllProjectMetrics)
  const renderFX2Calculation = () => {
    // FX-2 exact scenario parameters
    const purchasePrice = 279000;
    const initialA = 167400; // 60.00%
    const initialB = 111600; // 40.00%
    const additionB = 10000;
    
    const finalA = initialA;
    const finalB = initialB + (simulationActive ? additionB : 0);
    const newBasis = finalA + finalB;
    
    let pctA = 0;
    let pctB = 0;

    if (titleHolding === 'JTWROS') {
      pctA = 50.00;
      pctB = 50.00;
    } else {
      if (titleHoldingDerived) {
        pctA = Number(((finalA / newBasis) * 100).toFixed(2));
        pctB = Number(((finalB / newBasis) * 100).toFixed(2));
        
        // Discrepancy reconciliation
        const sum = pctA + pctB;
        if (sum !== 100.00) {
          const diff = Number((100.00 - sum).toFixed(2));
          if (finalA >= finalB) {
            pctA = Number((pctA + diff).toFixed(2));
          } else {
            pctB = Number((pctB + diff).toFixed(2));
          }
        }
      } else {
        // Manual preview logic
        pctA = 60.00;
        pctB = 40.00;
      }
    }

    return {
      purchasePrice,
      basis: newBasis,
      partyA: { contribution: finalA, pct: pctA },
      partyB: { contribution: finalB, pct: pctB },
      additionAmount: additionB
    };
  };

  const fx2 = renderFX2Calculation();

  // Handle saving the title holding selection
  const handleTypeChange = async (type: 'TIC' | 'JTWROS') => {
    if (readOnly) return;
    try {
      if (type === 'JTWROS' && project.fractionalInvestors && project.fractionalInvestors.length > 0 && onSaveProject) {
        const count = project.fractionalInvestors.length;
        const basePct = Math.floor((100 / count) * 100) / 100;
        const remainder = Math.round((100 - basePct * count) * 100) / 100;
        
        const updatedInvestors = project.fractionalInvestors.map((inv, idx) => ({
          ...inv,
          equityPercentage: Math.round((idx === 0 ? basePct + remainder : basePct) * 100) / 100,
        }));
        
        await onSaveProject({
          fractionalInvestors: updatedInvestors,
          financials: { ...project.financials, titleHolding: type }
        });
      } else {
        await onSaveFinancials({ titleHolding: type });
      }
      toast.success(`Title holding updated to ${type === 'TIC' ? 'Tenants in Common' : 'Joint Tenancy'}`);
      refresh();
    } catch (e) {
      toast.error('Failed to save title holding type');
    }
  };

  const handleSaveManualSplits = async () => {
    if (readOnly || !onSaveProject) return;
    
    // Validate manual shares sum to exactly 100.00%
    const sum = Object.values(manualShares).reduce((acc, v) => acc + (parseFloat(v) || 0), 0);
    const formattedSum = Number(sum.toFixed(2));
    if (formattedSum !== 100.00) {
      toast.error(`Ownership splits must sum to exactly 100.00% (currently ${formattedSum.toFixed(2)}%)`);
      return;
    }

    setSavingSplits(true);
    try {
      const updatedInvestors = (project.fractionalInvestors || []).map((inv) => ({
        ...inv,
        equityPercentage: parseFloat(manualShares[inv.id]) || 0,
      }));

      await onSaveProject({
        fractionalInvestors: updatedInvestors
      });
      toast.success('Ownership splits saved successfully');
      refresh();
    } catch (e) {
      console.error(e);
      toast.error('Failed to save manual ownership splits');
    } finally {
      setSavingSplits(false);
    }
  };

  const handleDerivedToggle = async (derived: boolean) => {
    if (readOnly) return;
    try {
      await onSaveFinancials({ titleHoldingDerived: derived });
      toast.success(`Ownership splits will be ${derived ? 'derived from contributions' : 'configured manually'}`);
      refresh();
    } catch (e) {
      toast.error('Failed to save calculation mode');
    }
  };

  const handleStatusChange = async (status: typeof agreementStatus) => {
    if (readOnly) return;
    try {
      await onSaveFinancials({ titleCoOwnershipAgreementStatus: status });
      toast.success(`Agreement status updated to ${status.replace('-', ' ').toUpperCase()}`);
      refresh();
    } catch (e) {
      toast.error('Failed to save agreement status');
    }
  };

  // Co-ownership agreement document upload
  const triggerAgreementUpload = async () => {
    if (readOnly) return;

    if (IS_DEMO_MODE) {
      setUploading(true);
      await new Promise((resolve) => setTimeout(resolve, 600));
      await onSaveFinancials({
        titleCoOwnershipAgreementUrl: '/mock/documents/co_ownership_agreement_signed.pdf',
        titleCoOwnershipAgreementName: 'co_ownership_agreement_signed.pdf',
        titleCoOwnershipAgreementStatus: 'verified',
      });
      setUploading(false);
      toast.success('Co-ownership agreement document uploaded! (Demo)');
      refresh();
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(true);
      const toastId = toast.loading(`Uploading ${file.name}...`);
      try {
        const res = await uploadFile({
          file,
          path: 'co_ownership_agreements',
          projectId: project.id,
        });
        await onSaveFinancials({
          titleCoOwnershipAgreementUrl: res.downloadUrl,
          titleCoOwnershipAgreementName: file.name,
          titleCoOwnershipAgreementStatus: 'signed',
        });
        toast.success('Co-ownership agreement document uploaded!', { id: toastId });
        refresh();
      } catch (err: any) {
        console.error('Upload failed:', err);
        toast.error(`Upload failed: ${err.message || 'Unknown error'}`, { id: toastId });
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  const getStatusBadgeStyles = (status: typeof agreementStatus) => {
    switch (status) {
      case 'unsigned':
        return 'bg-pw-black/40 text-pw-muted border border-pw-border';
      case 'docs-out':
        return 'bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]';
      case 'signed':
        return 'bg-[#F5F3FF] text-[#6D28D9] border border-[#DDD6FE]';
      case 'verified':
        return 'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]';
    }
  };

  // Derive live cap table metrics using the deriveAllProjectMetrics engine
  const derivedMetrics = deriveAllProjectMetrics(project);
  const liveShares = derivedMetrics.coBuyShares || [];

  const manualSum = Object.values(manualShares).reduce((acc, v) => acc + (parseFloat(v) || 0), 0);
  const formattedManualSum = Number(manualSum.toFixed(2));
  const isValidSum = formattedManualSum === 100.00;

  return (
    <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-6 text-[#9E9DA0]">
      
      {/* Title Breadcrumb */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#7A9EAA]" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Card F2.2 — Title Holding (Co-buy)</h3>
        </div>
        <span className="text-[10px] font-bold text-[#7A9EAA] uppercase tracking-wider bg-[#7A9EAA]/15 px-2.5 py-0.5 rounded-full">Equity Segment</span>
      </div>

      {/* Decision Selection Panel */}
      <div className="space-y-4">
        <div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Vesting Modality Selection</h4>
          <p className="text-[11px] text-[#9E9DA0]/80 mt-1">
            Choose Tenants in Common (TIC) to distribute ownership proportionally based on capital contribution, or Joint Tenancy with Right of Survivorship (JTWROS) for equal shares.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => handleTypeChange('TIC')}
            disabled={readOnly}
            className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden ${
              titleHolding === 'TIC'
                ? 'border-[#7A9EAA] bg-[#7A9EAA]/5 text-white'
                : 'border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]'
            }`}
          >
            <div className="flex justify-between items-start mb-1">
              <span className="text-sm font-semibold">Tenants in Common</span>
              {titleHolding === 'TIC' && <CheckCircle className="w-4 h-4 text-[#7A9EAA]" />}
            </div>
            <span className="text-[10px] leading-[14px] text-[#9E9DA0]/70 block">
              TIC allows unequal shares that are independently transferable and inheritable.
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTypeChange('JTWROS')}
            disabled={readOnly}
            className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden ${
              titleHolding === 'JTWROS'
                ? 'border-[#7A9EAA] bg-[#7A9EAA]/5 text-white'
                : 'border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]'
            }`}
          >
            <div className="flex justify-between items-start mb-1">
              <span className="text-sm font-semibold">Joint Tenancy (JTWROS)</span>
              {titleHolding === 'JTWROS' && <CheckCircle className="w-4 h-4 text-[#7A9EAA]" />}
            </div>
            <span className="text-[10px] leading-[14px] text-[#9E9DA0]/70 block">
              All co-buyers hold equal shares with automatic right of survivorship.
            </span>
          </button>
        </div>
      </div>

      {/* Explainer Block */}
      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] leading-[16px] space-y-3">
        <div className="flex items-start gap-2.5">
          <Info className="w-4 h-4 text-[#7A9EAA] flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <div>
              <span className="font-bold text-white uppercase block tracking-wider text-[10px] mb-0.5">Vesting Terms Explainer</span>
              <p>
                <strong>Tenants in Common (TIC):</strong> Ideal for investment partners who contribute different capital amounts and want corresponding ownership percentages. Shares do not carry automatic survivorship rights and can be passed to heirs.
              </p>
              <p className="mt-1.5">
                <strong>Joint Tenancy with Right of Survivorship (JTWROS):</strong> Enforces exactly equal shares (50% each for two owners) regardless of initial capital contributions. On the death of one co-owner, their interest transfers automatically to the surviving owner(s).
              </p>
            </div>
            <p className="text-[10px] text-amber-500/70 border-t border-white/5 pt-2 italic">
              ⚖️ Title holding choices have legal and tax consequences. This choice is a configuration selection; finalize with your closing counsel.
            </p>
          </div>
        </div>
      </div>

      {/* TIC Options Selector */}
      {titleHolding === 'TIC' && (
        <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.01]">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-white uppercase tracking-wider">Calculation Mode</span>
            <p className="text-[10px] text-[#9E9DA0]/70">Derive ownership shares automatically from ledger contributions.</p>
          </div>
          <button
            type="button"
            disabled={readOnly}
            onClick={() => handleDerivedToggle(!titleHoldingDerived)}
            className={`w-12 h-6 rounded-full p-1 transition-all ${
              titleHoldingDerived ? 'bg-[#7A9EAA]' : 'bg-white/10'
            }`}
          >
            <div className={`w-4 h-4 rounded-full bg-white transition-all transform ${
              titleHoldingDerived ? 'translate-x-6' : 'translate-x-0'
            }`} />
          </button>
        </div>
      )}

      {/* Live Partners Cap Table */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <Users className="w-4 h-4 text-[#7A9EAA]" />
          Ownership Registry Rollups
        </h4>
        
        {liveShares.length === 0 ? (
          <div className="p-6 text-center text-xs border border-dashed border-white/5 rounded-xl text-[#9E9DA0]/50">
            No capital partners/investors registered. Add entries to the Contribution Ledger below to populate.
          </div>
        ) : (
          <div className="overflow-hidden border border-white/5 rounded-xl bg-white/[0.01]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-white/[0.03] border-b border-white/5 text-[10px] font-bold text-[#9E9DA0]/70 uppercase tracking-wider">
                  <th className="px-4 py-2.5">Partner Name</th>
                  <th className="px-4 py-2.5 text-right">Capital Contribution</th>
                  <th className="px-4 py-2.5 text-right">Ownership Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white">
                {liveShares.map((share) => (
                  <tr key={share.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-2.5 font-medium">{share.name}</td>
                    <td className="px-4 py-2.5 text-right font-light text-[#9E9DA0]">
                      ${share.contributionAmount.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold" style={{ color: '#7A9EAA' }}>
                      {titleHolding === 'TIC' && !titleHoldingDerived ? (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={manualShares[share.id] ?? ''}
                            disabled={readOnly || savingSplits}
                            onChange={(e) => {
                              setManualShares({
                                ...manualShares,
                                [share.id]: e.target.value
                              });
                            }}
                            className="w-20 text-right bg-pw-black border border-white/10 rounded px-1.5 py-0.5 text-white font-mono font-bold focus:outline-none focus:border-[#7A9EAA] text-xs"
                          />
                          <span className="text-xs text-[#9E9DA0]">%</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          {titleHolding === 'JTWROS' && (
                            <span className="text-[9px] font-bold text-amber-500/70 bg-amber-500/10 px-1.5 py-0.5 rounded-sm uppercase tracking-wider">Equal Share</span>
                          )}
                          <span>{share.ownershipPct.toFixed(2)}%</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {titleHolding === 'TIC' && !titleHoldingDerived && (
              <div className="p-4 bg-white/[0.02] border-t border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  {isValidSum ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                  )}
                  <span className={isValidSum ? 'text-emerald-400 font-semibold' : 'text-amber-500 font-semibold'}>
                    {isValidSum 
                      ? '✓ Splits sum to exactly 100.00%' 
                      : `⚠️ Splits must sum to exactly 100.00% (currently ${formattedManualSum.toFixed(2)}%)`}
                  </span>
                </div>
                
                <button
                  type="button"
                  disabled={readOnly || savingSplits || !isValidSum}
                  onClick={handleSaveManualSplits}
                  className="px-4 py-2 bg-[#7A9EAA] hover:bg-[#6A8E9A] text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50"
                >
                  {savingSplits ? 'Saving...' : 'Save Manual Splits'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* FX-2 Interactive Recalculation Tool */}
      <div className="p-5 rounded-2xl border border-white/5 bg-[#7A9EAA]/5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-[#7A9EAA]" />
              Interactive FX-2 Basis Recalculator
            </h4>
            <p className="text-[10px] text-[#9E9DA0]/80">
              Simulate capital events to verify Tenancy in Common recalculations against FX-2 standard parameters.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSimulationActive(!simulationActive)}
            className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border transition-all ${
              simulationActive
                ? 'border-[#7A9EAA] bg-[#7A9EAA]/15 text-[#7A9EAA]'
                : 'border-white/10 bg-white/5 text-white hover:bg-white/10'
            }`}
          >
            {simulationActive ? 'Active (Basis +$10k)' : 'Simulate Event'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs">
          {/* Inputs Section */}
          <div className="space-y-2 border-r border-white/5 pr-4">
            <div className="flex justify-between">
              <span className="text-[#9E9DA0]/70">Purchase Price:</span>
              <span className="text-white font-mono">$279,000</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#9E9DA0]/70">Party A Initial Capital:</span>
              <span className="text-white font-mono">$167,400</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#9E9DA0]/70">Party B Initial Capital:</span>
              <span className="text-white font-mono">$111,600</span>
            </div>
            {simulationActive && (
              <div className="flex justify-between text-emerald-400 font-semibold animate-in fade-in duration-200">
                <span>Party B Capital Addition:</span>
                <span className="font-mono">+$10,000</span>
              </div>
            )}
            <div className="flex justify-between border-t border-white/5 pt-1.5 font-bold">
              <span className="text-white">Total Project Basis:</span>
              <span className="text-[#7A9EAA] font-mono">${fx2.basis.toLocaleString()}</span>
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase text-[#9E9DA0]/70 tracking-wider">Recalculated Shares</span>
            <div className="flex justify-between">
              <span className="text-[#9E9DA0]">Party A Share:</span>
              <span className="text-white font-bold font-mono">{fx2.partyA.pct.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#9E9DA0]">Party B Share:</span>
              <span className="text-white font-bold font-mono">{fx2.partyB.pct.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between border-t border-white/5 pt-1.5 font-bold">
              <span className="text-[#9E9DA0]">Total Ownership Pct:</span>
              <span className="text-white font-mono">{(fx2.partyA.pct + fx2.partyB.pct).toFixed(2)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Checklist Agreement Upload Card */}
      <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-white uppercase tracking-wider">Co-ownership Agreement Checklist</span>
            <p className="text-[10px] text-[#9E9DA0]/70">Upload legal contract signed by co-purchasing parties.</p>
          </div>
          <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full uppercase tracking-wider border ${getStatusBadgeStyles(agreementStatus)}`}>
            {agreementStatus.replace('-', ' ')}
          </span>
        </div>

        {/* Upload Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {agreementUrl ? (
            <div className="flex-1 w-full flex items-center justify-between p-2.5 rounded-lg border border-white/5 bg-white/[0.02]">
              <div className="flex items-center gap-2 overflow-hidden mr-2">
                <FileText className="w-4 h-4 text-[#7A9EAA] flex-shrink-0" />
                <span className="text-xs text-white truncate font-medium">{agreementName || 'co_ownership_agreement.pdf'}</span>
                {IS_DEMO_MODE && <span className="text-[9px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-sm">Demo</span>}
              </div>
              <div className="flex gap-2">
                <a
                  href={agreementUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white bg-white/5 border border-white/10 hover:bg-white/10 rounded"
                >
                  View
                </a>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={uploading || readOnly}
              onClick={triggerAgreementUpload}
              className="flex-1 w-full p-6 border border-dashed border-white/10 hover:border-white/20 bg-white/[0.01] hover:bg-white/[0.02] rounded-xl flex flex-col items-center justify-center gap-2 group transition-all text-xs font-medium"
            >
              <Upload className="w-5 h-5 text-[#9E9DA0]/50 group-hover:text-white transition-colors" />
              <span>{uploading ? 'Uploading Agreement...' : 'Upload Signed Co-ownership Agreement'}</span>
            </button>
          )}

          {/* Checklist Actions */}
          <div className="flex gap-2 w-full sm:w-auto">
            <select
              value={agreementStatus}
              disabled={readOnly}
              onChange={(e) => handleStatusChange(e.target.value as any)}
              className="flex-1 sm:flex-initial text-xs bg-pw-black border border-white/10 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-[#7A9EAA]/50 font-medium"
            >
              <option value="unsigned">Unsigned</option>
              <option value="docs-out">Docs Out</option>
              <option value="signed">Signed</option>
              <option value="verified">Verified</option>
            </select>
          </div>
        </div>
      </div>

    </div>
  );
}
