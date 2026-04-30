'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { projectsService } from '@/lib/firebase/projects';
import { useWorkspaceProject } from '@/app/dashboard/projects/[id]/layout';
import { closeProjectAndArchiveServerAction } from '@/actions';
import toast, { Toaster } from 'react-hot-toast';
import type { ProjectFinancials } from '@/types/schema';
import { useProjectStore } from '@/store/projectStore';
import ExitStrategyFork from '@/components/exit/ExitStrategyFork';
import { DispositionLedger } from '@/components/project/DispositionLedger';
import { SettlementLedger } from '@/components/project/SettlementLedger';
import { RentalOperationsLedger } from '@/components/project/RentalOperationsLedger';
import { ListingCRMTracker } from '@/components/project/ListingCRMTracker';
import { MarketingListingLedger } from '@/components/project/MarketingListingLedger';
import { TotalAllInCostCard } from '@/components/project/TotalAllInCostCard';
import { NetRealizedProfitCard } from '@/components/project/NetRealizedProfitCard';
import { DocumentVault } from '@/components/project/DocumentVault';
import NetProceedsCard from '@/components/exit/NetProceedsCard';
import NetEngine from '@/components/exit/NetEngine';
import FinalProfitVisualization from '@/components/exit/FinalProfitVisualization';
import { PhaseExplainerVideo } from '@/components/project/PhaseExplainerVideo';
import { computeAutopsyMetrics } from '@/lib/math/calculatorUtils';
import {
  Building2,
  MapPin,
  CalendarDays,
  DollarSign,
  CheckCircle2,
  PieChart,
  ClipboardList,
  History,
  Calculator,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   /dashboard/projects/[id]/phase-4 — Hold & Exit Workspace Shell

   Container layout for all Phase 4 components.
   Enforces strict visual theming: the global folder icon and
   the primary Phase 4 header banner use #595959 as their
   background/fill color.
   ═══════════════════════════════════════════════════════════════ */

/* ── Phase 4 theming constant ── */
const PHASE_COLOR = '#595959';

export default function Phase4WorkspacePage() {
  const params    = useParams();
  const router    = useRouter();
  const { user }  = useAuth();
  const projectId = params.id as string;

  /* ── Data from shared WorkspaceContext (fetched once by layout) ── */
  const { project, loading, refresh } = useWorkspaceProject();
  const [localProject, setLocalProject] = useState<typeof project>(null);

  useEffect(() => {
    if (project) setLocalProject(project);
  }, [project]);

  const [isSaving, setIsSaving] = useState(false);
  const updateProjectFinancials = useProjectStore(state => state.updateProjectFinancials);

  const metrics = useMemo(() => {
    // Calculate metrics using localProject for real-time responsiveness
    const srcProject = localProject || project;
    if (!srcProject) return { basis: 0, capEx: 0, holding: 0 };

    const autopsy = computeAutopsyMetrics(srcProject);

    return { 
      basis: autopsy.purchasePrice + autopsy.acquisitionCosts, 
      capEx: autopsy.actualRehabCost > 0 ? autopsy.actualRehabCost : autopsy.projectedRehabCost, 
      holding: autopsy.holdingCosts 
    };
  }, [localProject, project]);

  const strategy = localProject?.financials?.exitStrategyType || 'Sell';

  const handleStrategyChange = (next: 'Sell' | 'Rent') => {
    if (!project) return;
    projectsService.updateDeal(projectId, {
      financials: { ...project.financials, exitStrategyType: next }
    }).then(() => refresh()).catch(console.error);
  };

  const handleFinancialsChange = (updated: Partial<ProjectFinancials>) => {
    // Optimistic local state update for real-time reactivity
    if (!localProject) return;
    setLocalProject({
      ...localProject,
      financials: {
        ...localProject.financials,
        ...updated
      } as ProjectFinancials
    });
  };

  const handleSaveFinancials = async (derived?: Partial<ProjectFinancials>) => {
    if (!project) return;
    setIsSaving(true);
    try {
      // If derived is passed (like from RentalOperationsLedger), optimistically update first
      let currentLocal = localProject;
      if (derived && localProject) {
        currentLocal = {
          ...localProject,
          financials: { ...localProject.financials, ...derived } as ProjectFinancials
        };
        setLocalProject(currentLocal);
      }
      
      const payload = currentLocal?.financials || project.financials;
      await updateProjectFinancials(projectId, payload);
      refresh();
    } catch (err) {
      console.error('Failed to save financials:', err);
      if (project) setLocalProject(project); // revert
    } finally {
      setIsSaving(false);
    }
  };

  const handleDocumentsChange = async (newDocs: any[]) => {
    if (!project) return;
    
    // Optimistic UI update
    if (localProject) {
      setLocalProject({ ...localProject, roleLinkedDocuments: newDocs });
    }

    try {
      await projectsService.updateDeal(projectId, { roleLinkedDocuments: newDocs });
      refresh();
    } catch (err) {
      console.error('Failed to save documents:', err);
      if (project) setLocalProject(project); // revert
    }
  };

  const handleCloseProject = async () => {
    if (!project || !user) return;
    setIsSaving(true);
    try {
      const idToken = await user.getIdToken();
      const orgId = project.organizationId;
      if (!orgId) throw new Error("Organization ID is missing.");

      await closeProjectAndArchiveServerAction(idToken, projectId, orgId, strategy as 'Sell' | 'Rent');
      toast.success('Project successfully closed and archived');
      refresh();
      // Optionally redirect to projects list or refresh to show locked state
      router.push('/dashboard/projects');
    } catch (error: any) {
      console.error('Failed to close project', error);
      toast.error(error.message || 'Failed to close project');
    } finally {
      setIsSaving(false);
    }
  };

  /* ── Loading state ── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-canvas)' }}>
        <div className="flex flex-col items-center gap-4 animate-shimmer">
          <div className="w-12 h-12 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: PHASE_COLOR, borderTopColor: 'transparent' }} />
          <p className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: 'var(--text-secondary)' }}>
            Loading Workspace…
          </p>
        </div>
      </div>
    );
  }

  /* ── Not found state ── */
  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-canvas)' }}>
        <div className="text-center space-y-3">
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Project not found.</p>
          <button
            onClick={() => router.push('/dashboard/projects')}
            className="text-xs font-bold uppercase tracking-[0.12em] underline"
            style={{ color: 'var(--text-secondary)' }}
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  /* ── Helper: format currency ── */
  const fmtCurrency = (val: number) => {
    return val.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  return (
    <div className="min-h-screen pb-24 bg-[#F9F9F9] relative overflow-hidden">
      <Toaster position="top-right" />
      
      {/* ── Locked State Indicator ── */}
      {project.locked && (
        <div className="sticky top-0 z-[100] bg-[#595959] text-white py-2 px-6 flex items-center justify-center gap-3 shadow-xl">
          <CheckCircle2 className="w-4 h-4 text-white" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Immutable Record: Project Archived & Locked</span>
        </div>
      )}

      {/* ── Phase Banner ── */}
      <PhaseExplainerVideo
        phaseKey="phase-4"
        title="Understanding Phase 4: Closing & Exit"
        description="Welcome to the final phase. This is the culmination of your project where you execute your exit strategy—either selling the property for a lump-sum profit or refinancing it into a long-term rental portfolio."
        src="https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
        duration="3:15"
      />

      <main className="max-w-6xl mx-auto px-6 py-12 space-y-12">
        
        {/* ── Top Level Aggregation ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <TotalAllInCostCard project={project} />
          </div>
          <div className="rounded-[8px] border p-8 flex flex-col justify-center bg-white shadow-sm border-gray-100" style={{ borderColor: 'var(--border-ui)' }}>
             <span className="text-[10px] font-bold uppercase tracking-[0.2em] mb-4 text-[#595959]">Archival Readiness</span>
             <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[#F9F9F9] border border-gray-100">
                 <div className={`w-4 h-4 rounded-full ${project.locked ? 'bg-green-500' : 'bg-[#595959] animate-pulse'}`} />
               </div>
               <div>
                 <p className="text-sm font-black tracking-tight text-[#595959]">
                   {project.locked ? 'Project Locked' : 'Awaiting Final Settlement'}
                 </p>
                 <p className="text-[10px] text-gray-400 font-medium">
                   {project.locked ? 'Historical performance metrics synchronized.' : 'Reconcile all ledgers before closing.'}
                 </p>
               </div>
             </div>
          </div>
        </div>

        {/* ── Financial Baseline Metrics ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Capitalized Basis', value: metrics.basis, icon: Building2, desc: 'Purchase + Acquisition costs' },
            { label: 'Total CapEx', value: metrics.capEx, icon: PieChart, desc: 'Finalized rehab & renovations' },
            { label: 'Holding Costs', value: metrics.holding, icon: DollarSign, desc: 'Accrued carry & maintenance' }
          ].map((metric, i) => (
            <div key={i} className="p-6 rounded-[8px] border bg-white flex flex-col gap-2 transition-all hover:shadow-lg hover:-translate-y-1" style={{ borderColor: 'var(--border-ui)' }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md flex items-center justify-center bg-[#F9F9F9]">
                  <metric.icon className="w-4 h-4" style={{ color: PHASE_COLOR }} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">{metric.label}</span>
              </div>
              <div className="mt-2">
                <span className="text-3xl font-black tracking-tighter" style={{ color: 'var(--text-primary)' }}>
                  {fmtCurrency(metric.value)}
                </span>
                <p className="text-[9px] mt-1 text-gray-400 font-medium tracking-wide">
                  {metric.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Strategy Orchestration ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          
          <div className="lg:col-span-3 space-y-10">
            <ExitStrategyFork 
              projectId={projectId} 
              strategy={strategy as 'Sell' | 'Rent'} 
              onStrategyChange={handleStrategyChange} 
            />

            {strategy === 'Sell' && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <NetRealizedProfitCard project={project} />
                
                <div className="grid grid-cols-1 gap-10">
                  <MarketingListingLedger 
                    financials={localProject?.financials || project.financials || {}} 
                    onChange={handleFinancialsChange} 
                    onSave={() => handleSaveFinancials()} 
                    isSaving={isSaving} 
                    isLocked={project.locked}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <ListingCRMTracker 
                      financials={localProject?.financials || project.financials || {}} 
                      onChange={handleFinancialsChange} 
                      onSave={() => handleSaveFinancials()} 
                      isSaving={isSaving} 
                      isLocked={project.locked}
                    />
                    <DispositionLedger 
                      financials={localProject?.financials || project.financials || {}} 
                      onChange={handleFinancialsChange} 
                      onSave={() => handleSaveFinancials()} 
                      isSaving={isSaving} 
                      isLocked={project.locked}
                    />
                  </div>

                  <SettlementLedger 
                    financials={localProject?.financials || project.financials || {}} 
                    onChange={handleFinancialsChange} 
                    onSave={() => handleSaveFinancials()} 
                    isSaving={isSaving} 
                    isLocked={project.locked}
                  />
                </div>
              </div>
            )}

            {strategy === 'Rent' && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
                 <NetProceedsCard deal={localProject || project} />
                 <RentalOperationsLedger 
                  financials={localProject?.financials || project.financials || {}} 
                  totalAllInCost={metrics.basis + metrics.capEx} 
                  onChange={handleFinancialsChange} 
                  onSave={(derived) => handleSaveFinancials(derived)} 
                  isSaving={isSaving} 
                  isLocked={project.locked}
                />
              </div>
            )}

            <div className="pt-8 border-t border-gray-100">
              <DocumentVault 
                projectId={projectId} 
                documents={localProject?.roleLinkedDocuments || project.roleLinkedDocuments || []} 
                onChange={handleDocumentsChange} 
                categories={['Final Settlement Statement', 'Deed', 'Buyer Agreements']}
                title="Exit Vault"
                description="Upload finalized settlement documentation to anchor the compliance record."
              />
            </div>
          </div>

          <div className="lg:col-span-2 space-y-8">
            <section className="rounded-[8px] bg-white border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-[#595959] flex items-center justify-between">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">Project Metadata</h2>
                <div className={`px-2 py-1 rounded-[4px] text-[8px] font-bold uppercase tracking-widest ${project.locked ? 'bg-green-500/20 text-green-200' : 'bg-white/10 text-white/60'}`}>
                  {project.status}
                </div>
              </div>
              <div className="p-6 space-y-6">
                {[
                  { label: 'Project ID', value: project.id, icon: ClipboardList },
                  { label: 'Lifecycle State', value: project.phaseStatus || 'Closing & Exit', icon: History },
                  { label: 'Primary Owner', value: user?.displayName || project.ownerUid, icon: MapPin }
                ].map((row, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="mt-1 w-8 h-8 rounded-md bg-[#F9F9F9] flex items-center justify-center border border-gray-50">
                      <row.icon className="w-3.5 h-3.5 text-[#595959]" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 block mb-1">{row.label}</span>
                      <span className="text-xs font-black tracking-tight text-[#595959]">{row.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="p-8 rounded-[8px] border border-dashed border-gray-200 bg-[#F9F9F9]/50 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                  <Calculator className="w-4 h-4 text-[#595959]" />
                </div>
                <h3 className="text-xs font-black uppercase tracking-widest text-[#595959]">Exit Intelligence</h3>
              </div>
              <p className="text-[10px] leading-relaxed text-gray-400 font-medium">
                Our calculation engine uses capital-weighted aggregation to derive your final net realized profit. Every staging fee, lender payoff, and tax proratio is factored into the terminal ROI.
              </p>
            </section>
          </div>
        </div>

        {/* ── Final Submission Hub ── */}
        <section className="mt-20 py-16 border-t border-gray-100 flex flex-col items-center text-center gap-10">
          <div className="max-w-xl space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#595959]/5 border border-[#595959]/10">
              <div className={`w-2 h-2 rounded-full ${project.locked ? 'bg-green-500' : 'bg-[#595959] animate-pulse'}`} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#595959]">
                {project.locked ? 'Project Archived' : 'Ready for Archival'}
              </span>
            </div>
            <h2 className="text-4xl font-black tracking-tighter text-[#595959] uppercase">
              Terminal Project Reconciliation
            </h2>
            <p className="text-xs leading-relaxed text-gray-400 font-medium max-w-lg mx-auto">
              Archiving this project will freeze all financial data, set the project to an immutable read-only state, and push the final performance metrics to your organization's global SaaS dashboard.
            </p>
          </div>

          <button
            onClick={handleCloseProject}
            disabled={isSaving || project.locked}
            className={`
              relative px-16 py-5 rounded-md text-xs font-bold uppercase tracking-[0.3em] transition-all
              shadow-[0_20px_50px_rgba(89,89,89,0.3)] hover:shadow-[0_20px_60px_rgba(89,89,89,0.5)]
              ${project.locked 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none' 
                : 'bg-[#595959] text-white hover:scale-105 active:scale-95'}
            `}
          >
            {isSaving ? (
              <div className="flex items-center gap-4">
                <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
                <span>Aggregating Portfolio Data...</span>
              </div>
            ) : project.locked ? (
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4" />
                <span>Archived & Synchronized</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <ClipboardList className="w-4 h-4" />
                <span>Close Project & Archive</span>
              </div>
            )}
          </button>
        </section>

      </main>
    </div>
  );
}
