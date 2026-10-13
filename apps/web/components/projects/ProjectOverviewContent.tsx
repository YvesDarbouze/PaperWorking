'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import {
  reilPhaseOrderLabels,
  formatCurrency,
} from '@/lib/projects/phase-utils';
import type { ProjectDealComponent } from '@/lib/projects/types';
import { buildProjectSchedule } from '@/lib/projects/schedule';
import { useProjectWorkspace } from '@/components/projects/ProjectWorkspaceProvider';
import AcquisitionWorkspaceView from '@/components/projects/AcquisitionWorkspaceView';
import FundWorkspaceView from '@/components/projects/FundWorkspaceView';
import HoldWorkspaceView from '@/components/projects/HoldWorkspaceView';
import ExitWorkspaceView from '@/components/projects/ExitWorkspaceView';

import { ArrowRight, TreeStructure } from '@phosphor-icons/react';

// Basecamp Tool Views
import ProjectBasecampHub from '@/components/projects/basecamp/ProjectBasecampHub';
import InviteTeamModal from '@/components/projects/basecamp/InviteTeamModal';
import ProjectMessageBoardView from '@/components/projects/basecamp/ProjectMessageBoardView';
import ProjectCampfireView from '@/components/projects/basecamp/ProjectCampfireView';
import ProjectCheckInsView from '@/components/projects/basecamp/ProjectCheckInsView';
import ProjectTaskGroupsView from '@/components/projects/basecamp/ProjectTaskGroupsView';
import ProjectCardTableView from '@/components/projects/basecamp/ProjectCardTableView';
import ProjectHillChartView from '@/components/projects/basecamp/ProjectHillChartView';
import ProjectScheduleView from '@/components/projects/basecamp/ProjectScheduleView';
import ProjectActivityFeedView from '@/components/projects/basecamp/ProjectActivityFeedView';
import VendorAccessControlBanner from '@/components/projects/basecamp/VendorAccessControlBanner';

