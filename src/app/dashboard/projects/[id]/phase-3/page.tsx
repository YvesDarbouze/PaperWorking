'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { projectsService } from '@/lib/firebase/deals';
import { RehabExpense, HoldingCostEntry, SiteVisitLog, ScopeOfWorkItem, ContractorBid, DrawScheduleItem } from '@/types/schema';
import { useWorkspaceProject } from '@/app/dashboard/projects/[id]/layout';
import { RehabExpenseTracker } from '@/components/project/RehabExpenseTracker';
import { HoldingCostsTracker } from '@/components/project/HoldingCostsTracker';
import { SiteVisitLogTracker } from '@/components/project/SiteVisitLogTracker';
import { BurnRateKPI } from '@/components/project/BurnRateKPI';
import { ScopeOfWorkForm } from '@/components/project/ScopeOfWorkForm';
import { ContractorBids } from '@/components/project/ContractorBids';
import { CapExComparativeTable } from '@/components/project/CapExComparativeTable';
import { RehabSequenceTracker } from '@/components/project/RehabSequenceTracker';
import { ContractorDrawSchedule } from '@/components/project/ContractorDrawSchedule';
import { RenovationsCompleteGate } from '@/components/project/RenovationsCompleteGate';
import { PhaseExplainerVideo } from '@/components/project/PhaseExplainerVideo';
import { ExitStrategyToggle } from '@/components/project/ExitStrategyToggle';
import { RentalSetupForm } from '@/components/project/RentalSetupForm';
import { DaysHeldClock } from '@/components/project/DaysHeldClock';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

