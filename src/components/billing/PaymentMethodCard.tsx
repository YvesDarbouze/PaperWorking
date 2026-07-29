import React from 'react';
import { CreditCard, Plus, Check } from 'lucide-react';
import { PaymentMethod } from '@/types/Billing';

interface PaymentMethodCardProps {
  paymentMethods: PaymentMethod[];
  onAddCardClick: () => void;
  onSetDefault: (id: string) => void;
  onRemoveCard: (id: string) => void;
}

export const PaymentMethodCard: React.FC<PaymentMethodCardProps> = ({
  paymentMethods,
  onAddCardClick,
  onSetDefault,
  onRemoveCard,
}) => {
  return (
    <div className="bg-white border border-slate-100 rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-slate-500" />
          <h3 className="text-base font-semibold text-slate-900">Payment Method</h3>
        </div>
        <button
          onClick={onAddCardClick}
          className="h-8 px-3 rounded-lg bg-[#6B8E6B]/10 text-[#557255] hover:bg-[#6B8E6B]/20 transition-all text-xs font-semibold flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Add New
        </button>
      </div>

      {paymentMethods.length === 0 ? (
        <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl space-y-4">
          <CreditCard className="w-8 h-8 mx-auto text-slate-300" />
          <p className="text-xs text-slate-500">
            No payment methods on file. Add a card to avoid interruption.
          </p>
          <button
            onClick={onAddCardClick}
            className="h-9 px-4 rounded-lg bg-[#6B8E6B] hover:bg-[#557255] text-white text-xs font-semibold transition-colors duration-200"
          >
            Add Payment Method
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {paymentMethods.map((pm) => (
            <div
              key={pm.id}
              className="py-4 border-b border-slate-100 last:border-0 flex items-center justify-between gap-4 text-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-6 bg-slate-50 border border-slate-200 rounded flex items-center justify-center font-mono text-[9px] font-bold text-slate-500 uppercase select-none">
                  {pm.brand}
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800">•••• {pm.last4}</p>
                  <p className="text-[10px] text-slate-400 font-normal">
                    Exp: {String(pm.expMonth).padStart(2, '0')}/{String(pm.expYear).slice(-2)}
                  </p>
                </div>
                {pm.isDefault && (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 bg-[#6B8E6B]/10 text-[#557255] rounded-md border border-[#6B8E6B]/20 ml-2 flex items-center gap-0.5">
                    <Check className="w-2.5 h-2.5" /> Default
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs font-semibold">
                {!pm.isDefault && (
                  <button
                    onClick={() => onSetDefault(pm.id)}
                    className="text-[#6B8E6B] hover:text-[#557255] hover:underline cursor-pointer"
                  >
                    Set as Default
                  </button>
                )}
                <button
                  onClick={() => onRemoveCard(pm.id)}
                  className="text-red-650 hover:underline cursor-pointer"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