export default function ProjectOverviewContent() {
  const { project, updateProject, refetch } = useProjectWorkspace();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const phaseParam = searchParams?.get('phase')?.toLowerCase();
  const toolParam = searchParams?.get('tool')?.toLowerCase();
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

  // Basecamp Project Hub Active Tool State
  const [activeTool, setActiveTool] = useState<string | null>(() => toolParam || null);
  const [vendorMode, setVendorMode] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  useEffect(() => {
    if (toolParam && toolParam !== activeTool) {
      setActiveTool(toolParam);
    }
  }, [toolParam, activeTool]);

  const handleSelectTool = useCallback((toolId: string | null) => {
    setActiveTool(toolId);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (toolId) {
        url.searchParams.set('tool', toolId);
      } else {
        url.searchParams.delete('tool');
      }
      router.replace(url.pathname + url.search, { scroll: false });
    }
  }, [router]);

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

  const isFundActive =
    activeTab === 'purchase' ||
    activeTab === 'fund' ||
    ((project.currentPhase === 'purchase' || (project.currentPhase as string) === 'fund' || (project.currentPhase as any) === 2) && activeTab !== 'acquisition');

  const isAcqActive = !isFundActive;
  const derivedTaskGroups = useMemo(() => {
    return (project.taskLists ?? []).map((list) => ({
      id: list.id,
      title: list.title,
      phase: list.phase,
      tasks: (project.tasks ?? []).filter((t) => t.listId === list.id),
    }));
  }, [project.taskLists, project.tasks]);

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
              className="rounded-none border p-4 text-left transition hover:border-foreground/30 focus:outline-none"
              style={{
                borderColor: highlightBorder,
                background: highlightBg,
              }}
            >
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-[0.08em] font-mono text-muted-foreground">
                  Phase {stepPhaseNumber}: {step.label}
                </p>
                {isCurrentProjectPhase && (
                  <span className="rounded-none border border-border bg-muted/40 px-2 py-0.5 text-[9px] font-semibold uppercase text-foreground">
                    Active Phase
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-sm font-bold text-foreground">
                {isSelected ? 'Viewing Workspace' : isCurrentProjectPhase ? 'Current Project Stage' : 'Switch Workspace'}
              </p>
            </button>
          );
        })}
      </section>

      {/* Dedicated Project Deal Components Hub */}
      <section
        data-testid="project-deal-components-hub"
        className="rounded-none border border-border bg-card p-5 space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <div className="flex items-center gap-2">
              <TreeStructure size={20} className="text-muted-foreground" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                Deal Components Inside This Project
              </h3>
              <span
                data-testid="project-deals-count-badge"
                className="rounded-none border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-mono font-semibold text-foreground"
              >
                {projectDeals.length} Component{projectDeals.length === 1 ? '' : 's'}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              This overarching Project governs the 4-phase lifecycle. Deals are actionable financial underwriting, syndication offerings, and debt transaction components executed inside this container.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/deal-calculator?projectId=${project.id}&address=${encodeURIComponent(project.address || project.propertyName || '')}&price=${project.purchasePrice || 450000}`}
              data-testid="overview-add-deal-component-btn"
              className="inline-flex items-center gap-1.5 rounded-none border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted transition min-h-[44px]"
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
              className="rounded-none border border-border bg-muted/20 p-4 space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-none border px-2 py-0.5 text-[10px] font-mono uppercase font-bold text-foreground border-border bg-card">
                    {dealComp.dealType === 'underwriting'
                      ? 'Acquisition Pro-Forma'
                      : dealComp.dealType === 'syndication'
                      ? 'Marketplace Offering'
                      : 'Debt / Loan Package'}
                  </span>
                  <span
                    className={`text-[10px] font-mono font-semibold uppercase ${
                      dealComp.status === 'active' || dealComp.status === 'funded'
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {dealComp.status}
                  </span>
                </div>

                <h4 className="text-sm font-semibold text-foreground truncate" title={dealComp.name}>
                  {dealComp.name}
                </h4>
                <p className="text-xs text-muted-foreground font-mono truncate" title={dealComp.address}>
                  {dealComp.address}
                </p>
              </div>

              {/* Financial Metrics Strip */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border text-xs font-mono">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase block">Basis / Price</span>
                  <span className="font-bold text-foreground">
                    {formatCurrency(dealComp.purchasePrice)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase block">
                    {dealComp.projectedIrr ? 'Projected IRR' : 'Cash Required'}
                  </span>
                  <span className="font-bold text-foreground">
                    {dealComp.projectedIrr ? `${dealComp.projectedIrr.toFixed(1)}%` : formatCurrency(dealComp.cashRequired || 0)}
                  </span>
                </div>
              </div>

              {/* Action Link */}
              <div className="pt-2 border-t border-border flex items-center justify-between">
                {dealComp.dealType === 'syndication' && dealComp.marketplaceUrl ? (
                  <Link
                    href={dealComp.marketplaceUrl}
                    data-testid={`view-syndication-${dealComp.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground hover:underline min-h-[44px]"
                  >
                    <span>View Offering on Marketplace</span>
                    <ArrowRight size={12} />
                  </Link>
                ) : dealComp.dealType === 'underwriting' ? (
                  <Link
                    href={`/deal-calculator?projectId=${project.id}&price=${dealComp.purchasePrice}`}
                    data-testid={`open-underwriting-${dealComp.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground hover:underline min-h-[44px]"
                  >
                    <span>Open in Deal Calculator</span>
                    <ArrowRight size={12} />
                  </Link>
                ) : (
                  <Link
                    href={`/project/${project.id}/fund`}
                    data-testid={`manage-debt-${dealComp.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground hover:underline min-h-[44px]"
                  >
                    <span>Manage Loan Terms</span>
                    <ArrowRight size={12} />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Vendor & Guest Involvement Access Banner */}
      <VendorAccessControlBanner
        vendorMode={vendorMode}
        onToggleVendorMode={setVendorMode}
      />

      {/* Basecamp-Style 6-Card Project Hub */}
      <ProjectBasecampHub
        project={project}
        vendorMode={vendorMode}
        onOpenTool={(toolId) => {
          if (toolId === 'deal-calculator') {
            window.location.href = `/deal-calculator?projectId=${project.id}&price=${project.purchasePrice || 450000}`;
          } else {
            handleSelectTool(activeTool === toolId ? null : toolId);
          }
        }}
        onInviteTeam={() => setInviteModalOpen(true)}
        onRefresh={refetch}
      />

      {/* Full Tool Panel — renders when a card is expanded */}
      {activeTool && (
        <section
          data-testid="basecamp-active-tool-container"
          className="rounded-none border border-border bg-card p-5 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              {activeTool === 'messages' && 'Message Board'}
              {activeTool === 'campfire' && 'Chat'}
              {activeTool === 'checkins' && 'Check-Ins'}
              {activeTool === 'todos' && 'To-Dos'}
              {activeTool === 'card-table' && 'The REIL'}
              {activeTool === 'hill-chart' && 'Hill Chart'}
              {activeTool === 'schedule' && 'Schedule'}
              {activeTool === 'docs' && 'Docs & Files'}
              {activeTool === 'activity' && 'Activity Feed'}
            </span>
            <button
              type="button"
              onClick={() => handleSelectTool(null)}
              className="text-xs text-muted-foreground hover:text-foreground transition px-2 py-1 rounded-none border border-border hover:bg-muted min-h-[44px]"
            >
              Close
            </button>
          </div>

          {activeTool === 'messages' && (
            <ProjectMessageBoardView
              projectId={project.id}
              topics={project.messageTopics || []}
              onRefresh={refetch}
              vendorMode={vendorMode}
            />
          )}

          {activeTool === 'campfire' && (
            <ProjectCampfireView
              projectId={project.id}
              messages={project.campfireMessages || []}
              onRefresh={refetch}
            />
          )}

          {activeTool === 'checkins' && (
            <ProjectCheckInsView
              projectId={project.id}
              checkIns={project.checkInQuestions || []}
              onRefresh={refetch}
            />
          )}

          {activeTool === 'todos' && (
            <ProjectTaskGroupsView
              projectId={project.id}
              taskGroups={derivedTaskGroups}
              onRefresh={refetch}
              vendorMode={vendorMode}
              teamMembers={project.teamMembers || []}
              documents={project.documents || []}
            />
          )}

          {activeTool === 'card-table' && (
            <ProjectCardTableView
              projectId={project.id}
              cardColumns={project.cardColumns || []}
              onRefresh={refetch}
              vendorMode={vendorMode}
            />
          )}

          {activeTool === 'hill-chart' && (
            <ProjectHillChartView
              projectId={project.id}
              items={project.hillChartItems || []}
              onRefresh={refetch}
            />
          )}

          {activeTool === 'schedule' && (
            <ProjectScheduleView
              projectId={project.id}
              events={buildProjectSchedule(project)}
              onRefresh={refetch}
            />
          )}

          {activeTool === 'activity' && (
            <ProjectActivityFeedView
              activity={project.activity || []}
              vendorMode={vendorMode}
            />
          )}

          {activeTool === 'docs' && (
            <div className="rounded-none border border-border bg-card p-6 text-center space-y-2">
              <h4 className="text-sm font-semibold text-foreground">Centralized Project Docs & Files</h4>
              <p className="text-xs text-muted-foreground">
                Transaction agreements, inspection PDFs, closing statements, and escrow files.
              </p>
              <div className="pt-2">
                <a
                  href={`/project/${project.id}/documents`}
                  className="inline-flex items-center gap-1.5 rounded-none bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition min-h-[44px]"
                >
                  Open Documents Vault
                </a>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Invite Team / Vendor Modal */}
      <InviteTeamModal
        projectId={project.id}
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        onSuccess={refetch}
      />


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
