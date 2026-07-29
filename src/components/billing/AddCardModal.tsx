import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { X, CreditCard } from 'lucide-react';

const cardInputSchema = z.object({
  nameOnCard: z.string().min(2, 'Name must be at least 2 characters'),
  cardNumber: z.string().regex(/^\d{16}$/, 'Card number must be exactly 16 digits'),
  expiry: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'Invalid expiration date. Use MM/YY format.'),
  cvc: z.string().regex(/^\d{3,4}$/, 'CVC must be 3 or 4 digits'),
});

type CardInputValues = z.infer<typeof cardInputSchema>;

interface AddCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: CardInputValues) => Promise<void>;
}

export const AddCardModal: React.FC<AddCardModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CardInputValues>({
    resolver: zodResolver(cardInputSchema),
    defaultValues: {
      nameOnCard: '',
      cardNumber: '',
      expiry: '',
      cvc: '',
    },
  });

  if (!isOpen) return null;

  const handleFormSubmit = async (values: CardInputValues) => {
    await onSubmit(values);
    reset();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl p-6 border border-slate-200 shadow-2xl relative">
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-650 p-1.5 hover:bg-slate-50 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1 text-slate-900">
            <CreditCard className="w-5 h-5 text-slate-500" />
            <h3 className="text-lg font-bold">Add Payment Card</h3>
          </div>
          <p className="text-xs text-slate-400">Enter your credit or debit card details below.</p>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Name on Card
            </label>
            <input
              type="text"
              {...register('nameOnCard')}
              placeholder="John Doe"
              className="w-full text-sm px-4 h-10 rounded-lg border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#6B8E6B] focus:border-[#6B8E6B] focus:outline-none transition-all"
              required
            />
            {errors.nameOnCard && (
              <p className="text-[11px] text-red-650 mt-1">{errors.nameOnCard.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Card Number
            </label>
            <input
              type="text"
              {...register('cardNumber')}
              placeholder="4242424242424242"
              maxLength={16}
              className="w-full text-sm px-4 h-10 rounded-lg border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#6B8E6B] focus:border-[#6B8E6B] focus:outline-none transition-all"
              required
            />
            {errors.cardNumber && (
              <p className="text-[11px] text-red-650 mt-1">{errors.cardNumber.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Expiration
              </label>
              <input
                type="text"
                {...register('expiry')}
                placeholder="MM/YY"
                maxLength={5}
                className="w-full text-sm px-4 h-10 rounded-lg border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#6B8E6B] focus:border-[#6B8E6B] focus:outline-none transition-all"
                required
              />
              {errors.expiry && (
                <p className="text-[11px] text-red-650 mt-1">{errors.expiry.message}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                CVC
              </label>
              <input
                type="password"
                {...register('cvc')}
                placeholder="123"
                maxLength={4}
                className="w-full text-sm px-4 h-10 rounded-lg border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#6B8E6B] focus:border-[#6B8E6B] focus:outline-none transition-all"
                required
              />
              {errors.cvc && (
                <p className="text-[11px] text-red-650 mt-1">{errors.cvc.message}</p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-10 px-4 py-2 rounded-lg bg-[#6B8E6B] hover:bg-[#557255] text-white text-xs font-semibold active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
          >
            {isSubmitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Adding Card...
              </>
            ) : (
              'Add Payment Card'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
