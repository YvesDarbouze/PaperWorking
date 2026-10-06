'use client';

import React from 'react';
import type { ExitStrategyRoute } from '@/lib/projects/types';
import { formatCurrency, formatPercent } from '@/lib/projects/phase-utils';
import {
  CurrencyDollar,
  ArrowsClockwise,
  Buildings,
  Key,
  ArrowsLeftRight,
  Info,
  CheckCircle,
} from '@/components/icons/PhosphorIcons';

interface ExitStrategySelectorCardProps {
  selectedRoute: ExitStrategyRoute;
  onSelectRoute: (route: ExitStrategyRoute) => void;
  recalculatedOutputs: {
    grossRealization: number;
    totalClosingFees: number;
    debtPayoff: number;
    netCashToInvestor: number;
    terminalIrr: number;
    equityMultiple: number;
    roe: number;
    ongoingMonthlyCashFlow: number;
    ongoingDscr: number;
    ongoingCashOnCashYield?: number;
  };
}

export default function ExitStrategySelectorCard({
  selectedRoute,
  onSelectRoute,
  recalculatedOutputs,
}: ExitStrategySelectorCardProps) {
  const routes: Array<{
    id: ExitStrategyRoute;
    title: string;
    label: string;
    icon: React.ReactNode;
    summary: string;
    kpiShiftNote: string;
    isTerminal: boolean;
  }> = [
    {
      id: 'outright_sale',
      title: 'Route A',
      label: 'Outright Sale',
      icon: <CurrencyDollar size={20} className="text-foreground" />,
      summary: 'Third-party buyer disposition, full debt payoff, and terminal equity distribution.',
      kpiShiftNote: 'Terminal Disposition: Computes final life-of-asset IRR, MOIC, and Net Realized Proceeds.',
      isTerminal: true,
    },
    {
      id: 'refinance_retain',
      title: 'Route B',
      label: 'Refinance & Retain (BRRRR)',
      icon: <ArrowsClockwise size={20} className="text-foreground" />,
      summary: 'Long-term debt takeout, cash-out equity extraction, and return to active operations.',
      kpiShiftNote: 'Active Ongoing Status: Terminal lock released. Updates return metrics to ongoing DSCR, Cash-on-Cash Yield, and ROE.',
      isTerminal: false,
    },
    {
      id: 'condo_selloff',
      title: 'Route C',
      label: 'Developed Condo Sales',
      icon: <Buildings size={20} className="text-foreground" />,
      summary: 'Fee-simple individual parcel sales, master deed declaration, HOA setup, and phased debt paydown.',
      kpiShiftNote: 'Unitized Parcel Mode: Master deed and plats establish individual tax parcels sold to pay off construction debt.',
      isTerminal: true,
    },
    {
      id: 'coop_selloff',
      title: 'Route D',
      label: 'Developed Co-op Sales',
      icon: <Buildings size={20} className="text-foreground" />,
      summary: 'Housing corporation formation, proprietary lease dispositions, offering plan clearance, and board reviews.',
      kpiShiftNote: 'Corporate Share Disposition: Sales of shares tied to proprietary leases vetted by co-op board.',
      isTerminal: true,
    },
    {
      id: 'lease_option',
      title: 'Route E',
      label: 'Lease-Option Conversion',
      icon: <Key size={20} className="text-foreground" />,
      summary: 'Tenant option consideration, monthly rent credit accumulation, and strike price realization.',
      kpiShiftNote: 'Hybrid Option Model: Tracks ongoing rental income plus option credits towards ultimate sales conversion.',
      isTerminal: true,
    },
    {
      id: '1031_exchange',
      title: 'Route F',
      label: '1031 Tax-Deferred Exchange',
      icon: <ArrowsLeftRight size={20} className="text-foreground" />,
      summary: 'Section 1031 like-kind rollover, Qualified Intermediary escrow, and 45/180-day timers.',
      kpiShiftNote: 'Tax-Deferred Rollover: Retains 100% equity for replacement property acquisition without immediate capital gains drag.',
      isTerminal: true,
    },
  ];

  const currentRouteMeta = routes.find((r) => r.id === selectedRoute) || routes[0];

  return (
    <article
      data-testid="exit-strategy-selector-card"
      className="rounded-none border border-border bg-card p-5 md:p-6 space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-none bg-muted px-2 py-0.5 text-[10px] font-mono uppercase font-bold text-foreground">
              Task 01 · Strategy Selection
            </span>
            <span className="text-xs text-muted-foreground">State Override Engine</span>
          </div>
          <h2 className="text-lg font-bold text-foreground mt-1">
            Dynamic Exit Strategy Route Selection
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Switch exit route at any point without losing historical data collected during Acquisition, Fund, or Hold.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="rounded-none border border-border bg-muted/30 px-3 py-1 text-xs font-mono text-muted-foreground">
            {currentRouteMeta.isTerminal ? 'Terminal Disposition' : 'Active Ongoing Operations'}
          </span>
        </div>
      </div>

      {/* 6-Route Selector Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {routes.map((route) => {
          const isSelected = selectedRoute === route.id;
          return (
            <button
              key={route.id}
              type="button"
              data-testid={`exit-route-${route.id}`}
              onClick={() => onSelectRoute(route.id)}
              className={`flex flex-col justify-between rounded-none border p-3.5 text-left transition min-h-[140px] ${
                isSelected
                  ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary'
                  : 'border-border bg-card text-muted-foreground hover:border-border/80 hover:bg-muted/20 hover:text-foreground'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-8 w-8 items-center justify-center rounded-none border border-border bg-muted/40">
                    {route.icon}
                  </div>
                  {isSelected && (
                    <CheckCircle size={18} className="text-primary" weight="fill" />
                  )}
                </div>
                <div className="mt-2.5">
                  <span className="text-[10px] font-mono uppercase font-bold tracking-wider opacity-70">
                    {route.title}
                  </span>
                  <h3 className="text-xs font-bold text-foreground leading-snug mt-0.5">
                    {route.label}
                  </h3>
                </div>
              </div>

              <p className="text-[11px] leading-relaxed text-muted-foreground line-clamp-2 mt-2">
                {route.summary}
              </p>
            </button>
          );
        })}
      </div>

      {/* Dynamic Recalculation & State Override Notification */}
      <div
        data-testid="route-kpi-recalculation-banner"
        className="rounded-none border border-border bg-muted/20 p-4 space-y-2 text-xs"
      >
        <div className="flex items-start gap-2.5">
          <Info size={18} className="text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-foreground">
              Dynamic Recalculation Engine: {currentRouteMeta.label}
            </p>
            <p className="text-muted-foreground leading-relaxed">
              {currentRouteMeta.kpiShiftNote} Historical data across acquisition purchase price, initial capital stack, actual renovation draws, and holding costs remain locked and fully intact.
            </p>
          </div>
        </div>

        {/* Live Key Metrics Row for Selected Route */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/60 font-mono text-xs">
          <div className="rounded-none border border-border/40 bg-card p-2 text-center">
            <span className="block text-[9.5px] uppercase text-muted-foreground">Gross Realization</span>
            <span className="block font-bold text-foreground mt-0.5">
              {formatCurrency(recalculatedOutputs.grossRealization)}
            </span>
          </div>

          <div className="rounded-none border border-border/40 bg-card p-2 text-center">
            <span className="block text-[9.5px] uppercase text-muted-foreground">Closing Friction</span>
            <span className="block font-bold text-foreground mt-0.5">
              {formatCurrency(recalculatedOutputs.totalClosingFees)}
            </span>
          </div>

          <div className="rounded-none border border-border/40 bg-card p-2 text-center">
            <span className="block text-[9.5px] uppercase text-muted-foreground">
              {selectedRoute === 'refinance_retain' ? 'Cash-Out Equity' : 'Net Sales Proceeds'}
            </span>
            <span className="block font-bold text-primary mt-0.5">
              {formatCurrency(recalculatedOutputs.netCashToInvestor)}
            </span>
          </div>

          <div className="rounded-none border border-border/40 bg-card p-2 text-center">
            <span className="block text-[9.5px] uppercase text-muted-foreground">
              {selectedRoute === 'refinance_retain' ? 'Ongoing DSCR' : 'Terminal IRR'}
            </span>
            <span className="block font-bold text-foreground mt-0.5">
              {selectedRoute === 'refinance_retain'
                ? `${recalculatedOutputs.ongoingDscr.toFixed(2)}x`
                : formatPercent(recalculatedOutputs.terminalIrr / 100)}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