export default function Phase3RehabPage() {
  const params    = useParams();
  const router    = useRouter();
  const projectId = params.id as string;

  /* ── Data from shared WorkspaceContext (fetched once by layout) ── */
  const { project, loading: isLoading, refresh } = useWorkspaceProject();

  const [isSaving, setIsSaving] = useState(false);

  const [rehabExpenses, setRehabExpenses] = useState<RehabExpense[]>([]);
  const [holdingCosts, setHoldingCosts] = useState<HoldingCostEntry[]>([]);
  const [siteVisitLogs, setSiteVisitLogs] = useState<SiteVisitLog[]>([]);
  const [scopeOfWork, setScopeOfWork] = useState<ScopeOfWorkItem[]>([]);
  const [contractorBids, setContractorBids] = useState<ContractorBid[]>([]);
  const [drawSchedule, setDrawSchedule] = useState<DrawScheduleItem[]>([]);
  const [rehabTasks, setRehabTasks] = useState<RehabTask[]>([]);
  const [daysHeld, setDaysHeld] = useState(0);

  /* Sync local state when context project loads or changes */
  useEffect(() => {
    if (!project) return;
    setRehabExpenses(project.rehabExpenses || []);
    setHoldingCosts(project.holdingCosts || []);
    setSiteVisitLogs(project.siteVisitLogs || []);
    setScopeOfWork(project.rehab?.scopeOfWork || []);
    setContractorBids(project.rehab?.contractorBids || []);
    setDrawSchedule(project.rehab?.drawSchedule || []);
    setRehabTasks(project.financials?.rehabTasks || []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id]);

  /* Calculate Days Held centrally for financial automation */
  useEffect(() => {
    if (!project) return;
    const startDate = project.financials?.acquisitionDate || project.createdAt;
    if (!startDate) return;

    const start = new Date(startDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    setDaysHeld(diffDays);
  }, [project?.financials?.acquisitionDate, project?.createdAt]);

  const handleSave = async () => {
    if (!project) return;
    setIsSaving(true);
    try {
      await projectsService.updateDeal(projectId, {
        rehabExpenses,
        holdingCosts,
        siteVisitLogs,
        rehab: {
          baseBudget: 0,
          contingencyBufferPercentage: 0.15,
          tasks: [],
          permits: [],
          pendingReceipts: [],
          drawRequests: [],
          ...(project.rehab || {}),
          scopeOfWork,
          contractorBids,
          drawSchedule
        },
        financials: {
          ...project.financials,
          purchasePrice: project.financials?.purchasePrice || 0,
          estimatedARV: project.financials?.estimatedARV || 0,
          costs: project.financials?.costs || [],
          rehabTasks
        }
      });
      toast.success('Phase 3 tracking saved!');
      refresh();
    } catch (error) {
      console.error('Error saving Phase 3:', error);
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCompletePhase = async () => {
    if (!project) return;
    try {
      await handleSave(); // Save current state first
      await projectsService.updateDeal(projectId, {
        phaseStatus: 'Phase 4: Closing & Exit',
        updatedAt: new Date()
      });
      toast.success('Phase 3 Complete! Transitioning to Phase 4...');
      router.push(`/dashboard/projects/${projectId}/phase-4`);
    } catch (error) {
      console.error('Error transitioning phase:', error);
      toast.error('Failed to complete phase');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--text-secondary)' }} />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Project Not Found</h1>
      </div>
    );
  }

  const monthlyHoldingCosts = holdingCosts.reduce((sum, c) => sum + c.monthlyAmount, 0);
  const totalBudget = project.financials?.purchasePrice ? project.financials.purchasePrice * 0.1 : 0; // simple fallback if no explicit budget is set

  // Gate Logic
  const unpaidInvoicesCount = rehabExpenses.filter(e => !e.paid).length;
  const uncompletedMilestonesCount = drawSchedule.filter(d => d.status !== 'Paid').length;

  const handleStageChange = async (stage: 'Demolition' | 'Rough-In/MEP' | 'Finishes' | 'Staging' | 'Complete') => {
    if (!project) return;
    try {
      await projectsService.updateDeal(projectId, {
        rehab: {
          baseBudget: 0,
          contingencyBufferPercentage: 0.15,
          tasks: [],
          permits: [],
          pendingReceipts: [],
          drawRequests: [],
          ...(project.rehab || {}),
          currentStage: stage,
        }
      });
      refresh();
    } catch (err) {
      console.error('Failed to update stage:', err);
    }
  };

  const handleStrategyChange = async (strategy: 'Sell' | 'Rent') => {
    if (!project) return;
    try {
      await projectsService.updateDeal(projectId, {
        financials: {
          ...project.financials,
          purchasePrice: project.financials?.purchasePrice || 0, // ensure required fields
          estimatedARV: project.financials?.estimatedARV || 0,
          costs: project.financials?.costs || [],
          exitStrategyType: strategy
        }
      });
      refresh();
      toast.success(`Exit strategy set to ${strategy}`);
    } catch (err) {
      console.error('Failed to update exit strategy:', err);
      toast.error('Failed to update strategy');
    }
  };

  const handleRentalSetupChange = async (updates: Partial<ProjectFinancials>) => {
    if (!project) return;
    try {
      await projectsService.updateDeal(projectId, {
        financials: {
          ...project.financials,
          purchasePrice: project.financials?.purchasePrice || 0,
          estimatedARV: project.financials?.estimatedARV || 0,
          costs: project.financials?.costs || [],
          ...updates
        }
      });
      refresh();
    } catch (err) {
      console.error('Failed to update rental setup:', err);
      toast.error('Failed to update setup');
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-canvas)' }}>
      {/* ── Explainer Video Banner (flush below workspace header) ── */}
      <PhaseExplainerVideo
        phaseKey="phase-3"
        title="Understanding Phase 3: Hold"
        description="Welcome to the Hold phase. Understand the severity of tracking holding costs—whether you intend to rehab, rent, or sell. Keep tight control over your contractor sequencing, because every day of delay eats directly into your final profit."
        src="https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
        duration="4:12"
      />

      <div className="p-8 max-w-7xl mx-auto space-y-8">
        
        {/* Top KPIs & Clocks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <DaysHeldClock daysHeld={daysHeld} acquisitionDate={project.financials?.acquisitionDate} fallbackDate={project.createdAt} />
          <BurnRateKPI 
            monthlyHoldingCosts={monthlyHoldingCosts}
            daysHeld={daysHeld}
            estimatedTimelineDays={project.financials?.estimatedTimelineDays}
          />
        </div>

        {/* Pipeline Tracker */}
        <RehabSequenceTracker 
          currentStage={project.rehab?.currentStage || 'Demolition'}
          onStageChange={handleStageChange}
        />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <div className="flex flex-col gap-8">
            <ScopeOfWorkForm 
              items={scopeOfWork} 
              onChange={setScopeOfWork} 
            />
            <ContractorBids 
              bids={contractorBids} 
              baseBudget={totalBudget}
              onChange={setContractorBids} 
            />
            <CapExComparativeTable 
              tasks={rehabTasks} 
              onChange={setRehabTasks} 
            />
            <ContractorDrawSchedule 
              draws={drawSchedule} 
              onChange={setDrawSchedule} 
              totalBudget={totalBudget} 
            />
          </div>
          
          <div className="flex flex-col gap-8">
            <RehabExpenseTracker 
              expenses={rehabExpenses} 
              onChange={setRehabExpenses} 
              totalBudget={totalBudget}
            />
            <HoldingCostsTracker 
              holdingCosts={holdingCosts} 
              onChange={setHoldingCosts} 
              daysHeld={daysHeld}
            />
            <SiteVisitLogTracker 
              logs={siteVisitLogs} 
              onChange={setSiteVisitLogs} 
            />
          </div>
        </div>

        {/* Intended Exit Strategy Toggle */}
        <div className="pt-8 border-t border-[var(--border-subtle)]">
          <ExitStrategyToggle 
            currentStrategy={project.financials?.exitStrategyType}
            onChange={handleStrategyChange}
          />
          {project.financials?.exitStrategyType === 'Rent' && (
            <RentalSetupForm 
              financials={project.financials}
              onChange={handleRentalSetupChange}
            />
          )}
        </div>

        {/* Final Sign-off Gate */}
        <div className="pt-8">
          <RenovationsCompleteGate 
            unpaidInvoicesCount={unpaidInvoicesCount}
            uncompletedMilestonesCount={uncompletedMilestonesCount}
            onComplete={handleCompletePhase}
          />
        </div>

      </div>
    </div>
  );
}

