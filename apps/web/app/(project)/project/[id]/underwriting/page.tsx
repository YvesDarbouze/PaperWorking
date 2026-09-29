'use client';

import React, { useState } from 'react';
import { useProjectWorkspace } from '@/components/projects/ProjectWorkspaceProvider';
import UnderwritingInputsForm from '@/components/projects/UnderwritingInputsForm';
import Button from '@/components/ui/Button';
import {
  type UnderwritingInputs,
  getDefaultUnderwritingInputs,
} from '@paperworking/validation';
import { bffFetch } from '@/lib/api/bff-fetch';

export default function ProjectUnderwritingPage() {
  const { project, updateProject } = useProjectWorkspace();
  const [isInitializing, setIsInitializing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [localUnderwriting, setLocalUnderwriting] = useState<UnderwritingInputs | null>(
    project?.underwriting ?? null,
  );

  if (!project) return null;

  const currentUnderwriting = localUnderwriting ?? project.underwriting;

  const handleInitializeDefaults = () => {
    setIsInitializing(true);
    const defaults = getDefaultUnderwritingInputs(
      project.purchasePrice || project.purchase_price || 485000,
    );
    setLocalUnderwriting(defaults);
    setIsInitializing(false);
  };

  const handleSave = async (updatedValues: UnderwritingInputs) => {
    setIsSaving(true);
    try {
      const response = await bffFetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          underwriting: updatedValues,
          purchasePrice: updatedValues.acquisition.purchasePrice,
          purchase_price: updatedValues.acquisition.purchasePrice,
          rehab_costs: updatedValues.acquisition.rehabBudget,
        }),
      });

      if (response.ok) {
        setLocalUnderwriting(updatedValues);
        updateProject({
          ...project,
          underwriting: updatedValues,
          purchasePrice: updatedValues.acquisition.purchasePrice,
          purchase_price: updatedValues.acquisition.purchasePrice,
          rehab_costs: updatedValues.acquisition.rehabBudget,
        });
      }
    } catch (err) {
      console.error('[Underwriting save failed]:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-white/5 pb-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">
              Financial Underwriting
            </span>
            <span className="rounded-md border border-border bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
              33 KPIs Engine
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
            Underwriting Inputs &amp; Pro-Forma
          </h1>
          <p className="mt-1 text-xs text-white/60">
            Authoritative financial inputs feeding Deal Intake, Return Modeling, Debt Sizing, and Exit Analysis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {project.dealId || (project as any).dealSlug ? (
            <a
              href={`/marketplace/${(project as any).dealSlug || project.dealId}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition min-h-[44px]"
            >
              <span className="material-symbols-outlined text-[16px]">storefront</span>
              <span>View Deal Card</span>
            </a>
          ) : null}

          <a
            href={`/deal-calculator?projectId=${project.id}&address=${encodeURIComponent(project.address || project.propertyName || '')}&price=${project.purchasePrice || project.purchase_price || 485000}&strategy=${(project as any).strategy || 'buy_and_hold_rental'}`}
            data-testid="project-open-deal-calc-btn"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/20 transition min-h-[44px]"
          >
            <span className="material-symbols-outlined text-[16px]">calculate</span>
            <span>Open in Deal Calculator</span>
          </a>

          <a
            href={`/project/${project.id}/insights`}
            data-testid="project-underwriting-to-33-kpis-btn"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/20 transition min-h-[44px]"
          >
            <span className="material-symbols-outlined text-[16px]">analytics</span>
            <span>33 Datapoints Analysis</span>
          </a>
        </div>
      </div>

      {/* Off-Platform Closing Policy Notice */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs text-white/60 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="material-symbols-outlined text-[18px] text-white/40">gavel</span>
          <span>
            <strong className="text-white">PaperWorking Deal Flow:</strong> Underwriting models directly populate listed Deal cards and promotional broadcasts. Negotiation occurs in Messages; legal agreements and capital closing occur off-platform.
          </span>
        </div>
      </div>

      {/* "Not yet collected" State for unmodeled projects */}
      {!currentUnderwriting ? (
        <div
          data-testid="not-yet-collected-banner"
          className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-8 text-center space-y-4"
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-400">
            <span className="material-symbols-outlined text-[24px]">assignment_late</span>
          </div>
          <div>
            <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
              Not yet collected
            </span>
            <h2 className="mt-2 text-lg font-bold text-white">
              Underwriting Inputs Missing
            </h2>
            <p className="mx-auto mt-1.5 max-w-lg text-xs leading-relaxed text-white/60">
              Financial underwriting inputs have not yet been collected for{' '}
              <strong className="text-white">{project.propertyName}</strong>. The 33 underwriting KPIs
              (IRR, DSCR, Debt Yield, Break-Even Occupancy, Sensitivity) require these inputs to compute.
            </p>
          </div>
          <div className="pt-2">
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleInitializeDefaults}
              loading={isInitializing}
              icon={<span className="material-symbols-outlined text-[18px]">add_circle</span>}
            >
              Initialize with Institutional Defaults
            </Button>
          </div>
        </div>
      ) : (
        <div data-testid="underwriting-edit-surface">
          <UnderwritingInputsForm
            mode="edit"
            initialValues={currentUnderwriting}
            basePurchasePrice={project.purchasePrice || project.purchase_price}
            onSave={handleSave}
            isSaving={isSaving}
          />
        </div>
      )}
    </div>
  );
}
