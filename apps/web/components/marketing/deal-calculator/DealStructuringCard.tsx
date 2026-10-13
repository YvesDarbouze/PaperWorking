'use client';

import React from 'react';
import type { DealStructuringMetrics } from '@paperworking/financial-engine';
import {
  TreeStructure,
  Bank,
  Money,
  Gauge,
  Handshake,
  Timer,
  User,
  UserPlus,
  Users,
  ChartPie,
} from '@phosphor-icons/react';

export type FinancingModality =
  | 'cash'
  | 'conventional'
  | 'hard_money'
  | 'owner_financing'
  | 'balloon';

export type CapitalSeekingIntent =
  | 'solo'
  | 'partner_down_payment'
  | 'partner_whole_deal'
  | 'crowdfund';

interface DealStructuringCardProps {
  financingModality: FinancingModality;
  onSelectModality: (modality: FinancingModality) => void;
  capitalSeekingIntent: CapitalSeekingIntent;
  onSelectIntent: (intent: CapitalSeekingIntent) => void;
  hardMoneyPoints: number;
  onChangeHardMoneyPoints: (val: number) => void;
  hardMoneyInterestRatePct: number;
  onChangeHardMoneyRate: (val: number) => void;
  hardMoneyTermMonths: number;
  onChangeHardMoneyTerm: (val: number) => void;
  balloonTermMonths: number;
  onChangeBalloonTerm: (val: number) => void;
  partnerEquitySplitPct: number;
  onChangePartnerSplit: (val: number) => void;
  targetCapitalRaise: number;
  onChangeTargetCapitalRaise: (val: number) => void;
  minimumInvestmentTicket: number;
  onChangeMinimumTicket: (val: number) => void;
  preferredReturnPct: number;
  onChangePreferredReturn: (val: number) => void;
  structuringMetrics?: DealStructuringMetrics;
  totalCashRequired: number;
}

