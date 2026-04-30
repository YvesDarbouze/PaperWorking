import React, { useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { projectsService } from '@/lib/firebase/deals';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { Project } from '@/types/schema';

interface Props {
  isOpen: boolean;
  project: Project;
  onClose: () => void;
}

export const ClosingHandoffModal: React.FC<Props> = ({ isOpen, project, onClose }) => {
  const transitionToPhase3 = useProjectStore((s) => s.transitionToPhase3);

  const [purchasePrice, setPurchasePrice] = useState<number | ''>(project.financials.purchasePrice || '');
  const [titleFees, setTitleFees] = useState<number | ''>('');
  const [originationFees, setOriginationFees] = useState<number | ''>('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchasePrice || !titleFees || !originationFees) {
      setError('Please fill out all fields.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    // 1. Sync the fresh project prop to the store before transitioning
    const store = useProjectStore.getState();
    const updatedProjects = store.projects.map(p => p.id === project.id ? project : p);
    if (!store.projects.some(p => p.id === project.id)) updatedProjects.push(project);
    store.setDeals(updatedProjects);

    // 2. Call transitionToPhase3
    const { success, error: transitionError } = transitionToPhase3(project.id, {
      purchasePrice: Number(purchasePrice),
      titleFees: Number(titleFees),
      originationFees: Number(originationFees)
    });

    if (success) {
      // Get the updated project from the store to persist it
      const updatedProject = useProjectStore.getState().projects.find(p => p.id === project.id);
      if (updatedProject) {
        try {
          // Persist the updated financials, ledger, and phase status
          await projectsService.updateDeal(updatedProject.id, {
            phaseStatus: updatedProject.phaseStatus,
            costBasisLedger: updatedProject.costBasisLedger,
            financials: updatedProject.financials,
          });
          toast.success("Property Closed Successfully");
          onClose();
          router.push(`/dashboard/projects/${updatedProject.id}/phase-3`);
        } catch (err) {
          console.error("Failed to persist Phase 3 transition:", err);
          setError("Failed to persist transition to database.");
        }
      }
    } else {
      setError(transitionError || 'Failed to transition to Phase 3.');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <div className="bg-bg-surface rounded-2xl shadow-2xl border border-border-accent w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-border-accent bg-gradient-to-b from-bg-primary/50 to-transparent">
          <h2 className="text-xl font-bold text-text-primary tracking-tight">Execute Purchase</h2>
          <p className="text-sm text-text-secondary mt-1.5 leading-relaxed">Finalize the HUD-1 costs to close out Phase 2 and lock the acquisition ledger.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-6 p-3 bg-red-500/10 text-red-500 text-sm rounded-xl border border-red-500/20 flex items-center gap-2 font-medium">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-1.5">Final Purchase Price</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary font-medium">$</span>
                <input
                  type="number"
                  value={purchasePrice}
                  onChange={(e) => { setPurchasePrice(Number(e.target.value) || ''); setError(''); }}
                  className="w-full pl-8 pr-4 py-3 border border-border-accent rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none bg-bg-primary hover:bg-bg-primary/80 transition-all text-lg font-bold text-text-primary placeholder-text-muted"
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-1.5">Title & Settlement Fees</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary font-medium">$</span>
                <input
                  type="number"
                  value={titleFees}
                  onChange={(e) => { setTitleFees(Number(e.target.value) || ''); setError(''); }}
                  className="w-full pl-8 pr-4 py-2.5 border border-border-accent rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none bg-bg-primary hover:bg-bg-primary/80 transition-all text-base font-semibold text-text-primary placeholder-text-muted"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-text-primary mb-1.5">Origination / Lender Fees</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary font-medium">$</span>
                <input
                  type="number"
                  value={originationFees}
                  onChange={(e) => { setOriginationFees(Number(e.target.value) || ''); setError(''); }}
                  className="w-full pl-8 pr-4 py-2.5 border border-border-accent rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none bg-bg-primary hover:bg-bg-primary/80 transition-all text-base font-semibold text-text-primary placeholder-text-muted"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-bg-primary border border-border-accent text-text-primary rounded-xl font-semibold hover:bg-bg-surface hover:border-text-secondary transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 flex justify-center items-center py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold transition-all shadow-[0_0_20px_rgba(52,211,153,0.3)] hover:shadow-[0_0_25px_rgba(52,211,153,0.5)] cursor-pointer disabled:opacity-50 disabled:shadow-none"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign HUD & Close'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

