import React from 'react';
import { X, Check } from 'lucide-react';
import { Plan } from '@/types/Plan';

interface ChangePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  planCards: Plan[];
  currentPlanId: string;
  currentPriceNum: number;
  checkoutLoading: string | null;
  onPlanChange: (planId: string) => void;
}

export const ChangePlanModal: React.FC<ChangePlanModalProps> = ({
  isOpen,
  onClose,
  planCards,
  currentPlanId,
  currentPriceNum,
  checkoutLoading,
  onPlanChange,
}) => {
  const [downgradePlanId, setDowngradePlanId] = React.useState<string | null>(null);

  if (!isOpen) return null;

  if (downgradePlanId) {
    const targetPlan = planCards.find((p) => p.id === downgradePlanId);
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="bg-white w-full max-w-md rounded-2xl p-6 border border-slate-200 shadow-2xl relative space-y-4">
          <h3 className="text-base font-bold text-slate-900">Confirm Downgrade</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Downgrading your plan to <strong>{targetPlan?.label}</strong> will take effect immediately. 
            Prorated credits for the remaining time on your current plan will be applied to your account billing balance.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setDowngradePlanId(null)}
              className="h-9 px-4 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onPlanChange(downgradePlanId);
                setDowngradePlanId(null);
              }}
              className="h-9 px-4 rounded-lg bg-[#6B8E6B] hover:bg-[#557255] text-white text-xs font-semibold cursor-pointer"
            >
              Confirm Downgrade
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-[900px] rounded-2xl p-6 border border-slate-200 shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-650 p-1.5 hover:bg-slate-50 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-2 pb-2">
          <h3 className="text-lg font-bold text-slate-900">Change Subscription Plan</h3>
          <p className="text-xs text-slate-450">
            Select a plan that fits your real estate portfolio workflow.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {planCards.map((planCard) => {
            const isCurrent = planCard.id === currentPlanId;
            const isRecommended = planCard.recommended;
            const isUpgrade = planCard.priceNum > currentPriceNum;
            const loadingThis = checkoutLoading === planCard.id;

            return (
              <div
                key={planCard.id}
                className={`relative flex flex-col justify-between rounded-xl border p-5 bg-white transition-all ${
                  isCurrent
                    ? 'border-[#6B8E6B] ring-1 ring-[#6B8E6B] bg-slate-50/20'
                    : isRecommended
                    ? 'border-slate-200 shadow-md ring-1 ring-slate-100'
                    : 'border-slate-150 hover:border-slate-350'
                }`}
              >
                {isRecommended && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-[#6B8E6B] rounded-t-xl" />
                )}

                {/* Badges */}
                <div className="absolute top-3 right-3 flex gap-1">
                  {isCurrent && (
                    <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 bg-[#6B8E6B]/10 text-[#557255] rounded border border-[#6B8E6B]/20">
                      Current
                    </span>
                  )}
                  {isRecommended && !isCurrent && (
                    <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 bg-[#6B8E6B] text-white rounded">
                      Popular
                    </span>
                  )}
                </div>

                <div className="mb-4 mt-2">
                  <h4 className="text-sm font-semibold text-slate-900">{planCard.label}</h4>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed min-h-[30px]">
                    {planCard.description}
                  </p>
                  <p className="text-xl font-extrabold text-slate-900 mt-3">{planCard.price}</p>
                </div>

                <ul className="space-y-2 mb-6 flex-1 text-[11px]">
                  {planCard.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 text-slate-650 leading-relaxed">
                      <Check className="w-3 h-3 text-[#6B8E6B] shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => {
                    if (!isCurrent) {
                      if (planCard.priceNum < currentPriceNum) {
                        setDowngradePlanId(planCard.id);
                      } else {
                        onPlanChange(planCard.id);
                      }
                    }
                  }}
                  disabled={isCurrent || !!checkoutLoading}
                  className={`w-full h-9 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    isCurrent
                      ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                      : 'bg-[#6B8E6B] hover:bg-[#557255] text-white disabled:opacity-50'
                  }`}
                >
                  {loadingThis && (
                    <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  )}
                  {isCurrent ? 'Current Plan' : isUpgrade ? 'Upgrade' : 'Downgrade'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