export default function DealStructuringCard({
  financingModality,
  onSelectModality,
  capitalSeekingIntent,
  onSelectIntent,
  hardMoneyPoints,
  onChangeHardMoneyPoints,
  hardMoneyInterestRatePct,
  onChangeHardMoneyRate,
  hardMoneyTermMonths,
  onChangeHardMoneyTerm,
  balloonTermMonths,
  onChangeBalloonTerm,
  partnerEquitySplitPct,
  onChangePartnerSplit,
  targetCapitalRaise,
  onChangeTargetCapitalRaise,
  minimumInvestmentTicket,
  onChangeMinimumTicket,
  preferredReturnPct,
  onChangePreferredReturn,
  structuringMetrics,
  totalCashRequired,
}: DealStructuringCardProps) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <div
      data-testid="deal-structuring-card"
      className="rounded-none border border-white/10 bg-white/[0.02] p-5 backdrop-blur-md space-y-5"
    >
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-white/70 flex items-center gap-2">
            <TreeStructure className="h-4 w-4 text-primary" />
            <span>What Kind of Deal Do You Want to Do?</span>
          </h2>
          <p className="text-[11px] text-white/50 mt-0.5">
            Determine your capital stack, financing structure, and partner participation.
          </p>
        </div>
        <span className="rounded-none bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] font-mono text-emerald-400">
          Structure Engine
        </span>
      </div>

      {/* 1. Financing Modality */}
      <div className="space-y-2">
        <span className="block text-[11px] font-bold uppercase tracking-wider text-white/60">
          Financing Modality (How is the property purchased?)
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2" role="group" aria-label="Financing Modality">
          {[
            { id: 'conventional', label: 'Conventional', icon: Bank, desc: 'Bank / agency debt' },
            { id: 'cash', label: 'All Cash', icon: Money, desc: '100% equity, no debt' },
            { id: 'hard_money', label: 'Hard Money', icon: Gauge, desc: 'Short-term bridge' },
            { id: 'owner_financing', label: 'Owner Financed', icon: Handshake, desc: 'Seller carries note' },
            { id: 'balloon', label: 'Balloon Note', icon: Timer, desc: 'Fixed payoff due' },
          ].map((item) => {
            const isSelected = financingModality === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                data-testid={`financing-modality-${item.id}`}
                onClick={() => onSelectModality(item.id as FinancingModality)}
                className={`flex flex-col items-center justify-center rounded-none border p-2.5 text-center transition min-h-[56px] ${
                  isSelected
                    ? 'border-primary bg-primary/10 text-white'
                    : 'border-white/10 bg-white/[0.02] text-white/50 hover:text-white hover:border-white/20'
                }`}
              >
                <Icon className={`h-4 w-4 mb-1 ${isSelected ? 'text-primary' : 'text-white/40'}`} />
                <span className="text-xs font-bold leading-tight">{item.label}</span>
                <span className="text-[9.5px] text-white/40 mt-0.5">{item.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Conditional Modality Inputs */}
      {financingModality === 'hard_money' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-none border border-white/10 bg-black/20 text-xs">
          <div>
            <label htmlFor="hard-money-points" className="block text-[10.5px] font-medium text-white/50 mb-1">
              Origination Points (%)
            </label>
            <input
              id="hard-money-points"
              type="number"
              step="0.5"
              value={hardMoneyPoints}
              onChange={(e) => onChangeHardMoneyPoints(Number(e.target.value))}
              className="w-full rounded-none border border-white/10 bg-white/[0.04] p-2 text-base md:text-sm text-white font-semibold focus:outline-none focus:border-primary min-h-[44px]"
            />
          </div>
          <div>
            <label htmlFor="hard-money-rate" className="block text-[10.5px] font-medium text-white/50 mb-1">
              Annual Interest Rate (%)
            </label>
            <input
              id="hard-money-rate"
              type="number"
              step="0.25"
              value={hardMoneyInterestRatePct}
              onChange={(e) => onChangeHardMoneyRate(Number(e.target.value))}
              className="w-full rounded-none border border-white/10 bg-white/[0.04] p-2 text-base md:text-sm text-white font-semibold focus:outline-none focus:border-primary min-h-[44px]"
            />
          </div>
          <div>
            <label htmlFor="hard-money-term" className="block text-[10.5px] font-medium text-white/50 mb-1">
              Loan Term (Months)
            </label>
            <input
              id="hard-money-term"
              type="number"
              value={hardMoneyTermMonths}
              onChange={(e) => onChangeHardMoneyTerm(Number(e.target.value))}
              className="w-full rounded-none border border-white/10 bg-white/[0.04] p-2 text-base md:text-sm text-white font-semibold focus:outline-none focus:border-primary min-h-[44px]"
            />
          </div>
        </div>
      )}

      {financingModality === 'balloon' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-none border border-white/10 bg-black/20 text-xs">
          <div>
            <label htmlFor="balloon-term-months" className="block text-[10.5px] font-medium text-white/50 mb-1">
              Balloon Payoff Term (Months)
            </label>
            <input
              id="balloon-term-months"
              type="number"
              value={balloonTermMonths}
              onChange={(e) => onChangeBalloonTerm(Number(e.target.value))}
              className="w-full rounded-none border border-white/10 bg-white/[0.04] p-2 text-base md:text-sm text-white font-semibold focus:outline-none focus:border-primary min-h-[44px]"
            />
          </div>
          <div className="flex items-center text-[11px] text-white/50">
            Principal must be fully refinanced or paid off in month {balloonTermMonths} ({Math.round(balloonTermMonths / 12)} years).
          </div>
        </div>
      )}

      {/* 2. Capital Seeking Intent */}
      <div className="space-y-2">
        <span className="block text-[11px] font-bold uppercase tracking-wider text-white/60">
          Capital Intent (Are you looking for partners or investors?)
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2" role="group" aria-label="Capital Intent">
          {[
            {
              id: 'solo',
              title: 'Solo / Self-Funded',
              desc: '100% operator equity, keep 100% of cash flow',
              icon: User,
            },
            {
              id: 'partner_down_payment',
              title: 'Partner for Down Payment',
              desc: 'Partner provides cash required for an equity share',
              icon: UserPlus,
            },
            {
              id: 'partner_whole_deal',
              title: 'Partner for Whole Deal (JV)',
              desc: 'Joint venture split across all acquisition and operations',
              icon: Handshake,
            },
            {
              id: 'crowdfund',
              title: 'Crowdfund / Syndication',
              desc: 'Pool multiple investors with preferred returns',
              icon: Users,
            },
          ].map((item) => {
            const isSelected = capitalSeekingIntent === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                data-testid={`capital-intent-${item.id}`}
                onClick={() => onSelectIntent(item.id as CapitalSeekingIntent)}
                className={`flex flex-col text-left rounded-none border p-3 transition min-h-[72px] ${
                  isSelected
                    ? 'border-primary bg-primary/10 text-white'
                    : 'border-white/10 bg-white/[0.02] text-white/50 hover:text-white hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className={`h-4 w-4 shrink-0 ${isSelected ? 'text-primary' : 'text-white/40'}`} />
                  <span className="text-xs font-bold text-white">{item.title}</span>
                </div>
                <span className="text-[10px] text-white/50 leading-relaxed">{item.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Partner Equity Split Slider */}
      {(capitalSeekingIntent === 'partner_down_payment' || capitalSeekingIntent === 'partner_whole_deal') && (
        <div className="rounded-none border border-white/10 bg-black/20 p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white">Equity &amp; Cash Flow Split</span>
            <span className="font-mono font-semibold text-primary">
              {100 - partnerEquitySplitPct}% Operator / {partnerEquitySplitPct}% Partner
            </span>
          </div>
          <input
            type="range"
            aria-label="Equity and cash flow split percentage"
            min="0"
            max="100"
            step="5"
            value={partnerEquitySplitPct}
            onChange={(e) => onChangePartnerSplit(Number(e.target.value))}
            className="w-full accent-primary cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-white/40 font-mono">
            <span>0% Partner (100% Operator)</span>
            <span>50/50 Joint Venture</span>
            <span>100% Partner (0% Operator)</span>
          </div>
        </div>
      )}

      {/* Crowdfunding / Syndication Parameters */}
      {capitalSeekingIntent === 'crowdfund' && (
        <div className="rounded-none border border-white/10 bg-black/20 p-4 space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="crowdfund-target-raise" className="block text-[10.5px] font-medium text-white/50 mb-1">
                Target Capital Raise ($)
              </label>
              <input
                id="crowdfund-target-raise"
                type="number"
                value={targetCapitalRaise || totalCashRequired}
                onChange={(e) => onChangeTargetCapitalRaise(Number(e.target.value))}
                className="w-full rounded-none border border-white/10 bg-white/[0.04] p-2 text-base md:text-sm text-white font-semibold focus:outline-none focus:border-primary min-h-[44px]"
              />
            </div>
            <div>
              <label htmlFor="crowdfund-min-ticket" className="block text-[10.5px] font-medium text-white/50 mb-1">
                Min Investment Ticket ($)
              </label>
              <input
                id="crowdfund-min-ticket"
                type="number"
                value={minimumInvestmentTicket}
                onChange={(e) => onChangeMinimumTicket(Number(e.target.value))}
                className="w-full rounded-none border border-white/10 bg-white/[0.04] p-2 text-base md:text-sm text-white font-semibold focus:outline-none focus:border-primary min-h-[44px]"
              />
            </div>
            <div>
              <label htmlFor="crowdfund-preferred-return" className="block text-[10.5px] font-medium text-white/50 mb-1">
                Preferred Return (Pref %)
              </label>
              <input
                id="crowdfund-preferred-return"
                type="number"
                step="0.5"
                value={preferredReturnPct}
                onChange={(e) => onChangePreferredReturn(Number(e.target.value))}
                className="w-full rounded-none border border-white/10 bg-white/[0.04] p-2 text-base md:text-sm text-white font-semibold focus:outline-none focus:border-primary min-h-[44px]"
              />
            </div>
          </div>
          <p className="text-[10.5px] text-white/45 italic">
            Once calculated, you can post this offering directly to the Deal Marketplace to raise capital from accredited investors.
          </p>
        </div>
      )}

      {/* Real-time Deal Structuring Reconciled Output */}
      {structuringMetrics && (
        <div
          data-testid="structuring-live-metrics"
          className="rounded-none border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-emerald-300 flex items-center gap-1.5">
              <ChartPie className="h-4 w-4" />
              <span>Reconciled Capital Allocation &amp; Returns</span>
            </span>
            <span className="text-[10px] font-mono text-white/40">
              Total Cash: {formatCurrency(totalCashRequired)}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono">
            <div className="rounded-none bg-black/30 p-2 border border-white/5">
              <span className="block text-[9.5px] text-white/40 uppercase">Operator Cash</span>
              <span className="block font-bold text-white">
                {formatCurrency(structuringMetrics.operatorCashInvested)}
              </span>
            </div>
            <div className="rounded-none bg-black/30 p-2 border border-white/5">
              <span className="block text-[9.5px] text-white/40 uppercase">Partner Cash</span>
              <span className="block font-bold text-white">
                {formatCurrency(structuringMetrics.partnerCashInvested)}
              </span>
            </div>
            <div className="rounded-none bg-black/30 p-2 border border-white/5">
              <span className="block text-[9.5px] text-white/40 uppercase">Operator Cash Flow</span>
              <span className="block font-bold text-emerald-400">
                {formatCurrency(structuringMetrics.operatorAnnualCashFlow)}/yr
              </span>
            </div>
            <div className="rounded-none bg-black/30 p-2 border border-white/5">
              <span className="block text-[9.5px] text-white/40 uppercase">Operator CoC %</span>
              <span className="block font-bold text-emerald-400">
                {structuringMetrics.operatorCoCReturnPct !== null
                  ? `${structuringMetrics.operatorCoCReturnPct.toFixed(1)}%`
                  : 'Infinite Return (100%+ recovered)'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
