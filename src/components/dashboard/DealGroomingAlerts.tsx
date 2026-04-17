'use client';

import React, { useMemo } from 'react';
import { PropertyDeal } from '@/types/schema';
import { DealFolderIcon } from './DealFolder';
import {
  AlertCircle, AlertTriangle, Info,
  DollarSign, Clock, FileWarning, Users, Receipt, ArrowRight,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   DealGroomingAlerts — Logic-Based Deal Health Monitor

   Scans all active deals against a ruleset and emits alerts
   for deals that need attention ("grooming"). Each alert maps
   to a specific corrective action and links to the deal.

   Rules:
     🔴 Critical   — Missing financials, incomplete closing docs
     🟠 Action     — Pending receipts, budget overruns
     🟡 Warning    — Stale phases, no team assigned, unverified docs
   ═══════════════════════════════════════════════════════════════ */

type AlertSeverity = 'critical' | 'action' | 'warning';

interface GroomingAlert {
  id: string;
  dealId: string;
  dealAddress: string;
  dealStatus: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  icon: React.ReactNode;
}

function shortAddress(address: string): string {
  const comma = address.indexOf(',');
  return comma > 0 ? address.slice(0, comma) : address;
}

/**
 * Core grooming rules — each rule scans a deal and may push alerts.
 */
function evaluateDeal(deal: PropertyDeal, alerts: GroomingAlert[]): void {
  const addr = shortAddress(deal.address || deal.propertyName);
  const base = { dealId: deal.id, dealAddress: addr, dealStatus: deal.status };

  // ── Rule 1: Missing Financials ──────────────────────────
  // Purchase price is 0 and the deal has moved past Lead
  if (
    (!deal.financials?.purchasePrice || deal.financials.purchasePrice === 0) &&
    deal.status !== 'Lead'
  ) {
    alerts.push({
      ...base,
      id: `groom-fin-${deal.id}`,
      title: 'Missing Purchase Price',
      description: `${addr} has no purchase price set. Financial projections cannot calculate.`,
      severity: 'critical',
      icon: <DollarSign className="w-4 h-4" />,
    });
  }

  // ── Rule 2: Stale Phase ─────────────────────────────────
  // Deal hasn't been updated in 14+ days
  const now = new Date();
  const updatedAt = deal.updatedAt ? new Date(deal.updatedAt) : new Date(deal.createdAt || now);
  const daysSinceUpdate = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
  if (daysSinceUpdate >= 14 && deal.status !== 'Sold') {
    alerts.push({
      ...base,
      id: `groom-stale-${deal.id}`,
      title: 'Stale — No Activity',
      description: `${addr} hasn't been updated in ${daysSinceUpdate} days. Is this deal still active?`,
      severity: 'warning',
      icon: <Clock className="w-4 h-4" />,
    });
  }

  // ── Rule 3: Incomplete Closing Docs ─────────────────────
  // Status is Under Contract but closing checklist has uncompleted items
  if (deal.status === 'Under Contract') {
    const uncompleted = deal.closingChecklist?.filter(i => !i.completed)?.length || 0;
    if (uncompleted > 0) {
      alerts.push({
        ...base,
        id: `groom-closing-${deal.id}`,
        title: 'Closing Docs Incomplete',
        description: `${uncompleted} closing checklist item${uncompleted > 1 ? 's' : ''} still incomplete.`,
        severity: 'critical',
        icon: <FileWarning className="w-4 h-4" />,
      });
    }
  }

  // ── Rule 4: Unverified Documents ────────────────────────
  const unverifiedDocs = deal.roleLinkedDocuments?.filter(d => !d.verified)?.length || 0;
  if (unverifiedDocs > 0) {
    alerts.push({
      ...base,
      id: `groom-docs-${deal.id}`,
      title: 'Unverified Documents',
      description: `${unverifiedDocs} document${unverifiedDocs > 1 ? 's' : ''} awaiting verification.`,
      severity: 'warning',
      icon: <FileWarning className="w-4 h-4" />,
    });
  }

  // ── Rule 5: Budget Overrun ──────────────────────────────
  // Approved costs exceed 90% of the rehab base budget
  if (deal.rehab?.baseBudget && deal.rehab.baseBudget > 0) {
    const approvedSum = deal.financials?.costs
      ?.filter(c => c.approved)
      .reduce((sum, c) => sum + c.amount, 0) || 0;
    const utilization = approvedSum / deal.rehab.baseBudget;
    if (utilization >= 0.9) {
      alerts.push({
        ...base,
        id: `groom-budget-${deal.id}`,
        title: 'Budget Overrun Risk',
        description: `Rehab spending at ${Math.round(utilization * 100)}% of the $${deal.rehab.baseBudget.toLocaleString()} base budget.`,
        severity: 'critical',
        icon: <DollarSign className="w-4 h-4" />,
      });
    }
  }

  // ── Rule 6: No Team Assigned ────────────────────────────
  if ((!deal.dealTeam || deal.dealTeam.length === 0) && deal.status !== 'Lead') {
    alerts.push({
      ...base,
      id: `groom-team-${deal.id}`,
      title: 'No Team Assigned',
      description: `${addr} has no team members. Assign roles for accountability.`,
      severity: 'warning',
      icon: <Users className="w-4 h-4" />,
    });
  }

  // ── Rule 7: Pending Receipts ────────────────────────────
  const pendingReceipts = deal.rehab?.pendingReceipts?.filter(r => r.status === 'pending')?.length || 0;
  if (pendingReceipts > 0) {
    alerts.push({
      ...base,
      id: `groom-receipts-${deal.id}`,
      title: 'Pending Receipt Triage',
      description: `${pendingReceipts} receipt${pendingReceipts > 1 ? 's' : ''} queued for review.`,
      severity: 'action',
      icon: <Receipt className="w-4 h-4" />,
    });
  }
}

/* ─── Severity styling ─── */
const SEVERITY_CONFIG: Record<AlertSeverity, { border: string; bg: string; text: string; dot: string; label: string }> = {
  critical: { border: 'border-red-200', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', label: 'Critical' },
  action:   { border: 'border-amber-200', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', label: 'Action' },
  warning:  { border: 'border-yellow-200', bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500', label: 'Warning' },
};

interface DealGroomingAlertsProps {
  deals: PropertyDeal[];
  onNavigateToDeal: (dealId: string) => void;
}

export default function DealGroomingAlerts({ deals, onNavigateToDeal }: DealGroomingAlertsProps) {
  const alerts = useMemo(() => {
    const collected: GroomingAlert[] = [];
    deals.forEach(d => evaluateDeal(d, collected));
    // Sort by severity: critical → action → warning
    const order: Record<AlertSeverity, number> = { critical: 0, action: 1, warning: 2 };
    collected.sort((a, b) => order[a.severity] - order[b.severity]);
    return collected;
  }, [deals]);

  const criticalCt = alerts.filter(a => a.severity === 'critical').length;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-gray-400" />
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Deal Grooming
            </p>
          </div>
          {criticalCt > 0 && (
            <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              {criticalCt} critical
            </span>
          )}
        </div>
        <p className="text-sm text-gray-400 mt-0.5">
          {alerts.length === 0 ? 'All deals healthy — no action needed.' : `${alerts.length} item${alerts.length > 1 ? 's' : ''} need attention.`}
        </p>
      </div>

      {/* Alerts list */}
      <div className="flex-1 overflow-y-auto max-h-[320px] px-4 pb-4 space-y-2">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-300">
            <Info className="w-8 h-8 mb-2 stroke-1" />
            <p className="text-xs text-gray-400">Portfolio is healthy</p>
          </div>
        ) : (
          alerts.map(alert => {
            const sev = SEVERITY_CONFIG[alert.severity];
            return (
              <button
                key={alert.id}
                onClick={() => onNavigateToDeal(alert.dealId)}
                className={`w-full flex items-start gap-3 p-3 rounded-xl border ${sev.border} ${sev.bg} text-left hover:shadow-sm transition-all group`}
              >
                {/* Severity icon */}
                <div className={`mt-0.5 p-1.5 rounded-lg bg-white/80 ${sev.text} flex-shrink-0`}>
                  {alert.icon}
                </div>

                {/* Alert content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <DealFolderIcon status={alert.dealStatus} size={14} />
                    <span className="text-xs text-gray-500 truncate">
                      {alert.dealAddress}
                    </span>
                    <span className={`text-xs font-bold uppercase tracking-widest ${sev.text} flex-shrink-0`}>
                      {sev.label}
                    </span>
                  </div>
                  <p className={`text-sm font-medium ${sev.text}`}>
                    {alert.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    {alert.description}
                  </p>
                </div>

                {/* CTA */}
                <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 mt-1 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
