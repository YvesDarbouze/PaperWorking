import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface CancelSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export const CancelSubscriptionModal: React.FC<CancelSubscriptionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [understandChecked, setUnderstandChecked] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setConfirmText('');
    setUnderstandChecked(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl p-6 border border-slate-200 shadow-2xl relative text-center space-y-6">
        <button
          onClick={handleClose}
          disabled={isLoading}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-650 p-1.5 hover:bg-slate-50 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-full bg-red-50 text-red-650 flex items-center justify-center mx-auto border border-red-100">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <div className="space-y-2">
          <h3 className="text-base font-bold text-slate-900">Cancel Subscription?</h3>
          <p className="text-xs text-slate-500 leading-relaxed px-2">
            Are you sure you want to cancel your paid plan? You will immediately lose access to team collaboration, search insights, and advanced deal underwriting models.
          </p>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl text-left space-y-2">
          <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">Consequences include:</h4>
          <ul className="text-[11px] text-slate-500 space-y-1.5 list-disc list-inside">
            <li>Loss of 10 team seat capacities</li>
            <li>Restricted property listing lookup quotas</li>
            <li>No shared workspace PDF export pipelines</li>
            <li>Workspace data retained for only 30 days</li>
          </ul>
        </div>

        <div className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Type CANCEL to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="CANCEL"
              className="w-full text-sm px-4 h-10 rounded-lg border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#6B8E6B] focus:border-[#6B8E6B] focus:outline-none transition-all"
              disabled={isLoading}
            />
          </div>

          <div className="flex items-start gap-2.5 pt-2">
            <input
              type="checkbox"
              id="understand-cancel"
              checked={understandChecked}
              onChange={(e) => setUnderstandChecked(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded border-slate-200 text-[#6B8E6B] focus:ring-[#6B8E6B] cursor-pointer"
              disabled={isLoading}
            />
            <label htmlFor="understand-cancel" className="text-xs text-slate-500 font-semibold cursor-pointer select-none">
              I understand this will cancel my plan
            </label>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1 h-10 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer transition-all"
          >
            Keep Plan
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading || confirmText !== 'CANCEL' || !understandChecked}
            className="flex-1 h-10 rounded-lg bg-red-650 text-white hover:bg-red-700 text-xs font-semibold cursor-pointer transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none"
          >
            {isLoading && (
              <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            )}
            Cancel Subscription
          </button>
        </div>
      </div>
    </div>
  );
};
