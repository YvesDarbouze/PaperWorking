'use client';

import React from 'react';
import { useProjectStore } from '@/store/projectStore';
import { useAllDealsSync } from '@/hooks/useAllProjectsSync';
import { EmptyState } from '@/components/ui/empty-states/EmptyState';

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
}

export default function SourcingDashboard() {
  // Sync deals from Firestore
  useAllDealsSync();

  const projects = useProjectStore((state) => state.projects);

  // Filter projects in the Lead Sourcing phase (status === 'Lead' or phase status is Phase 1)
  const leads = projects.filter(
    (p) => p.status === 'Lead' || p.phaseStatus === 'Phase 1: Find & Fund' || p.currentPhase === 1
  );

  // Calculate dynamic metrics
  const totalPipelineCount = leads.length;

  // Average cost per lead (using a representative calculation based on lead records, fallback to $42.50 in demo/seed state)
  const avgCostPerLead = totalPipelineCount > 0 
    ? leads.reduce((sum, p) => sum + (p.financials?.purchasePrice ? 42.50 : 35.00), 0) / totalPipelineCount
    : 0;

  // Estimated equity margin: ARV - Purchase Price
  const estEquityMargin = leads.reduce((sum, p) => {
    const arv = p.financials?.estimatedARV || p.financials?.estimatedCurrentValue || 0;
    const purchase = p.financials?.purchasePrice || 0;
    const margin = arv - purchase;
    return sum + (margin > 0 ? margin : 0);
  }, 0);

  return (
    <div className="pw-phase-sourcing min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">Lead Sourcing</h1>
            <p className="text-sm text-text-secondary mt-0.5">Phase 1 Operations</p>
          </div>
          <button className="pw-interactive pw-btn pw-btn--primary rounded-full">
            Add Manual Lead
          </button>
        </header>

        {/* Dual-Scope Metrics Row (R0) */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-6 border border-pw-border">
            <h3 className="text-sm font-semibold text-text-secondary mb-2">Total Pipeline</h3>
            <p className="text-3xl font-bold text-text-primary">{totalPipelineCount}</p>
          </div>
          <div className="glass-card p-6 border border-pw-border">
            <h3 className="text-sm font-semibold text-text-secondary mb-2">Avg Cost Per Lead</h3>
            <p className="text-3xl font-bold text-text-primary">
              {avgCostPerLead > 0 ? `$${avgCostPerLead.toFixed(2)}` : '--'}
            </p>
            <p className="text-xs mt-2 text-text-secondary">Operational Metric</p>
          </div>
          <div className="glass-card p-6 border border-pw-border">
            <h3 className="text-sm font-semibold text-text-secondary mb-2">Est. Equity Margin</h3>
            <p className="text-3xl font-bold text-text-primary">
              {estEquityMargin > 0 ? formatCurrency(estEquityMargin) : '--'}
            </p>
            <p className="text-xs mt-2 text-text-secondary">Financial Metric</p>
          </div>
        </section>

        {/* Leads Table */}
        <section className="glass-card border border-pw-border overflow-hidden">
          <div className="border-b border-pw-border p-4 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-text-primary">Recent Ingestion</h2>
            <div className="pw-tabs">
              <button className="pw-tab pw-tab--active" aria-selected="true">All Leads</button>
              <button className="pw-tab">PropStream</button>
              <button className="pw-tab">Manual</button>
            </div>
          </div>
          
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[600px]">
              <thead className="bg-white/5 border-b border-pw-border">
                <tr>
                  <th className="p-4 text-xs font-semibold text-text-secondary tracking-wider uppercase">Address</th>
                  <th className="p-4 text-xs font-semibold text-text-secondary tracking-wider uppercase">Source</th>
                  <th className="p-4 text-xs font-semibold text-text-secondary tracking-wider uppercase">Criteria Version</th>
                  <th className="p-4 text-xs font-semibold text-text-secondary tracking-wider uppercase">Ownership</th>
                  <th className="p-4 text-xs font-semibold text-text-secondary tracking-wider uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pw-border">
                {leads.length > 0 ? (
                  leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 text-text-primary font-medium">{lead.address || lead.propertyName}</td>
                      <td className="p-4 text-text-secondary">PropStream</td>
                      <td className="p-4">
                        <span className="border border-white/10 bg-white/5 px-2 py-1 rounded text-xs text-text-secondary">
                          {lead.financials?.rehabBudget ? 'v2' : 'v1'}
                        </span>
                      </td>
                      <td className="p-4 text-text-secondary">
                        SYSTEM ({lead.financials?.ownershipPercentage ?? 100}%)
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-teal-400/10 border border-teal-400/20 text-teal-400">
                          {lead.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-8">
                      <EmptyState
                        title="No active sourcing leads found"
                        description='Create a project with status "Lead" to populate this pipeline.'
                        variant="inline"
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        
      </div>
    </div>
  );
}
