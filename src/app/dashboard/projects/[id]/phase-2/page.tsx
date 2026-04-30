'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { projectsService } from '@/lib/firebase/deals';
import { useWorkspaceProject } from '@/app/dashboard/projects/[id]/layout';
import { Project, LoanStatus, ClosingChecklistItem, ProjectTeamMember, CostBasisLedger, RoleLinkedDocument, DueDiligenceItem, InspectionItem } from '@/types/schema';
import { LoanProcessingPipeline } from '@/components/project/LoanProcessingPipeline';
import { ClosingChecklist } from '@/components/project/ClosingChecklist';
import { AcquisitionTeamAssembly } from '@/components/project/AcquisitionTeamAssembly';
import { DueDiligenceChecklist } from '@/components/project/DueDiligenceChecklist';
import { InspectionTracker } from '@/components/project/InspectionTracker';
import { ContingencyTracker } from '@/components/project/ContingencyTracker';
import { DocumentVault } from '@/components/project/DocumentVault';
import { ClosingCostsLedger } from '@/components/project/ClosingCostsLedger';
import { ClearToCloseMilestone } from '@/components/project/ClearToCloseMilestone';
import { ClosingHandoffModal } from '@/components/phase2/ClosingHandoffModal';
import { Contingency } from '@/types/schema';
import toast from 'react-hot-toast';
import { Loader2, Lock } from 'lucide-react';
import { PhaseExplainerVideo } from '@/components/project/PhaseExplainerVideo';

