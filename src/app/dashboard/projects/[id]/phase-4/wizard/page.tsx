'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useWorkspaceProject } from '@/app/dashboard/projects/[id]/layout';
import { useAuth } from '@/context/AuthContext';
import { projectsService } from '@/lib/firebase/deals';
import toast from 'react-hot-toast';
import { ArrowLeft, Loader2 } from 'lucide-react';

import StepIndicator from '@/components/wizard/StepIndicator';
import StrategyStep from '@/components/exit/StrategyStep';
import PreparationStep from '@/components/exit/PreparationStep';
import ExecutionStep from '@/components/exit/ExecutionStep';
import FinalAccountingStep from '@/components/exit/FinalAccountingStep';

const STEPS = [
  { num: 1, label: 'Strategy' },
  { num: 2, label: 'Preparation' },
  { num: 3, label: 'Execution' },
  { num: 4, label: 'Accounting' },
];

export default function ExitWizardPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { project, loading, refresh } = useWorkspaceProject();

  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Track strategy
  const [selectedStrategy, setSelectedStrategy] = useState<string>('Sell');

  useEffect(() => {
    if (project) {
      const f = (project.financials as any) || {};
      const strat = f.exitStrategy || 'Sell';
      setSelectedStrategy(strat);

      const list: number[] = [];
      if (f.exitStrategy) {
        list.push(1);
      }
      if (f.exitPrepComplete || strat === 'Hold') {
        list.push(2);
      }
      if (f.exitExecComplete) {
        list.push(3);
      }
      if ((project.status as any) === 'exited' || (project as any).status === 'EXITED') {
        list.push(4);
      }
      setCompletedSteps(list);
    }
  }, [project]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-8 h-8 text-[#7A9EAA] animate-spin" />
        <p className="text-xs text-slate-400 font-medium">Loading Exit Wizard...</p>
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

      if (currentStep < 4) {
        if (!completedSteps.includes(currentStep)) {
          setCompletedSteps([...completedSteps, currentStep]);
        }
        // If Strategy is Hold, Step 2 is skipped
        if (currentStep === 1 && updates.financials?.exitStrategy === 'Hold') {
          setCurrentStep(3); // Skip Prep step
        } else {
          setCurrentStep(currentStep + 1);
        }
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

  const handleCompleteExit = async () => {
    try {
      const idToken = await user?.getIdToken();
      if (!idToken) {
        toast.error('Authentication required.');
        return;
      }

      const response = await fetch('/api/exit/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          projectId: project.id,
          strategy: selectedStrategy,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to complete exit');
      }

      // Download Tax Packet PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TaxPacket_${project.address?.replace(/[^a-zA-Z0-9]/g, '_') || 'Property'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Project exited & Tax Packet generated!');
      router.push(`/dashboard/projects/${project.id}/phase-4`);
      refresh();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to process project exit.');
    }
  };

  return (
    <main className="w-full max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push(`/dashboard/projects/${project.id}/phase-4`)}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Exit Workspace</span>
        </button>
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A9EAA] bg-[#7A9EAA]/5 border border-[#7A9EAA]/10 px-2.5 py-1 rounded-full">
          Exit & Disposition Wizard
        </span>
      </div>

      <div className="p-4 sm:p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
        <StepIndicator
          currentStep={currentStep}
          completedSteps={completedSteps}
          steps={STEPS}
          onStepClick={(step) => setCurrentStep(step)}
        />
      </div>

      <div className="p-5 sm:p-7 bg-[#181315]/80 backdrop-blur-md border border-white/5 rounded-2xl min-h-[350px]">
        {currentStep === 1 && (
          <StrategyStep initialData={project} onSave={handleSaveStep} />
        )}
        {currentStep === 2 && (
          <PreparationStep initialData={project} onSave={handleSaveStep} strategy={selectedStrategy} />
        )}
        {currentStep === 3 && (
          <ExecutionStep initialData={project} onSave={handleSaveStep} strategy={selectedStrategy} />
        )}
        {currentStep === 4 && (
          <FinalAccountingStep initialData={project} strategy={selectedStrategy} onComplete={handleCompleteExit} />
        )}
      </div>

      <div className="flex justify-between items-center text-xs text-slate-500">
        <button
          disabled={currentStep === 1}
          onClick={() => {
            if (currentStep === 3 && selectedStrategy === 'Hold') {
              setCurrentStep(1); // skip Prep step going backward
            } else {
              setCurrentStep(currentStep - 1);
            }
          }}
          className="px-4 py-2 border border-white/10 rounded-lg text-white hover:bg-white/5 transition-all disabled:opacity-30 disabled:pointer-events-none"
        >
          Previous Step
        </button>
        <span>
          Step {currentStep} of 4
        </span>
      </div>
    </main>
  );
}
