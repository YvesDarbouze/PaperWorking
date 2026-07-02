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
          await projectsService.updateProject(updatedProject.id, {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md p-4">
      <div className="bg-pw-glass-bg border border-pw-border backdrop-blur-[20px] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-pw-border bg-pw-glass-bg/90 text-pw-black">
          <h2 className="text-xl font-bold tracking-tight text-pw-black">Confirm Purchase</h2>
          <p className="text-sm text-pw-muted mt-1.5 leading-relaxed">Enter your final HUD-1 closing costs to complete Phase 2 and lock your acquisition numbers.</p>
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
              <label className="block text-[10px] font-black text-pw-muted uppercase tracking-[0.3em] mb-1.5">Final Purchase Price</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-pw-muted font-medium">$</span>
                <input
                  type="number"
                  value={purchasePrice}
                  onChange={(e) => { setPurchasePrice(Number(e.target.value) || ''); setError(''); }}
                  className="glass-input w-full pl-8 pr-4 py-3 text-lg font-bold rounded-2xl focus:outline-none transition-colors"
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-[10px] font-black text-pw-muted uppercase tracking-[0.3em] mb-1.5">Title & Settlement Fees</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-pw-muted font-medium">$</span>
                <input
                  type="number"
                  value={titleFees}
                  onChange={(e) => { setTitleFees(Number(e.target.value) || ''); setError(''); }}
                  className="glass-input w-full pl-8 pr-4 py-2.5 text-base font-semibold rounded-2xl focus:outline-none transition-colors"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-pw-muted uppercase tracking-[0.3em] mb-1.5">Origination / Lender Fees</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-pw-muted font-medium">$</span>
                <input
                  type="number"
                  value={originationFees}
                  onChange={(e) => { setOriginationFees(Number(e.target.value) || ''); setError(''); }}
                  className="glass-input w-full pl-8 pr-4 py-2.5 text-base font-semibold rounded-2xl focus:outline-none transition-colors"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="pw-btn pw-btn--ghost pw-btn--pill flex-1 py-3 px-4 transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="pw-btn bg-emerald-600 hover:bg-emerald-500 text-white rounded-full flex-1 flex justify-center items-center py-3 px-4 font-semibold transition-all disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign HUD & Close'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

