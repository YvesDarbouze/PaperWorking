'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useWorkspaceProject } from '@/app/dashboard/projects/[id]/layout';
import { useAuth } from '@/context/AuthContext';
import { useProjectStore } from '@/store/projectStore';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { projectsService } from '@/lib/firebase/deals';
import toast from 'react-hot-toast';
import { ArrowLeft, Loader2 } from 'lucide-react';

// Steps imports
import StepIndicator from '@/components/wizard/StepIndicator';
import CapitalStackStep from '@/components/fund/CapitalStackStep';
import FinancingStep from '@/components/fund/FinancingStep';
import VendorAssignmentStep from '@/components/fund/VendorAssignmentStep';
import ClosingChecklistStep from '@/components/fund/ClosingChecklistStep';
import FinalReviewStep from '@/components/fund/FinalReviewStep';

const STEPS = [
  { num: 1, label: 'Capital Stack' },
  { num: 2, label: 'Financing' },
  { num: 3, label: 'Vendor Assignment' },
  { num: 4, label: 'Closing Checklist' },
  { num: 5, label: 'Final Review' },
];

export default function FundWizardPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const { project, loading, refresh } = useWorkspaceProject();

  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Load completed steps list on mount based on fields presence
  useEffect(() => {
    if (project) {
      const f = (project.financials || {}) as any;
      const list: number[] = [];

      // Step 1: Capital stack composed
      if (f.capitalStack && f.capitalStack.length > 0) {
        list.push(1);
      }
      // Step 2: Financing lender fields present
      if (f.capitalStack?.some((s: any) => s.lenderName || s.notes)) {
        list.push(2);
      }
      // Step 3: Mandatory Title escrow & Closing Attorney vendors assigned
      if (f.diligenceTitleVendorId && f.diligenceAttorneyVendorId) {
        list.push(3);
      }
      // Step 4: Closing checklist entries completed
      if (project.closingChecklist && project.closingChecklist.length > 0) {
        list.push(4);
      }
      // Step 5: Finished
      if (project.status === 'hold' || project.currentPhase === 3) {
        list.push(5);
      }

      setCompletedSteps(list);
    }
  }, [project]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-8 h-8 text-[#7A9EAA] animate-spin" />
        <p className="text-xs text-slate-400 font-medium">Loading Financing Wizard...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 text-center space-y-2">
        <p className="text-sm font-bold text-rose-400">Project Not Found</p>
        <p className="text-xs text-slate-500">The specified property workspace could not be resolved.</p>
      </div>
    );
  }

  const handleSaveStep = async (updates: any) => {
    try {
      const projectRef = doc(db, 'projects', project.id);
      await updateDoc(projectRef, updates);
      
      toast.success('Step progress saved!');

      // Move forward
      if (currentStep < 5) {
        if (!completedSteps.includes(currentStep)) {
          setCompletedSteps([...completedSteps, currentStep]);
        }
        setCurrentStep(currentStep + 1);
      } else {
        if (!completedSteps.includes(currentStep)) {
          setCompletedSteps([...completedSteps, currentStep]);
        }
      }
      refresh();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to save step progress.');
    }
  };

  const handleCompleteWizard = async (hudData: { purchasePrice: number; titleFees: number; originationFees: number }) => {
    try {
      const idToken = await user?.getIdToken();
      if (!idToken) throw new Error('Unauthenticated user context');

      // 1. Call Close Deal API
      const res = await fetch('/api/fund/close-deal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          projectId: project.id,
          finalPurchasePrice: hudData.purchasePrice,
          titleFees: hudData.titleFees,
          originationFees: hudData.originationFees,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Checklist deliverables audit failed.');
      }

      // 2. Sync local ProjectStore to reflect hold status and ledger additions
      const store = useProjectStore.getState();
      const transitionToPhase3 = store.transitionToPhase3;
      
      const { success, error } = transitionToPhase3(project.id, {
        purchasePrice: hudData.purchasePrice,
        titleFees: hudData.titleFees,
        originationFees: hudData.originationFees,
      });

      if (!success) {
        throw new Error(error || 'Local transition failed');
      }

      // Update store deals list with refreshed values
      const updatedProject = useProjectStore.getState().projects.find(p => p.id === project.id);
      if (updatedProject) {
        await projectsService.updateProject(updatedProject.id, {
          phaseStatus: updatedProject.phaseStatus,
          costBasisLedger: updatedProject.costBasisLedger,
          financials: updatedProject.financials,
        });
      }

      toast.success('Project successfully advanced to Hold phase!');
      router.push(`/dashboard/projects/${project.id}/phase-3`);
      refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Verification failed. Double check vendor deliverables.');
    }
  };

  return (
    <main className="w-full max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Back to workspace header button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push(`/dashboard/projects/${project.id}/phase-2`)}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Funding Workspace</span>
        </button>
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A9EAA] bg-[#7A9EAA]/5 border border-[#7A9EAA]/10 px-2.5 py-1 rounded-full">
          Funding Wizard
        </span>
      </div>

      {/* Stepper block */}
      <div className="p-4 sm:p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
        <StepIndicator
          currentStep={currentStep}
          completedSteps={completedSteps}
          steps={STEPS}
          onStepClick={(step) => setCurrentStep(step)}
        />
      </div>

      {/* Step View Card */}
      <div className="p-5 sm:p-7 bg-[#181315]/80 backdrop-blur-md border border-white/5 rounded-2xl min-h-[350px]">
        {currentStep === 1 && (
          <CapitalStackStep initialData={project} onSave={handleSaveStep} />
        )}
        {currentStep === 2 && (
          <FinancingStep projectId={project.id} initialData={project} onSave={handleSaveStep} />
        )}
        {currentStep === 3 && (
          <VendorAssignmentStep initialData={project} onSave={handleSaveStep} />
        )}
        {currentStep === 4 && (
          <ClosingChecklistStep initialData={project} onSave={handleSaveStep} />
        )}
        {currentStep === 5 && (
          <FinalReviewStep
            projectId={project.id}
            initialData={project}
            onComplete={handleCompleteWizard}
          />
        )}
      </div>

      {/* Wizard Footer controls */}
      <div className="flex justify-between items-center text-xs text-slate-500">
        <button
          disabled={currentStep === 1}
          onClick={() => setCurrentStep(currentStep - 1)}
          className="px-4 py-2 border border-white/10 rounded-lg text-white hover:bg-white/5 transition-all disabled:opacity-30 disabled:pointer-events-none"
        >
          Previous Step
        </button>
        <span>
          Step {currentStep} of 5
        </span>
      </div>
    </main>
  );
}
