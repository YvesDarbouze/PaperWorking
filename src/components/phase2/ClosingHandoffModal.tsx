import React, { useState } from 'react';
import { useProjectStore } from '@/store/projectStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ClosingHandoffModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const currentProject = useProjectStore((s) => s.currentProject);
  const transitionToPhase3 = useProjectStore((s) => s.transitionToPhase3);

  const [purchasePrice, setPurchasePrice] = useState<number | ''>(currentProject?.financials.purchasePrice || '');
  const [titleFees, setTitleFees] = useState<number | ''>('');
  const [originationFees, setOriginationFees] = useState<number | ''>('');
  const [error, setError] = useState('');

  if (!isOpen || !currentProject) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchasePrice || !titleFees || !originationFees) {
      setError('Please fill out all fields.');
      return;
    }

    const { success, error: transitionError } = transitionToPhase3(currentProject.id, {
      purchasePrice: Number(purchasePrice),
      titleFees: Number(titleFees),
      originationFees: Number(originationFees)
    });

    if (success) {
      onClose();
    } else {
      setError(transitionError || 'Failed to transition to Phase 3.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">Execute Purchase</h2>
          <p className="text-sm text-gray-500 mt-1">Finalize the HUD-1 costs to close out Phase 2 and lock the acquisition ledger.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-6 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100 flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Final Purchase Price</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                <input
                  type="number"
                  value={purchasePrice}
                  onChange={(e) => { setPurchasePrice(Number(e.target.value) || ''); setError(''); }}
                  className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50 focus:bg-white transition-all text-lg font-semibold text-gray-900"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title & Settlement Fees</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={titleFees}
                  onChange={(e) => { setTitleFees(Number(e.target.value) || ''); setError(''); }}
                  className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Origination / Lender Fees</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={originationFees}
                  onChange={(e) => { setOriginationFees(Number(e.target.value) || ''); setError(''); }}
                  className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer"
            >
              Sign HUD & Close
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
