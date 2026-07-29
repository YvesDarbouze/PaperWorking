'use client';

import React, { useState } from 'react';
import { Calendar, AlertTriangle, RefreshCw, Loader2, Check, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { Notification } from '@/types/notification';

interface MissedRentAlertCardProps {
  item: Notification;
  onActionComplete: () => Promise<void>;
}

export default function MissedRentAlertCard({
  item,
  onActionComplete,
}: MissedRentAlertCardProps) {
  const { user } = useAuth();
  
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  const metadata = item.objectReference?.metadata || {};
  const expectedDateStr = metadata.expectedDate as string || '';
  const expectedAmount = Number(metadata.expectedAmount || 0);

  // Parse expected date
  const expectedDate = expectedDateStr ? new Date(expectedDateStr) : new Date();
  
  // Calculate days overdue
  const today = new Date();
  const diffTime = Math.max(0, today.getTime() - expectedDate.getTime());
  const daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Format expected amount
  const formattedAmount = expectedAmount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  // Format expected date
  const formattedExpectedDate = expectedDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Handle action calls
  const handleAction = async (action: 'confirm_paid' | 'mark_late' | 'search_again') => {
    setSubmitting(true);
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch(`/api/inbox/${item.id}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          action,
          paidDate: action === 'confirm_paid' ? paymentDate : undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (action === 'search_again') {
          if (data.rentFound) {
            toast.success(data.message || 'Rent payment successfully found!', {
              style: { background: '#0d0d0d', color: '#fff' },
            });
            await onActionComplete();
          } else {
            toast.error(data.message || 'No matching rent transaction found in Plaid sync.');
          }
        } else {
          toast.success(data.message || 'Action executed successfully!', {
            style: { background: '#0d0d0d', color: '#fff' },
          });
          await onActionComplete();
        }
      } else {
        toast.error(data.error || 'Failed to execute action');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error executing alert action');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#D9A74A]/5 border border-[#D9A74A]/10 rounded-xl p-4.5 space-y-4 text-sm text-[#9E9DA0] glassmorphic">
      
      {/* Alert Header info */}
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-[#D9A74A]/10 border border-[#D9A74A]/20 text-[#D9A74A] flex-shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="space-y-1 flex-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#D9A74A]">Missed Rent Alert</span>
          <h4 className="text-white font-semibold text-[15px]">{item.title}</h4>
          <p className="text-xs leading-relaxed text-[#9E9DA0]">{item.body}</p>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-3 gap-2.5 bg-white/3 border border-white/5 rounded-xl p-3 text-xs text-[#9E9DA0]">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase font-medium tracking-wider text-[#6c6b6e]">Expected Amount</span>
          <strong className="text-white text-sm">{formattedAmount}</strong>
        </div>
        <div className="flex flex-col gap-1 border-l border-white/5 pl-2.5">
          <span className="text-[10px] uppercase font-medium tracking-wider text-[#6c6b6e]">Expected Due Date</span>
          <strong className="text-white text-sm">{formattedExpectedDate}</strong>
        </div>
        <div className="flex flex-col gap-1 border-l border-white/5 pl-2.5">
          <span className="text-[10px] uppercase font-medium tracking-wider text-[#D9A74A]">Days Overdue</span>
          <strong className="text-[#D9A74A] text-sm flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {daysOverdue} days
          </strong>
        </div>
      </div>

      {/* Inline payment date form */}
      {showDatePicker && (
        <div className="p-3.5 bg-white/5 border border-white/5 rounded-xl space-y-3.5 animate-fadeIn">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="paymentDateInput" className="text-[10px] uppercase font-bold tracking-wider text-white">
              Actual Date Paid
            </label>
            <input
              id="paymentDateInput"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full bg-[#121014] text-white border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#D9A74A]/40 transition-colors"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAction('confirm_paid')}
              disabled={submitting}
              className="flex-1 px-3 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-[#D9A74A] text-black hover:brightness-110 active:scale-97 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Confirm Payment
            </button>
            <button
              onClick={() => setShowDatePicker(false)}
              disabled={submitting}
              className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-white/10 text-white hover:bg-white/5 active:scale-97 disabled:opacity-50 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* CTAs */}
      {!showDatePicker && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            onClick={() => setShowDatePicker(true)}
            disabled={submitting}
            className="px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-[#D9A74A] text-black hover:brightness-110 active:scale-97 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5" />
            Confirm Paid
          </button>

          <button
            onClick={() => handleAction('mark_late')}
            disabled={submitting}
            className="px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-[#D9A74A]/20 text-[#D9A74A] hover:bg-[#D9A74A]/5 active:scale-97 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5" />
            Mark Late
          </button>

          <button
            onClick={() => handleAction('search_again')}
            disabled={submitting}
            className="px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-[#9E9DA0] active:scale-97 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer ml-auto"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#9E9DA0]" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 text-[#9E9DA0]" />
            )}
            Search Plaid Again
          </button>
        </div>
      )}
    </div>
  );
}