export default function Phase2AcquisitionPage() {
  const params    = useParams();
  const projectId = params.id as string;

  /* ── Data from shared WorkspaceContext (fetched once by layout) ── */
  const { project, loading: isLoading, refresh } = useWorkspaceProject();

  const [isSaving, setIsSaving] = useState(false);

  // Local state for the components
  const [loanStatus, setLoanStatus] = useState<LoanStatus | undefined>();
  const [closingChecklist, setClosingChecklist] = useState<ClosingChecklistItem[]>([]);
  const [teamMembers, setTeamMembers] = useState<ProjectTeamMember[]>([]);
  const [dueDiligenceChecklist, setDueDiligenceChecklist] = useState<DueDiligenceItem[]>([]);
  const [inspections, setInspections] = useState<InspectionItem[]>([]);
  const [contingencies, setContingencies] = useState<Contingency[]>([]);
  const [costBasisLedger, setCostBasisLedger] = useState<CostBasisLedger | undefined>();
  const [roleLinkedDocuments, setRoleLinkedDocuments] = useState<RoleLinkedDocument[]>([]);
  const [isClearToClose, setIsClearToClose] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  /* Sync local state whenever context project loads or changes */
  useEffect(() => {
    if (!project) return;
    setLoanStatus(project.loanStatus);
    setClosingChecklist(project.closingChecklist || []);
    setTeamMembers(project.projectTeam || []);
    setDueDiligenceChecklist(project.dueDiligenceChecklist || []);
    setInspections(project.financials?.inspections || []);
    setContingencies(project.contingencies || []);
    setCostBasisLedger(project.costBasisLedger);
    setRoleLinkedDocuments(project.roleLinkedDocuments || []);
    setIsClearToClose(project.isClearToClose || false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id]); // Re-init only when project ID changes

  const handleSave = async (overrideClearToClose?: boolean) => {
    if (!project) return;
    setIsSaving(true);
    try {
      const finalIsClearToClose = overrideClearToClose !== undefined ? overrideClearToClose : isClearToClose;
      
      let initialCapitalizedBasis = project.financials?.initialCapitalizedBasis;

      if (finalIsClearToClose && !initialCapitalizedBasis) {
        const purchasePrice = project.financials?.purchasePrice || 0;
        let totalClosingCosts = 0;
        
        if (costBasisLedger) {
          const ledger = costBasisLedger;
          const allItems = [
            ...(ledger.directAcquisition || []),
            ...(ledger.financing || []),
            ...(ledger.preClosing || [])
          ];
          totalClosingCosts = allItems
            .filter(item => item.label.toLowerCase() !== 'purchase price')
            .reduce((sum, item) => sum + item.amount, 0);
        }
        initialCapitalizedBasis = purchasePrice + totalClosingCosts;
      } else if (!finalIsClearToClose) {
        initialCapitalizedBasis = undefined;
      }

      const newFinancials = { ...project.financials };
      if (initialCapitalizedBasis !== undefined) {
        newFinancials.initialCapitalizedBasis = initialCapitalizedBasis;
      } else {
        delete newFinancials.initialCapitalizedBasis;
      }

      await projectsService.updateDeal(projectId, {
        loanStatus,
        closingChecklist,
        projectTeam: teamMembers,
        dueDiligenceChecklist,
        contingencies,
        costBasisLedger,
        roleLinkedDocuments,
        isClearToClose: finalIsClearToClose,
        financials: newFinancials,
      });

      if (overrideClearToClose !== undefined) {
        toast.success(finalIsClearToClose ? 'Project Cleared to Close! Financials locked.' : 'Clear to Close revoked. Financials unlocked.');
      } else {
        toast.success('Phase 2 configuration saved!');
      }

      /* Sync context so layout header stays up-to-date */
      refresh();
    } catch (error) {
      console.error('Error saving Phase 2:', error);
      toast.error('Failed to save changes');
      if (overrideClearToClose !== undefined) {
        setIsClearToClose(!overrideClearToClose);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleImmediateSave = async (updates: Partial<Project>) => {
    if (!project) return;
    try {
      await projectsService.updateDeal(projectId, updates);
    } catch (error) {
      console.error('Failed to save changes immediately:', error);
      toast.error('Failed to save changes');
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

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-canvas)' }}>

      {/* ── Explainer Video Banner (flush below workspace header) ── */}
      <PhaseExplainerVideo
        phaseKey="phase-2"
        title="Understanding Phase 2: Purchase"
        description="Learn how to organize sale documents, process loans, and manage real estate attorneys to clear your deal to close."
        src="https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
        duration="3:15"
      />

      {/* ── Locked Purchase Terms ── */}
      <div className="border-b border-border-accent shadow-sm" style={{ background: 'var(--bg-surface)' }}>
        <div className="max-w-6xl mx-auto px-6 lg:px-12 py-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-[#f2f2f2]">
              <Lock className="w-5 h-5 text-[#595959]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[#595959]">
                Finalized Purchase Terms
              </h2>
              <p className="text-xs mt-1" style={{ color: '#7F7F7F' }}>
                These values were locked during Phase 1 Acquisition.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-8 bg-[#f9f9f9] px-6 py-4 rounded-lg border border-border-accent">
            <div className="text-center sm:text-right">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#7F7F7F' }}>
                Accepted Offer Price
              </p>
              <p className="text-2xl font-bold font-mono text-[#595959]">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(project?.financials?.purchasePrice || 0)}
              </p>
            </div>
            <div className="h-10 w-px bg-border-accent hidden sm:block"></div>
            <div className="text-center sm:text-left">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#7F7F7F' }}>
                Earnest Money Deposit
              </p>
              <p className="text-2xl font-bold font-mono text-[#595959]">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(project?.financials?.emdAmount || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 lg:px-12 py-16 space-y-16">
        
        {/* ── Two-column workspace grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          
          {/* ── Left column (3/5): Document Vault & Due Diligence ── */}
          <div className="lg:col-span-3 space-y-12">
            <DocumentVault 
              projectId={projectId} 
              documents={roleLinkedDocuments} 
              onChange={async (newDocs) => {
                setRoleLinkedDocuments(newDocs);
                handleImmediateSave({ roleLinkedDocuments: newDocs });
              }} 
            />
            <DueDiligenceChecklist 
              projectId={projectId}
              items={dueDiligenceChecklist} 
              onChange={(newItems) => {
                setDueDiligenceChecklist(newItems);
                handleImmediateSave({ dueDiligenceChecklist: newItems });
              }} 
            />
            <InspectionTracker
              projectId={projectId}
              initialInspections={inspections}
              onLocalChange={(newInspections) => {
                setInspections(newInspections);
                const currentFinancials = project?.financials || {};
                handleImmediateSave({ 
                  financials: { ...currentFinancials, inspections: newInspections }
                });
              }}
            />
            <ContingencyTracker
              contingencies={contingencies}
              onChange={(newContingencies) => {
                setContingencies(newContingencies);
                handleImmediateSave({ contingencies: newContingencies });
              }}
            />
            <ClosingCostsLedger 
              initialLedger={costBasisLedger}
              onChange={(newLedger) => {
                setCostBasisLedger(newLedger);
                handleImmediateSave({ costBasisLedger: newLedger });
              }}
              readOnly={isClearToClose}
            />
          </div>

          {/* ── Right column (2/5): Team & Process Tracking ── */}
          <div className="lg:col-span-2 space-y-10">
            <AcquisitionTeamAssembly 
              teamMembers={teamMembers} 
              onTeamMembersChange={(newTeamMembers) => {
                setTeamMembers(newTeamMembers);
                handleImmediateSave({ projectTeam: newTeamMembers });
              }} 
            />
            <LoanProcessingPipeline 
              currentStatus={loanStatus} 
              onStatusChange={(newStatus) => {
                setLoanStatus(newStatus);
                handleImmediateSave({ loanStatus: newStatus });
              }} 
            />
            <ClosingChecklist 
              items={closingChecklist} 
              onItemChange={(newItems) => {
                setClosingChecklist(newItems);
                handleImmediateSave({ closingChecklist: newItems });
              }} 
            />
          </div>
        </div>

        {/* ── Clear to Close & Proceed ── */}
        <ClearToCloseMilestone
          dueDiligenceChecklist={dueDiligenceChecklist}
          teamMembers={teamMembers}
          loanStatus={loanStatus}
          costBasisLedger={costBasisLedger}
          isClearToClose={isClearToClose}
          onToggle={(status) => {
            setIsClearToClose(status);
            handleSave(status);
          }}
          onExecutePurchase={() => setIsModalOpen(true)}
        />
      </main>
      
      <ClosingHandoffModal 
        isOpen={isModalOpen} 
        project={project}
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}

