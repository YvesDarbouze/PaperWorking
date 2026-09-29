'use client';

import React, { useState } from 'react';
import type {
  HoldAuditSummary,
  TenantReconciliation,
  TenantEstoppelCertificate,
  VdrAssetItem,
} from '@/lib/projects/types';
import { formatCurrency } from '@/lib/projects/phase-utils';
import {
  FileText,
  Users,
  CheckCircle,
  FileCheck,
  FolderSimplePlus,
  ArrowSquareOut,
  Vault,
} from '@/components/icons/PhosphorIcons';

interface ExitDataAuditPreCheckCardProps {
  holdAudit: HoldAuditSummary;
  tenantReconciliation: TenantReconciliation;
  estoppels: TenantEstoppelCertificate[];
  vdrAssets: VdrAssetItem[];
  onUpdateEstoppels: (updated: TenantEstoppelCertificate[]) => void;
  onUpdateVdrAssets: (updated: VdrAssetItem[]) => void;
}

export default function ExitDataAuditPreCheckCard({
  holdAudit,
  tenantReconciliation,
  estoppels,
  vdrAssets,
  onUpdateEstoppels,
  onUpdateVdrAssets,
}: ExitDataAuditPreCheckCardProps) {
  const [activeTab, setActiveTab] = useState<'audit' | 'estoppels' | 'vdr'>('audit');

  const handleToggleEstoppelConfirm = (id: string) => {
    const updated = estoppels.map((e) =>
      e.id === id ? { ...e, confirmedByTenant: !e.confirmedByTenant } : e
    );
    onUpdateEstoppels(updated);
  };

  const handleAddVdrDoc = (category: VdrAssetItem['category'], title: string) => {
    const newDoc: VdrAssetItem = {
      id: `vdr-${Date.now()}`,
      category,
      title,
      fileName: `${title.toLowerCase().replace(/\s+/g, '_')}.pdf`,
      fileSize: '1.8 MB',
      verifiedDate: new Date().toISOString().slice(0, 10),
      status: 'ready',
    };
    onUpdateVdrAssets([...vdrAssets, newDoc]);
  };

  return (
    <article
      data-testid="exit-data-audit-precheck-card"
      className="rounded-none border border-border bg-card p-5 md:p-6 space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-none bg-muted px-2 py-0.5 text-[10px] font-mono uppercase font-bold text-foreground">
              Task 02 · Data Audit & Stabilization Pre-Check
            </span>
            <span className="text-xs text-muted-foreground">Historical Revenue & Lease Reconciliation</span>
          </div>
          <h2 className="text-lg font-bold text-foreground mt-1">
            Asset Stabilization Audit & Data Room Assembly
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Audit actual hold revenues, reconcile security deposit liabilities, verify tenant estoppel certs, and populate the Virtual Data Room.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center border border-border bg-muted/40 p-0.5 rounded-none">
          <button
            type="button"
            data-testid="audit-tab-hold-summary"
            onClick={() => setActiveTab('audit')}
            className={`min-h-[38px] px-3 py-1.5 text-xs font-semibold rounded-none transition ${
              activeTab === 'audit'
                ? 'bg-card text-foreground border border-border shadow-none'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Hold Ledger Audit
          </button>
          <button
            type="button"
            data-testid="audit-tab-estoppels"
            onClick={() => setActiveTab('estoppels')}
            className={`min-h-[38px] px-3 py-1.5 text-xs font-semibold rounded-none transition ${
              activeTab === 'estoppels'
                ? 'bg-card text-foreground border border-border shadow-none'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Tenant Estoppels ({estoppels.length})
          </button>
          <button
            type="button"
            data-testid="audit-tab-vdr"
            onClick={() => setActiveTab('vdr')}
            className={`min-h-[38px] px-3 py-1.5 text-xs font-semibold rounded-none transition ${
              activeTab === 'vdr'
                ? 'bg-card text-foreground border border-border shadow-none'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            VDR Assets ({vdrAssets.length})
          </button>
        </div>
      </div>

      {/* Sub-view 1: Hold Ledger Audit & Tenant Reconciliation */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
            <div className="rounded-none border border-border bg-muted/20 p-3">
              <span className="block text-[10px] uppercase text-muted-foreground">Total Revenue Collected</span>
              <span className="block text-base font-bold text-foreground mt-1">
                {formatCurrency(holdAudit.totalRevenueCollected)}
              </span>
              <span className="block text-[10px] text-muted-foreground mt-0.5 font-sans">
                {holdAudit.monthsInHold} months of operations
              </span>
            </div>

            <div className="rounded-none border border-border bg-muted/20 p-3">
              <span className="block text-[10px] uppercase text-muted-foreground">Operating Expenses Paid</span>
              <span className="block text-base font-bold text-foreground mt-1">
                {formatCurrency(holdAudit.totalOperatingExpensesPaid)}
              </span>
              <span className="block text-[10px] text-muted-foreground mt-0.5 font-sans">
                Taxes, insurance, maintenance
              </span>
            </div>

            <div className="rounded-none border border-border bg-muted/20 p-3">
              <span className="block text-[10px] uppercase text-muted-foreground">Net Operating Income (NOI)</span>
              <span className="block text-base font-bold text-primary mt-1">
                {formatCurrency(holdAudit.netOperatingIncomeHold)}
              </span>
              <span className="block text-[10px] text-primary/80 mt-0.5 font-sans">
                {holdAudit.averageOccupancyPct}% avg occupancy
              </span>
            </div>

            <div className="rounded-none border border-border bg-muted/20 p-3">
              <span className="block text-[10px] uppercase text-muted-foreground">Security Deposit Liability</span>
              <span className="block text-base font-bold text-foreground mt-1">
                {formatCurrency(tenantReconciliation.totalSecurityDepositsHeld)}
              </span>
              <span className="block text-[10px] text-muted-foreground mt-0.5 font-sans">
                Escrow credit transferred to buyer
              </span>
            </div>
          </div>

          <div className="rounded-none border border-border bg-card p-4 space-y-2 text-xs">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Users size={16} className="text-primary" />
              <span>Tenant Escrow & Prepaid Rent Proration Summary</span>
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              At disposition closing, all refundable tenant security deposits ($
              {tenantReconciliation.totalSecurityDepositsHeld.toLocaleString()}) and unearned prepaid rents ($
              {tenantReconciliation.prepaidRentLiability.toLocaleString()}) are debited from the seller and credited to the buyer on the final ALTA settlement statement.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2 font-mono text-[11px] text-muted-foreground">
              <span>Active Leases: <strong className="text-foreground">{tenantReconciliation.activeLeaseContractsCount}</strong></span>
              <span>Total Tenants: <strong className="text-foreground">{tenantReconciliation.tenantCount}</strong></span>
              <span>Security Deposits Held: <strong className="text-foreground">${tenantReconciliation.totalSecurityDepositsHeld.toLocaleString()}</strong></span>
              <span>Prepaid Rent Liability: <strong className="text-foreground">${tenantReconciliation.prepaidRentLiability.toLocaleString()}</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* Sub-view 2: Tenant Estoppel Certificates */}
      {activeTab === 'estoppels' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Verify lease terms, rental rates, and security deposit amounts to prevent post-close tenant disputes.</span>
            <span className="font-mono font-semibold text-foreground">
              {estoppels.filter((e) => e.confirmedByTenant).length} / {estoppels.length} Confirmed
            </span>
          </div>

          <div className="space-y-2">
            {estoppels.map((estoppel) => (
              <div
                key={estoppel.id}
                data-testid={`estoppel-row-${estoppel.id}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-none border border-border bg-muted/10 p-3.5 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">{estoppel.unitNumber}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-foreground font-medium">{estoppel.tenantName}</span>
                    {estoppel.confirmedByTenant ? (
                      <span className="inline-flex items-center gap-1 rounded-none bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono text-emerald-400">
                        <CheckCircle size={12} weight="fill" />
                        Signed & Confirmed
                      </span>
                    ) : (
                      <span className="rounded-none bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-mono text-amber-400">
                        Pending Tenant Signature
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-muted-foreground">
                    <span>Rent: <strong className="text-foreground">${estoppel.monthlyRent}/mo</strong></span>
                    <span>Deposit: <strong className="text-foreground">${estoppel.securityDepositAmount}</strong></span>
                    <span>Lease Term: {estoppel.leaseStartDate} to {estoppel.leaseEndDate}</span>
                    <span>Delinquent: <strong className={estoppel.delinquentBalance > 0 ? 'text-red-400' : 'text-foreground'}>${estoppel.delinquentBalance}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    data-testid={`toggle-estoppel-${estoppel.id}`}
                    onClick={() => handleToggleEstoppelConfirm(estoppel.id)}
                    className="min-h-[44px] px-3.5 py-1.5 text-xs font-semibold rounded-none border border-border bg-muted/40 hover:bg-muted text-foreground transition"
                  >
                    {estoppel.confirmedByTenant ? 'Mark Unconfirmed' : 'Confirm Estoppel'}
                  </button>
                  {estoppel.documentUrl && (
                    <a
                      href={estoppel.documentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="min-h-[44px] inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-none border border-border bg-card text-muted-foreground hover:text-foreground"
                    >
                      <FileCheck size={14} />
                      <span>PDF</span>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-view 3: Virtual Data Room (VDR) Assets */}
      {activeTab === 'vdr' && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">
              Institutional diligence vault ready for buyers, appraisers, and title officers.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="add-vdr-doc-btn"
                onClick={() => handleAddVdrDoc('tax_return', '2025 Executed Federal Tax Return Form 1065')}
                className="min-h-[44px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none border border-border bg-muted/40 hover:bg-muted text-xs font-semibold text-foreground transition"
              >
                <FolderSimplePlus size={16} />
                <span>Add VDR Document</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {vdrAssets.map((asset) => (
              <div
                key={asset.id}
                data-testid={`vdr-asset-${asset.id}`}
                className="flex items-center justify-between rounded-none border border-border bg-muted/10 p-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-none border border-border bg-muted/40 text-foreground">
                    <FileText size={18} />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{asset.title}</p>
                    <p className="text-[11px] font-mono text-muted-foreground">
                      {asset.fileName} · {asset.fileSize} · Verified {asset.verifiedDate}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-none bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono text-emerald-400">
                    Ready in Vault
                  </span>
                  <button
                    type="button"
                    className="min-h-[44px] px-2.5 text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                    title="Inspect Document"
                  >
                    <ArrowSquareOut size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
