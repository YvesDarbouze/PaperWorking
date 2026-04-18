'use client';

import React, { useMemo } from 'react';
import { Project } from '@/types/schema';
import { DealFolderIcon } from './DealFolder';
import {
  AlertCircle, AlertTriangle, Info,
  DollarSign, Clock, FileWarning, Users, Receipt, ArrowRight,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   DealGroomingAlerts — Logic-Based Deal Health Monitor

   Scans all active projects against a ruleset and emits alerts
   for projects that need attention ("grooming"). Each alert maps
   to a specific corrective action and links to the deal.

   Rules:
     🔴 Critical   — Missing financials, incomplete closing docs
     🟠 Action     — Pending receipts, budget overruns
     🟡 Warning    — Stale phases, no team assigned, unverified docs
   ═══════════════════════════════════════════════════════════════ */

type AlertSeverity = 'critical' | 'action' | 'warning';

interface GroomingAlert {
  id: string;
  projectId: string;
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
function evaluateDeal(deal: Project, alerts: GroomingAlert[]): void {
  const addr = shortAddress(deal.address || deal.propertyName);
  const base = { projectId: deal.id, dealAddress: addr, dealStatus: deal.status };

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
  critical: { border: 'border-pw-black', bg: 'bg-pw-black text-white', text: 'text-white', dot: 'bg-white', label: 'Priority' },
  action:   { border: 'border-pw-border/50', bg: 'bg-pw-bg text-pw-black', text: 'text-pw-black', dot: 'bg-pw-black', label: 'Required' },
  warning:  { border: 'border-pw-border/20', bg: 'bg-pw-bg/50 text-pw-muted', text: 'text-pw-muted', dot: 'bg-pw-muted', label: 'Monitor' },
};

interface DealGroomingAlertsProps {
  projects: Project[];
  onNavigateToDeal: (projectId: string) => void;
}

export default function DealGroomingAlerts({ projects, onNavigateToDeal }: DealGroomingAlertsProps) {
  const alerts = useMemo(() => {
    const collected: GroomingAlert[] = [];
    projects.forEach(d => evaluateDeal(d, collected));
    const order: Record<AlertSeverity, number> = { critical: 0, action: 1, warning: 2 };
    collected.sort((a, b) => order[a.severity] - order[b.severity]);
    return collected;
  }, [projects]);

  const criticalCt = alerts.filter(a => a.severity === 'critical').length;

  return (
    <div className="ag-card bg-pw-surface shadow-[0_30px_60px_rgba(0,0,0,0.02)] border border-pw-border/10 flex flex-col h-full min-h-[500px]">
      {/* Header */}
      <div className="px-8 py-10 flex items-center justify-between border-b border-pw-border/10">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-pw-black" />
              <p className="ag-label opacity-60">Deal Hygiene</p>
            </div>
            <h3 className="text-3xl font-light text-pw-black tracking-tighter">Grooming Portal</h3>
          </div>
          {criticalCt > 0 && (
            <div className="bg-pw-black px-4 py-2 rounded-full flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-[10px] font-bold text-white tracking-widest uppercase">
                {criticalCt} Critical
              </span>
            </div>
          )}
      </div>

      <div className="px-8 py-5 border-b border-pw-border/10 bg-pw-bg/20">
        <p className="text-[10px] font-bold text-pw-muted/60 uppercase tracking-[0.2em] leading-none">
          {alerts.length === 0 ? 'System State: Optimal' : `${alerts.length} Anomalies Resolved`}
        </p>
      </div>

      {/* Alerts list */}
      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-4">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-pw-muted opacity-40">
            <Info className="w-12 h-12 mb-4 stroke-[1px]" />
            <p className="text-sm font-medium">Protocol Nominal.</p>
          </div>
        ) : (
          alerts.map(alert => {
            const sev = SEVERITY_CONFIG[alert.severity];
            return (
              <button
                key={alert.id}
                onClick={() => onNavigateToDeal(alert.projectId)}
                className={`w-full flex items-start gap-6 p-6 rounded-3xl border transition-all duration-300 group hover:scale-[1.01] hover:shadow-lg shadow-pw-black/5 ${sev.border} ${alert.severity === 'critical' ? 'bg-pw-black text-white' : 'bg-pw-surface'}`}
              >
                {/* Severity icon */}
                <div className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ${alert.severity === 'critical' ? 'bg-white/10 text-white' : 'bg-pw-bg text-pw-black group-hover:bg-pw-black group-hover:text-white'}`}>
                  {alert.icon}
                </div>

                {/* Alert content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-[9px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full border ${alert.severity === 'critical' ? 'border-white/20 text-white' : 'border-pw-border/50 text-pw-muted'}`}>
                      {sev.label}
                    </span>
                    <span className={`text-[10px] font-medium uppercase tracking-widest truncate opacity-40`}>
                      {alert.dealAddress}
                    </span>
                  </div>
                  <p className={`text-lg font-medium tracking-tight leading-tight`}>
                    {alert.title}
                  </p>
                  <p className={`text-xs mt-2 font-normal leading-relaxed opacity-60 line-clamp-2`}>
                    {alert.description}
                  </p>
                </div>

                <div className="shrink-0 opacity-0 group-hover:opacity-40 transition-opacity self-center">
                   <ArrowRight className="w-5 h-5" />
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
