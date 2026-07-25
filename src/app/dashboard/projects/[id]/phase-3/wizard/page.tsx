'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useWorkspaceProject } from '@/app/dashboard/projects/[id]/layout';
import { useAuth } from '@/context/AuthContext';
import { useProjectStore } from '@/store/projectStore';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { projectsService } from '@/lib/firebase/deals';
import toast from 'react-hot-toast';
import { ArrowLeft, Loader2 } from 'lucide-react';

import StepIndicator from '@/components/wizard/StepIndicator';
import RehabStep from '@/components/hold/RehabStep';
import LeaseUpStep from '@/components/hold/LeaseUpStep';
import RentCollectionStep from '@/components/hold/RentCollectionStep';
import OperationsStep from '@/components/hold/OperationsStep';

const ALL_STEPS = [
  { num: 1, label: 'Rehab' },
  { num: 2, label: 'Lease-Up' },
  { num: 3, label: 'Rent Collection' },
  { num: 4, label: 'Operations' },
];

export default function HoldWizardPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { project, loading, refresh } = useWorkspaceProject();

  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Raw strategy check
  const rawStrategy = searchParams?.get('strategy') || (project as any)?.disposition_type || (project as any)?.strategyType || 'RENT';
  const isFlip = rawStrategy === 'SALE' || rawStrategy === 'Fix & Flip' || rawStrategy === 'Sell';

  // Conditionally set steps (flips only do Rehab)
  const steps = isFlip ? [ALL_STEPS[0]] : ALL_STEPS;

  useEffect(() => {
    if (project) {
      const f = (project.financials as any) || {};
      const list: number[] = [];

      if (f.rehabScope && Object.keys(f.rehabScope).length > 0) {
        list.push(1);
      }
      if (f.leaseLeaseSigned) {
        list.push(2);
      }
      if (f.rentConnectionSetup) {
        list.push(3);
      }
      if ((project.status as any) === 'stabilized' || (project as any).status === 'STABILIZED') {
        list.push(4);
      }

      setCompletedSteps(list);
    }
  }, [project]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-8 h-8 text-[#7A9EAA] animate-spin" />
        <p className="text-xs text-slate-400 font-medium">Loading Operations Wizard...</p>
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
      await projectsService.updateProject(project.id, updates);
      
      toast.success('Step progress saved!');

      // Move forward if steps available
      if (currentStep < steps.length) {
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

  const handleCompleteHold = async () => {
    try {
      if (isFlip) {
        // Flips transition straight to Phase 4: Exit
        await projectsService.updateProject(project.id, {
          currentPhase: 4,
          phaseStatus: 'Phase 4: Exit',
          status: 'exit',
        });
        toast.success('Rehab complete! Project advanced to Exit phase.');
        router.push(`/dashboard/projects/${project.id}/phase-4`);
      } else {
        // Rentals transition to Stabilized state
        await projectsService.updateProject(project.id, {
          status: 'stabilized' as any,
          phaseStatus: 'Phase 3: Stabilized' as any,
        });
        toast.success('Property successfully Stabilized!');
        router.push(`/dashboard/projects/${project.id}/phase-3`);
      }
      refresh();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to complete Hold phase.');
    }
  };

  return (
    <main className="w-full max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push(`/dashboard/projects/${project.id}/phase-3`)}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Hold Workspace</span>
        </button>
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A9EAA] bg-[#7A9EAA]/5 border border-[#7A9EAA]/10 px-2.5 py-1 rounded-full">
          Operations Wizard ({isFlip ? 'Fix & Flip' : 'Rental'})
        </span>
      </div>

      {/* Stepper progress block */}
      <div className="p-4 sm:p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
        <StepIndicator
          currentStep={currentStep}
          completedSteps={completedSteps}
          steps={steps}
          onStepClick={(step) => setCurrentStep(step)}
        />
      </div>

      {/* Step Panel View */}
      <div className="p-5 sm:p-7 bg-[#181315]/80 backdrop-blur-md border border-white/5 rounded-2xl min-h-[350px]">
        {currentStep === 1 && (
          <RehabStep initialData={project} onSave={handleSaveStep} isFlip={isFlip} onComplete={handleCompleteHold} />
        )}
        {currentStep === 2 && (
          <LeaseUpStep initialData={project} onSave={handleSaveStep} />
        )}
        {currentStep === 3 && (
          <RentCollectionStep initialData={project} onSave={handleSaveStep} />
        )}
        {currentStep === 4 && (
          <OperationsStep initialData={project} onSave={handleSaveStep} onComplete={handleCompleteHold} />
        )}
      </div>

      {/* Footer controls */}
      <div className="flex justify-between items-center text-xs text-slate-500">
        <button
          disabled={currentStep === 1}
          onClick={() => setCurrentStep(currentStep - 1)}
          className="px-4 py-2 border border-white/10 rounded-lg text-white hover:bg-white/5 transition-all disabled:opacity-30 disabled:pointer-events-none"
        >
          Previous Step
        </button>
        <span>
          Step {currentStep} of {steps.length}
        </span>
      </div>
    </main>
  );
}
