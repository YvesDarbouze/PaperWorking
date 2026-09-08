'use client';

import React, { useState } from 'react';
import { useProjectWorkspace } from '@/components/projects/ProjectWorkspaceProvider';
import UnderwritingInputsForm from '@/components/projects/UnderwritingInputsForm';
import Button from '@/components/ui/Button';
import {
  type UnderwritingInputs,
  getDefaultUnderwritingInputs,
} from '@paperworking/validation';
import { apiFetch } from '@/lib/api/client';

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
      const response = await apiFetch(`/api/projects/${project.id}`, {
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
            <span className="text-xs font-bold uppercase tracking-wider text-[#00DD94]">
              Financial Underwriting
            </span>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/70">
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
