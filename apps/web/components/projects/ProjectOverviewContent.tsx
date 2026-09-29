'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, usePathname } from 'next/navigation';
import {
  reilPhaseOrderLabels,
  formatCurrency,
} from '@/lib/projects/phase-utils';
import type { ProjectDealComponent } from '@/lib/projects/types';
import { useProjectWorkspace } from '@/components/projects/ProjectWorkspaceProvider';
import AcquisitionWorkspaceView from '@/components/projects/AcquisitionWorkspaceView';
import FundWorkspaceView from '@/components/projects/FundWorkspaceView';
import HoldWorkspaceView from '@/components/projects/HoldWorkspaceView';
import ExitWorkspaceView from '@/components/projects/ExitWorkspaceView';

export default function ProjectOverviewContent() {
  const { project, updateProject } = useProjectWorkspace();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const phaseParam = searchParams?.get('phase')?.toLowerCase();
  const isFundPath = pathname?.endsWith('/fund') || pathname?.includes('/fund/');
  const isHoldPath = pathname?.endsWith('/hold') || pathname?.includes('/hold/');
  const isExitPath = pathname?.endsWith('/exit') || pathname?.includes('/exit/');

  const [activeTab, setActiveTab] = useState<string>(() => {
    if (isFundPath || phaseParam === 'fund' || phaseParam === 'purchase') return 'purchase';
    if (isHoldPath || phaseParam === 'hold') return 'hold';
    if (isExitPath || phaseParam === 'exit') return 'exit';
    if (phaseParam === 'acquisition') return 'acquisition';
    return project?.currentPhase || project?.phase || 'acquisition';
  });

  useEffect(() => {
    if (isFundPath || phaseParam === 'fund' || phaseParam === 'purchase') {
      setActiveTab('purchase');
    } else if (isHoldPath || phaseParam === 'hold') {
      setActiveTab('hold');
    } else if (isExitPath || phaseParam === 'exit') {
      setActiveTab('exit');
    } else if (phaseParam === 'acquisition') {
      setActiveTab('acquisition');
    } else if (project) {
      setActiveTab(project.currentPhase || project.phase || 'acquisition');
    }
  }, [isFundPath, isHoldPath, isExitPath, phaseParam, project?.currentPhase, project?.phase]);

  if (!project) return null;

  const isAcqActive = activeTab === 'acquisition';
  const isFundActive = activeTab === 'purchase' || activeTab === 'fund';
  const isHoldActive = activeTab === 'hold';
  const isExitActive = activeTab === 'exit';

  const projectDeals = useMemo<ProjectDealComponent[]>(() => {
    if (project.deals && project.deals.length > 0) {
      return project.deals;
    }
    const list: ProjectDealComponent[] = [];
    const pId = project.id || 'project';
    const addr = project.address || project.propertyName || 'Property Address';
    const name = project.propertyName || addr.split(',')[0];
    const purchasePrice = Number(project.purchasePrice || 450000);
    const rehabCost = Number(project.rehab_costs || 50000);

    list.push({
      id: `deal-calc-${pId}`,
      slug: `${pId}-underwriting`,
      name: `${name} Acquisition Underwriting`,
      address: addr,
      dealType: 'underwriting',
      status: 'underwritten',
      purchasePrice,
      rehabBudget: rehabCost,
      cashRequired: Math.round(purchasePrice * 0.25),
      projectedIrr: project.estimatedIrr ? Number((project.estimatedIrr * 100).toFixed(1)) : 17.5,
      capRate: 6.5,
    });

    if (project.dealId || project.dealSlug) {
      list.push({
        id: project.dealId || `deal-mp-${pId}`,
        slug: project.dealSlug || project.dealId || 'offering',
        name: `${name} Syndication Offering`,
        address: project.dealAddress || addr,
        dealType: 'syndication',
        status: 'active',
        purchasePrice,
        rehabBudget: rehabCost,
        cashRequired: Math.round(purchasePrice * 0.25),
        projectedIrr: project.estimatedIrr ? Number((project.estimatedIrr * 100).toFixed(1)) : 17.5,
        targetRaise: 150000,
        committedAmount: 85000,
        marketplaceUrl: `/marketplace/${project.dealSlug || project.dealId}`,
      });
    }

    return list;
  }, [project]);

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      {/* 4-Phase REIL Selector Bar */}
      <section className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4" data-testid="reil-phase-nav">
        {reilPhaseOrderLabels().map((step) => {
          const isCurrentProjectPhase =
            step.legacy === project.currentPhase ||
            (step.legacy === 'acquisition' && (project.phase === 'acquisition' || (project.currentPhase as any) === 1)) ||
            (step.legacy === 'purchase' && (project.phase === 'purchase' || (project.currentPhase as any) === 2)) ||
            (step.legacy === 'hold' && (project.phase === 'hold' || (project.currentPhase as any) === 3)) ||
            (step.legacy === 'exit' && (project.phase === 'exit' || (project.currentPhase as any) === 4));

          const isSelected =
            (step.legacy === 'acquisition' && isAcqActive) ||
            (step.legacy === 'purchase' && isFundActive) ||
            (step.legacy === 'hold' && isHoldActive) ||
            (step.legacy === 'exit' && isExitActive);

          // Phase-specific highlight styles
          const highlightBorder = isSelected
            ? step.legacy === 'acquisition'
              ? 'rgba(255, 255, 255, 0.45)'
              : step.legacy === 'purchase'
              ? 'rgba(59, 130, 246, 0.6)'
              : step.legacy === 'hold'
              ? 'rgba(249, 115, 22, 0.6)'
              : 'rgba(16, 185, 129, 0.6)'
            : isCurrentProjectPhase
            ? 'rgba(255, 255, 255, 0.22)'
            : 'rgba(255, 255, 255, 0.08)';

          const highlightBg = isSelected
            ? step.legacy === 'acquisition'
              ? 'rgba(255, 255, 255, 0.10)'
              : step.legacy === 'purchase'
              ? 'rgba(59, 130, 246, 0.12)'
              : step.legacy === 'hold'
              ? 'rgba(249, 115, 22, 0.12)'
              : 'rgba(16, 185, 129, 0.12)'
            : isCurrentProjectPhase
            ? 'rgba(255, 255, 255, 0.06)'
            : 'rgba(0, 0, 0, 0.2)';

          const stepPhaseNumber =
            step.legacy === 'acquisition' ? '01' : step.legacy === 'purchase' ? '02' : step.legacy === 'hold' ? '03' : '04';

          return (
            <button
              type="button"
              key={step.phase}
              data-testid={`reil-tab-${step.legacy}`}
              onClick={() => setActiveTab(step.legacy)}
              className="rounded-2xl border p-4 text-left transition hover:border-white/30 focus:outline-none"
              style={{
                borderColor: highlightBorder,
                background: highlightBg,
              }}
            >
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-[0.08em] font-mono text-white/50">
                  Phase {stepPhaseNumber}: {step.label}
                </p>
                {isCurrentProjectPhase && (
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-semibold uppercase text-white/80">
                    Active Phase
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-sm font-bold text-white">
                {isSelected ? 'Viewing Workspace' : isCurrentProjectPhase ? 'Current Project Stage' : 'Switch Workspace'}
              </p>
            </button>
          );
        })}
      </section>

      {/* Dedicated Project Deal Components Hub */}
      <section
        data-testid="project-deal-components-hub"
        className="rounded-xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-md space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-neutral-300">
                account_tree
              </span>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Deal Components Inside This Project
              </h3>
              <span
                data-testid="project-deals-count-badge"
                className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-mono font-semibold text-neutral-300"
              >
                {projectDeals.length} Component{projectDeals.length === 1 ? '' : 's'}
              </span>
            </div>
            <p className="mt-1 text-xs text-neutral-400">
              This overarching Project governs the 4-phase lifecycle. Deals are actionable financial underwriting, syndication offerings, and debt transaction components executed inside this container.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/deal-calculator?projectId=${project.id}&address=${encodeURIComponent(project.address || project.propertyName || '')}&price=${project.purchasePrice || 450000}`}
              data-testid="overview-add-deal-component-btn"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/20 transition min-h-[44px]"
            >
              <span>+ Underwrite Deal Component</span>
            </Link>
          </div>
        </div>

        {/* Deal Components Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {projectDeals.map((dealComp) => (
            <div
              key={dealComp.id}
              data-testid={`deal-component-card-${dealComp.id}`}
              className="rounded-lg border border-white/10 bg-black/30 p-4 space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded border px-2 py-0.5 text-[10px] font-mono uppercase font-bold text-neutral-300 border-white/10 bg-white/5">
                    {dealComp.dealType === 'underwriting'
                      ? 'Acquisition Pro-Forma'
                      : dealComp.dealType === 'syndication'
                      ? 'Marketplace Offering'
                      : 'Debt / Loan Package'}
                  </span>
                  <span
                    className={`text-[10px] font-mono font-semibold uppercase ${
                      dealComp.status === 'active' || dealComp.status === 'funded'
                        ? 'text-emerald-400'
                        : 'text-neutral-400'
                    }`}
                  >
                    {dealComp.status}
                  </span>
                </div>

                <h4 className="text-sm font-semibold text-white truncate" title={dealComp.name}>
                  {dealComp.name}
                </h4>
                <p className="text-xs text-neutral-400 font-mono truncate" title={dealComp.address}>
                  {dealComp.address}
                </p>
              </div>

              {/* Financial Metrics Strip */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase block">Basis / Price</span>
                  <span className="font-bold text-white">
                    {formatCurrency(dealComp.purchasePrice)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase block">
                    {dealComp.projectedIrr ? 'Projected IRR' : 'Cash Required'}
                  </span>
                  <span className="font-bold text-neutral-200">
                    {dealComp.projectedIrr ? `${dealComp.projectedIrr.toFixed(1)}%` : formatCurrency(dealComp.cashRequired || 0)}
                  </span>
                </div>
              </div>

              {/* Action Link */}
              <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                {dealComp.dealType === 'syndication' && dealComp.marketplaceUrl ? (
                  <Link
                    href={dealComp.marketplaceUrl}
                    data-testid={`view-syndication-${dealComp.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-white hover:underline min-h-[44px]"
                  >
                    <span>View Offering on Marketplace →</span>
                  </Link>
                ) : dealComp.dealType === 'underwriting' ? (
                  <Link
                    href={`/deal-calculator?projectId=${project.id}&price=${dealComp.purchasePrice}`}
                    data-testid={`open-underwriting-${dealComp.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-white hover:underline min-h-[44px]"
                  >
                    <span>Open in Deal Calculator →</span>
                  </Link>
                ) : (
                  <Link
                    href={`/project/${project.id}/fund`}
                    data-testid={`manage-debt-${dealComp.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-white hover:underline min-h-[44px]"
                  >
                    <span>Manage Loan Terms →</span>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Active REIL Phase Workspace View */}
      {isAcqActive ? (
        <AcquisitionWorkspaceView project={project} onUpdateProject={updateProject} />
      ) : isFundActive ? (
        <FundWorkspaceView project={project} onUpdateProject={updateProject} />
      ) : isHoldActive ? (
        <HoldWorkspaceView project={project} onUpdateProject={updateProject} />
      ) : isExitActive ? (
        <ExitWorkspaceView project={project} onUpdateProject={updateProject} />
      ) : (
        <AcquisitionWorkspaceView project={project} onUpdateProject={updateProject} />
      )}
    </div>
  );
}
