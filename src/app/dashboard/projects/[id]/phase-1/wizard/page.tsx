'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useWorkspaceProject } from '@/app/dashboard/projects/[id]/layout';
import { useAuth } from '@/context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { advanceProjectPhaseGate } from '@/actions/gate';
import toast from 'react-hot-toast';
import { ArrowLeft, Loader2, Award, CheckCircle2 } from 'lucide-react';

// Steps imports
import StepIndicator from '@/components/acquisition/StepIndicator';
import FinancialAssessmentStep from '@/components/acquisition/FinancialAssessmentStep';
import MarketResearchStep from '@/components/acquisition/MarketResearchStep';
import PropertySearchStep from '@/components/acquisition/PropertySearchStep';
import DealAnalysisStep from '@/components/acquisition/DealAnalysisStep';
import OfferLOIStep from '@/components/acquisition/OfferLOIStep';
import DueDiligenceStep from '@/components/acquisition/DueDiligenceStep';

export default function AcquisitionWizardPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const { project, loading, refresh } = useWorkspaceProject();

  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Load completed steps list on mount based on fields presence
  useEffect(() => {
    if (project) {
      const p = project as any;
      const f = (project.financials || {}) as any;
      const list: number[] = [];

      // Step 1: Capital & strategy set
      if (f.availableCapital && p.strategy) {
        list.push(1);
      }
      // Step 2: Market analyzed
      if (f.marketStatsSnapshot) {
        list.push(2);
      }
      // Step 3: Address / facts confirmed
      if (p.addressLine && p.propertyFacts) {
        list.push(3);
      }
      // Step 4: Underwriting scored
      if (f.scorecardAcknowledged && f.acknowledgedInputsHash) {
        list.push(4);
      }
      // Step 5: Offer price and accepted status
      if (f.offerStatus === 'Accepted') {
        list.push(5);
      }
      // Step 6: Diligence checklist
      if (f.diligenceUtilitiesTransferArranged) {
        list.push(6);
      }

      setCompletedSteps(list);
    }
  }, [project]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-8 h-8 text-slate-300 animate-spin" />
        <p className="text-xs text-slate-400 font-medium">Loading Acquisition Wizard...</p>
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
      if (currentStep < 6) {
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

  const handleCompleteWizard = async () => {
    try {
      const idToken = await user?.getIdToken();
      if (!idToken) throw new Error('Unauthenticated user context');

      const res = await advanceProjectPhaseGate(idToken, project.id) as any;
      if (!res.success) {
        throw new Error(res.error || 'Checklist requirements not fully satisfied');
      }

      toast.success('Project successfully advanced to Fund phase!');
      router.push(`/dashboard/projects/${project.id}/phase-2`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Verification failed. Double check due diligence files.');
    }
  };

  return (
    <main className="w-full max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Back to workspace header button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push(`/dashboard/projects/${project.id}/phase-1`)}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Acquisition Workspace</span>
        </button>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 bg-slate-800/5 border border-slate-700/10 px-2.5 py-1 rounded-full">
          Acquisition Wizard
        </span>
      </div>

      {/* Stepper block */}
      <div className="p-4 sm:p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
        <StepIndicator
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepClick={(step) => setCurrentStep(step)}
        />
      </div>

      {/* Step View Card */}
      <div className="p-5 sm:p-7 bg-[#181315]/80 backdrop-blur-md border border-white/5 rounded-2xl min-h-[350px]">
        {currentStep === 1 && (
          <FinancialAssessmentStep initialData={project} onSave={handleSaveStep} />
        )}
        {currentStep === 2 && (
          <MarketResearchStep initialData={project} onSave={handleSaveStep} />
        )}
        {currentStep === 3 && (
          <PropertySearchStep projectId={project.id} initialData={project} onSave={handleSaveStep} />
        )}
        {currentStep === 4 && (
          <DealAnalysisStep initialData={project} onSave={handleSaveStep} />
        )}
        {currentStep === 5 && (
          <OfferLOIStep projectId={project.id} initialData={project} onSave={handleSaveStep} />
        )}
        {currentStep === 6 && (
          <DueDiligenceStep
            projectId={project.id}
            initialData={project}
            onSave={handleSaveStep}
            onComplete={handleCompleteWizard}
            refreshProjectData={refresh}
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
          Step {currentStep} of 6
        </span>
      </div>
    </main>
  );
}
