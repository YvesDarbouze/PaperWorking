'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, AlertCircle, Sparkles, DollarSign, FileText, CheckCircle, RefreshCw, PartyPopper } from 'lucide-react';
import type { Project, IncomeLedgerEntry, TenantRegistryEntry } from '@/types/schema';
import { computeAutopsyMetrics } from '@/lib/math/calculatorUtils';

interface EventTriggeredHoldGateProps {
  project: Project;
  onRecordRentPayment: (amount: number) => Promise<void>;
  onActivateLease: (tenantName: string, rentAmount: number, leaseStart: string, leaseEnd: string) => Promise<void>;
  onMarkSaleUnderContract: () => Promise<void>;
  onAdvanceToExit: (baseline: {
    costBasis: number;
    capitalizedImprovements: number;
    holdingCosts: number;
    outcome: string;
  }) => Promise<void>;
}

export function EventTriggeredHoldGate({
  project,
  onRecordRentPayment,
  onActivateLease,
  onMarkSaleUnderContract,
  onAdvanceToExit
}: EventTriggeredHoldGateProps) {
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState('');
  const [isAdvancing, setIsAdvancing] = useState(false);

  // Form states for simulations
  const [rentAmount, setRentAmount] = useState('2500');
  const [tenantName, setTenantName] = useState('Jane Doe');
  const [leaseRent, setLeaseRent] = useState('2500');
  const [leaseStart, setLeaseStart] = useState(new Date().toISOString().slice(0, 10));
  const [leaseEnd, setLeaseEnd] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  });

  const [activeForm, setActiveForm] = useState<'rent' | 'lease' | null>(null);

  // Compute baseline metrics
  const autopsy = computeAutopsyMetrics(project);
  const costBasis = project.financials?.initialCapitalizedBasis || (autopsy.purchasePrice + autopsy.acquisitionCosts);
  const capitalizedImprovements = autopsy.actualRehabCost;
  const holdingCosts = autopsy.holdingCosts;

  // Gating event checks
  const incomeLedger = project.financials?.incomeLedger || [];
  const tenantRegistry = project.financials?.tenantRegistry || [];
  const saleUnderContract = project.financials?.sale_under_contract === true;

  const rentPayments = incomeLedger.filter(e => e.type === 'rent' && e.amount > 0);
  const confirmedRentPayment = rentPayments.length > 0;
  const activatedLease = tenantRegistry.some(t => t.status === 'active');

  const rentEventValue = confirmedRentPayment ? rentPayments[0] : null;
  const leaseEventValue = tenantRegistry.find(t => t.status === 'active') || null;

  // Let's determine which event triggered the gate
  let triggeredEvent: 'rent' | 'lease' | 'sale' | null = null;
  let triggerOutcome = '';

  if (confirmedRentPayment) {
    triggeredEvent = 'rent';
    triggerOutcome = `First rent payment of $${((rentEventValue?.amount || 0) / 100).toLocaleString()} confirmed on ${rentEventValue?.date || 'N/A'}.`;
  } else if (activatedLease) {
    triggeredEvent = 'lease';
    triggerOutcome = `Active lease registered starting ${leaseEventValue?.leaseStart || 'N/A'} for $${((leaseEventValue?.rentAmount || 0) / 100).toLocaleString()}/month.`;
  } else if (saleUnderContract) {
    triggeredEvent = 'sale';
    triggerOutcome = `Property marked under contract for sale at target list price of $${((project.financials?.list_price_sale || 0) / 100).toLocaleString()}.`;
  }

  // Effect to automatically advance when a trigger is newly satisfied
  useEffect(() => {
    if (triggeredEvent && project.currentPhase === 3 && !isAdvancing) {
      const performAutoAdvance = async () => {
        setIsAdvancing(true);
        setCelebrationMessage(triggerOutcome);
        setShowCelebration(true);

        // Wait for visual celebration before completing database transition
        setTimeout(async () => {
          try {
            await onAdvanceToExit({
              costBasis,
              capitalizedImprovements,
              holdingCosts,
              outcome: triggerOutcome
            });
          } catch (err) {
            console.error('Failed to auto-advance project:', err);
          } finally {
            setIsAdvancing(false);
          }
        }, 3500);
      };

      performAutoAdvance();
    }
  }, [confirmedRentPayment, activatedLease, saleUnderContract, project.currentPhase]);

  const handleSimulateRent = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(rentAmount.replace(/,/g, ''));
    if (isNaN(amt) || amt <= 0) return;
    await onRecordRentPayment(Math.round(amt * 100));
    setActiveForm(null);
  };

  const handleSimulateLease = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(leaseRent.replace(/,/g, ''));
    if (isNaN(amt) || amt <= 0 || !tenantName.trim()) return;
    await onActivateLease(tenantName.trim(), Math.round(amt * 100), leaseStart, leaseEnd);
    setActiveForm(null);
  };

  return (
    <div className="relative">
      {/* Visual Celebration Overlay */}
      {showCelebration && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center text-center p-6 backdrop-blur-md animate-fade-in">
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
            {/* Sparkles / Confetti particles simulation */}
            <div className="absolute top-1/4 left-1/4 w-3 h-3 bg-yellow-400 rounded-full animate-ping" />
            <div className="absolute top-1/3 right-1/4 w-2 h-2 bg-[#7A9EAA] rounded-full animate-ping" style={{ animationDelay: '1s' }} />
            <div className="absolute bottom-1/4 left-1/3 w-2.5 h-2.5 bg-green-400 rounded-full animate-ping" style={{ animationDelay: '1.5s' }} />
            <div className="absolute top-1/2 right-1/3 w-3 h-3 bg-purple-400 rounded-full animate-ping" style={{ animationDelay: '0.5s' }} />
          </div>

          <div className="space-y-6 max-w-lg relative z-10">
            <div className="inline-flex p-4 bg-green-500/20 border border-green-500/30 rounded-full text-green-400 animate-bounce">
              <PartyPopper className="w-16 h-16" />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] text-[#7A9EAA] uppercase font-bold tracking-widest block">
                Hold Gate Fired
              </span>
              <h2 className="text-3xl font-black text-white tracking-tight">
                Project Advanced to Exit!
              </h2>
              <p className="text-sm text-[#9E9DA0] px-4 leading-relaxed">
                The triggering marketing event has completed. All baseline operations, historical carry, and current values have been locked &amp; handed to the Exit phase.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-left space-y-3 font-mono text-xs">
              <div className="text-center font-bold text-white border-b border-white/5 pb-2 uppercase tracking-wider text-[10px]">
                Operating Baseline Logged
              </div>
              <div className="flex justify-between">
                <span className="text-[#9E9DA0]">Cost Basis:</span>
                <span className="text-white">${(costBasis / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9E9DA0]">Capitalized Rehab:</span>
                <span className="text-white">${(capitalizedImprovements / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9E9DA0]">Total Holding Costs:</span>
                <span className="text-white">${(holdingCosts / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="border-t border-white/5 pt-2 text-[10px] text-[#7A9EAA] leading-normal italic text-center">
                "{celebrationMessage}"
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-[#9E9DA0] pt-4">
              <RefreshCw className="w-4 h-4 animate-spin text-[#7A9EAA]" />
              <span>Notifying Lead Investor &amp; syncing transaction tables...</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Gate Dashboard Component */}
      <div className="glass-card border border-white/5 rounded-xl p-5 text-left space-y-5">
        <div>
          <span className="text-[10px] text-[#7A9EAA] uppercase font-bold tracking-wider">
            Lifecycle Transition Gate
          </span>
          <h3 className="text-sm font-bold text-white uppercase tracking-wide mt-0.5">
            Hold to Exit Gating Controls
          </h3>
          <p className="text-xs text-[#9E9DA0] mt-1 leading-normal">
            No checkboxes or manual sign-off buttons are present. This gate triggers automatically once any of the three lease, rent, or sale milestone events are verified.
          </p>
        </div>

        {/* Trigger Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Card 1: Rent Payment */}
          <div className={`p-4 rounded-xl border relative overflow-hidden transition ${
            confirmedRentPayment ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-white/5'
          }`}>
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] text-[#9E9DA0] uppercase font-bold tracking-wider">
                  Milestone Trigger 1
                </span>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mt-0.5">
                  Confirmed Rent
                </h4>
              </div>
              {confirmedRentPayment ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : (
                <span className="text-[9px] bg-yellow-400/10 text-yellow-400 px-2 py-0.5 rounded font-mono font-bold">
                  PENDING
                </span>
              )}
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-[10px] text-[#9E9DA0] leading-normal">
                Satisfied by logging the first rental income entry of type 'rent' in the ledger.
              </p>
              {confirmedRentPayment ? (
                <div className="bg-black/20 p-2 rounded text-[10px] text-green-400 font-mono">
                  Rent of ${(rentEventValue!.amount / 100).toLocaleString()} confirmed on {rentEventValue!.date}.
                </div>
              ) : (
                activeForm !== 'rent' && (
                  <button
                    onClick={() => setActiveForm('rent')}
                    className="text-[9px] text-[#7A9EAA] hover:underline font-bold"
                  >
                    + Record Confirmed Rent Payment
                  </button>
                )
              )}
            </div>

            {activeForm === 'rent' && (
              <form onSubmit={handleSimulateRent} className="mt-3 bg-black/20 p-2 rounded space-y-2">
                <div>
                  <label className="text-[8px] uppercase font-bold text-[#9E9DA0]">Rent Amount ($)</label>
                  <input
                    type="text"
                    required
                    value={rentAmount}
                    onChange={e => setRentAmount(e.target.value)}
                    className="bg-black/30 border border-white/10 rounded px-2 py-1 text-[10px] text-white w-full outline-none font-mono mt-0.5"
                  />
                </div>
                <div className="flex justify-end gap-1.5 text-[9px]">
                  <button type="button" onClick={() => setActiveForm(null)} className="text-[#9E9DA0] hover:underline">
                    Cancel
                  </button>
                  <button type="submit" className="bg-[#7A9EAA] text-white px-2 py-0.5 rounded font-bold">
                    Log Rent
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Card 2: Activated Lease */}
          <div className={`p-4 rounded-xl border relative overflow-hidden transition ${
            activatedLease ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-white/5'
          }`}>
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] text-[#9E9DA0] uppercase font-bold tracking-wider">
                  Milestone Trigger 2
                </span>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mt-0.5">
                  Activated Lease
                </h4>
              </div>
              {activatedLease ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : (
                <span className="text-[9px] bg-yellow-400/10 text-yellow-400 px-2 py-0.5 rounded font-mono font-bold">
                  PENDING
                </span>
              )}
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-[10px] text-[#9E9DA0] leading-normal">
                Satisfied by logging an active lease entry in the property tenant registry.
              </p>
              {activatedLease ? (
                <div className="bg-black/20 p-2 rounded text-[10px] text-green-400 font-mono">
                  Lease registered starting {leaseEventValue?.leaseStart || 'N/A'} for ${(leaseEventValue!.rentAmount / 100).toLocaleString()}/mo.
                </div>
              ) : (
                activeForm !== 'lease' && (
                  <button
                    onClick={() => setActiveForm('lease')}
                    className="text-[9px] text-[#7A9EAA] hover:underline font-bold"
                  >
                    + Activate Lease in Registry
                  </button>
                )
              )}
            </div>

            {activeForm === 'lease' && (
              <form onSubmit={handleSimulateLease} className="mt-3 bg-black/20 p-2 rounded space-y-2">
                <div className="space-y-1.5">
                  <div>
                    <label className="text-[8px] uppercase font-bold text-[#9E9DA0]">Tenant Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Jane Doe"
                      value={tenantName}
                      onChange={e => setTenantName(e.target.value)}
                      className="bg-black/30 border border-white/10 rounded px-2 py-1 text-[10px] text-white w-full outline-none mt-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-[8px] uppercase font-bold text-[#9E9DA0]">Monthly Rent ($)</label>
                    <input
                      type="text"
                      required
                      value={leaseRent}
                      onChange={e => setLeaseRent(e.target.value)}
                      className="bg-black/30 border border-white/10 rounded px-2 py-1 text-[10px] text-white w-full outline-none font-mono mt-0.5"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-1.5 text-[9px] pt-1">
                  <button type="button" onClick={() => setActiveForm(null)} className="text-[#9E9DA0] hover:underline">
                    Cancel
                  </button>
                  <button type="submit" className="bg-[#7A9EAA] text-white px-2 py-0.5 rounded font-bold">
                    Activate
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Card 3: Sale Under Contract */}
          <div className={`p-4 rounded-xl border relative overflow-hidden transition ${
            saleUnderContract ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-white/5'
          }`}>
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] text-[#9E9DA0] uppercase font-bold tracking-wider">
                  Milestone Trigger 3
                </span>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mt-0.5">
                  Sale Contract
                </h4>
              </div>
              {saleUnderContract ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : (
                <span className="text-[9px] bg-yellow-400/10 text-yellow-400 px-2 py-0.5 rounded font-mono font-bold">
                  PENDING
                </span>
              )}
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-[10px] text-[#9E9DA0] leading-normal">
                Satisfied when the property is marked as under contract for sale.
              </p>
              {saleUnderContract ? (
                <div className="bg-black/20 p-2 rounded text-[10px] text-green-400 font-mono">
                  Property under contract at target list price of ${( (project.financials?.list_price_sale || 0) / 100).toLocaleString()}.
                </div>
              ) : (
                <button
                  onClick={onMarkSaleUnderContract}
                  className="text-[9px] text-[#7A9EAA] hover:underline font-bold"
                >
                  Mark Sale Under Contract
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Operating Baseline Preview */}
        <div className="bg-white/5 border border-white/5 rounded-xl p-4 space-y-3">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-[#7A9EAA]" />
            Operating Baseline Preview
          </h4>
          <p className="text-[10px] text-[#9E9DA0]">
            The locked financial and operational baseline that is immediately copied to Phase 4 (Exit) once a trigger event fires.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1.5 font-mono">
            <div className="bg-black/25 p-3 rounded-lg border border-white/5">
              <span className="text-[9px] text-[#9E9DA0] uppercase font-bold block mb-1">Cost Basis</span>
              <span className="text-white text-sm font-bold">${(costBasis / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="bg-black/25 p-3 rounded-lg border border-white/5">
              <span className="text-[9px] text-[#9E9DA0] uppercase font-bold block mb-1">Capitalized Rehab</span>
              <span className="text-white text-sm font-bold">${(capitalizedImprovements / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="bg-black/25 p-3 rounded-lg border border-white/5">
              <span className="text-[9px] text-[#9E9DA0] uppercase font-bold block mb-1">Accumulated Holding Costs</span>
              <span className="text-white text-sm font-bold">${(holdingCosts / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
