'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatCurrencyCompact } from '@/lib/format';
import { useOptionalAuth } from '@/context/AuthContext';
import { setupFocusTrap } from '@/lib/a11y/focus-trap';

export interface ExpressInterestModalProps {
  deal: {
    id: string;
    slug: string;
    name?: string;
    propertyName?: string;
    minInvestment?: number;
    fundingTarget?: number;
    target?: number;
    committedAmount?: number;
    committed?: number;
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccessToast?: (msg: string) => void;
  initialMode?: 'commitment' | 'schedule';
}

export default function ExpressInterestModal({
  deal,
  isOpen,
  onClose,
  onSuccessToast,
  initialMode = 'commitment',
}: ExpressInterestModalProps) {
  let router: any = null;
  try {
    router = useRouter();
  } catch {
    // SSR / test environments without AppRouterContext
  }
  const auth = useOptionalAuth();
  const isAuthenticated = auth ? auth.authenticated && !auth.loading : true;

  const minInvestment = deal.minInvestment ?? 25000;
  const target = deal.fundingTarget ?? deal.target ?? 1000000;
  const committed = deal.committedAmount ?? deal.committed ?? 0;
  const remaining = Math.max(0, target - committed);

  // Tab mode
  const [activeTab, setActiveTab] = useState<'commitment' | 'schedule'>(initialMode);

  // Commitment fields
  const [amount, setAmount] = useState<string>(String(minInvestment));
  const [attested, setAttested] = useState(false);
  const [notes, setNotes] = useState('');
  const [alsoScheduleCall, setAlsoScheduleCall] = useState(false);

  // Meeting scheduler fields
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDateStr = tomorrow.toISOString().split('T')[0];

  const [preferredDate, setPreferredDate] = useState(defaultDateStr);
  const [timeSlot, setTimeSlot] = useState<'morning' | 'afternoon' | 'evening'>('morning');
  const [meetingFormat, setMeetingFormat] = useState<'google_meet' | 'phone' | 'in_person'>('google_meet');
  const [investorEmail, setInvestorEmail] = useState('investor@example.com');
  const [investorPhone, setInvestorPhone] = useState('');
  const [agenda, setAgenda] = useState('Underwriting assumptions and waterfall structure review');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedType, setSubmittedType] = useState<'commitment' | 'meeting' | 'both'>('commitment');

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const cleanup = setupFocusTrap({
      container: modalRef.current,
      isActive: isOpen,
      onClose,
    });
    return cleanup;
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const dealTitle = deal.propertyName || deal.name || 'Commercial Opportunity';

  const timeSlotLabels: Record<string, string> = {
    morning: 'Morning (9:00 AM - 12:00 PM EST)',
    afternoon: 'Afternoon (1:00 PM - 5:00 PM EST)',
    evening: 'Evening (5:00 PM - 7:00 PM EST)',
  };

  const formatLabels: Record<string, string> = {
    google_meet: 'Google Meet Video Call',
    phone: 'Direct Phone Call',
    in_person: 'In-Person Briefing',
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isAuthenticated) {
      router.push(`/login?next=/marketplace/${deal.slug || deal.id}`);
      return;
    }

    if (!preferredDate) {
      setError('Please select a preferred date for the meeting.');
      return;
    }

    if (!investorEmail || !investorEmail.includes('@')) {
      setError('Please provide a valid email address so the operator can send the invitation.');
      return;
    }

    setLoading(true);

    try {
      const content = `Meeting Request: Proposed for ${preferredDate} during ${timeSlotLabels[timeSlot]} via ${formatLabels[meetingFormat]}. Contact: ${investorEmail}${investorPhone ? ` (${investorPhone})` : ''}. Agenda: ${agenda || 'General deal discussion'}`;

      await fetch('/api/deals/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealId: deal.id,
          senderEmail: investorEmail,
          content,
          source: 'platform',
          meetingDetails: {
            preferredDate,
            timeSlot,
            format: meetingFormat,
            phone: investorPhone || undefined,
            agenda: agenda || undefined,
          },
        }),
      });

      // Save meeting notification to local Inbox
      const inboxKey = 'paperworking_inbox_items';
      const existingItems = JSON.parse(localStorage.getItem(inboxKey) || '[]');
      const newItem = {
        id: `meeting-${Date.now()}`,
        type: 'meeting_request',
        title: `Meeting Requested: ${dealTitle}`,
        body: `Meeting proposed for ${preferredDate} (${timeSlotLabels[timeSlot]}). Operator will confirm the calendar slot.`,
        dealId: deal.id,
        createdAt: new Date().toISOString(),
        unread: true,
      };
      localStorage.setItem(inboxKey, JSON.stringify([newItem, ...existingItems]));

      setSubmittedType('meeting');
      setSubmitted(true);
      onSuccessToast?.(`Meeting request sent to the operator of ${dealTitle}.`);
    } catch {
      setError('Unable to dispatch meeting request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCommitmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isAuthenticated) {
      router.push(`/login?next=/marketplace/${deal.slug || deal.id}`);
      return;
    }

    const numAmount = parseFloat(amount.replace(/[^0-9.]/g, ''));

    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid investment commitment amount.');
      return;
    }

    if (numAmount < minInvestment) {
      setError(`Minimum investment commitment is ${formatCurrency(minInvestment)}.`);
      return;
    }

    if (numAmount > remaining && remaining > 0) {
      setError(`Amount exceeds remaining allocation of ${formatCurrency(remaining)}.`);
      return;
    }

    if (!attested) {
      setError('You must attest to your accredited investor status under SEC Rule 506(c).');
      return;
    }

    setLoading(true);

    try {
      let content = `Soft Commitment of ${formatCurrency(numAmount)} submitted.`;
      if (alsoScheduleCall) {
        content += ` Investor also requested an introductory call on ${preferredDate} (${timeSlotLabels[timeSlot]} via ${formatLabels[meetingFormat]}).`;
      }
      if (notes) {
        content += ` Entity/Notes: ${notes}`;
      }

      await fetch('/api/deals/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealId: deal.id,
          senderEmail: investorEmail,
          content,
          source: 'platform',
          meetingDetails: alsoScheduleCall
            ? {
                preferredDate,
                timeSlot,
                format: meetingFormat,
                phone: investorPhone || undefined,
                agenda: notes || undefined,
              }
            : undefined,
        }),
      });

      // Dispatch to user's Inbox
      const inboxKey = 'paperworking_inbox_items';
      const existingItems = JSON.parse(localStorage.getItem(inboxKey) || '[]');
      const newItem = {
        id: `interest-${Date.now()}`,
        type: 'deal_interest',
        title: `Expressed Interest: ${dealTitle}`,
        body: `Soft commitment of ${formatCurrency(numAmount)} submitted.${alsoScheduleCall ? ` Meeting requested for ${preferredDate}.` : ''} The operator will contact you with offering documents.`,
        dealId: deal.id,
        amount: numAmount,
        createdAt: new Date().toISOString(),
        unread: true,
      };
      localStorage.setItem(inboxKey, JSON.stringify([newItem, ...existingItems]));

      setSubmittedType(alsoScheduleCall ? 'both' : 'commitment');
      setSubmitted(true);
      onSuccessToast?.(`Interest of ${formatCurrency(numAmount)} registered for ${dealTitle}.`);
    } catch {
      setError('An error occurred submitting your allocation request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      data-testid="express-interest-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="interest-modal-title"
        className="relative w-full max-w-lg rounded-2xl border border-white/15 bg-[#121014] p-6 shadow-2xl dropdown-entrance max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h2 id="interest-modal-title" className="text-lg font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-[var(--accent)]">
                {activeTab === 'commitment' ? 'verified_user' : 'calendar_clock'}
              </span>
              {activeTab === 'commitment' ? 'Express Soft Commitment' : 'Set up a time to talk'}
            </h2>
            <p className="text-xs text-[#9E9DA0] mt-0.5 truncate max-w-sm">
              {dealTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[#9E9DA0] hover:bg-white/10 hover:text-white"
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Tab Switcher */}
        {!submitted && (
          <div className="flex rounded-xl bg-white/5 p-1 mt-4 border border-white/10">
            <button
              type="button"
              data-testid="tab-commitment"
              onClick={() => setActiveTab('commitment')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition min-h-[40px] flex items-center justify-center gap-1.5 ${
                activeTab === 'commitment'
                  ? 'bg-[var(--accent)] text-black font-bold shadow'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">payments</span>
              <span>Express Commitment</span>
            </button>
            <button
              type="button"
              data-testid="tab-schedule"
              onClick={() => setActiveTab('schedule')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition min-h-[40px] flex items-center justify-center gap-1.5 ${
                activeTab === 'schedule'
                  ? 'bg-[var(--accent)] text-black font-bold shadow'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">schedule</span>
              <span>Set up a time to talk</span>
            </button>
          </div>
        )}

        {submitted ? (
          /* Success State */
          <div className="py-8 text-center space-y-4" data-testid="interest-success-state">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[var(--accent)]/30 bg-[var(--accent-subtle)] text-[var(--accent)]">
              <span className="material-symbols-outlined text-3xl">check_circle</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {submittedType === 'meeting'
                  ? 'Meeting Invitation Dispatched'
                  : submittedType === 'both'
                    ? 'Commitment & Meeting Proposal Dispatched'
                    : 'Interest Successfully Registered'}
              </h3>
              <p className="mt-1.5 text-xs text-[#9E9DA0] max-w-sm mx-auto leading-relaxed">
                {submittedType === 'meeting'
                  ? `Your request to meet on ${preferredDate} during ${timeSlotLabels[timeSlot]} has been transmitted to the operating partner.`
                  : 'A confirmation has been sent to your Inbox. The operator has been notified and will transmit subscription documents directly.'}
              </p>
            </div>
            <div className="pt-2">
              <Button
                variant="secondary"
                size="md"
                onClick={onClose}
                className="w-full justify-center min-h-[44px]"
              >
                Close &amp; Return to Deal
              </Button>
            </div>
          </div>
        ) : activeTab === 'commitment' ? (
          /* Commitment Form */
          <form onSubmit={handleCommitmentSubmit} noValidate className="mt-4 space-y-4">
            {error && (
              <div
                data-testid="interest-form-error"
                className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px] text-red-400">error</span>
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs">
              <div>
                <span className="text-[#9E9DA0] block text-[10px] uppercase font-bold">Min Investment</span>
                <span className="font-mono font-bold text-white mt-0.5 block">
                  {formatCurrency(minInvestment)}
                </span>
              </div>
              <div>
                <span className="text-[#9E9DA0] block text-[10px] uppercase font-bold">Remaining Allocation</span>
                <span className="font-mono font-bold text-[var(--accent)] mt-0.5 block">
                  {formatCurrencyCompact(remaining)}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="commitment-amount" className="block text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">
                Indicated Investment Amount ($) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-[#9E9DA0]">
                  $
                </span>
                <input
                  id="commitment-amount"
                  data-testid="commitment-amount-input"
                  type="number"
                  step="1000"
                  min={minInvestment}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  placeholder="e.g. 50000"
                  className="w-full rounded-xl border border-white/15 bg-white/[0.04] py-2.5 pl-8 pr-4 font-mono text-sm text-white placeholder:text-white/30 outline-none focus:border-[var(--accent)] min-h-[44px]"
                />
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  data-testid="accreditation-checkbox"
                  checked={attested}
                  onChange={(e) => setAttested(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/10 text-[var(--accent)] focus:ring-[var(--accent)] accent-[var(--accent)]"
                />
                <span className="text-xs text-[#fdfffc]/90 leading-snug">
                  I attest that I am an <strong>Accredited Investor</strong> under Rule 506(c) of SEC
                  Regulation D (net worth &gt; $1M excluding primary residence, or income &gt; $200k/$300k).
                </span>
              </label>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="commitment-notes" className="block text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">
                Notes or Entity Name (Optional)
              </label>
              <textarea
                id="commitment-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="e.g. Investing via Family Trust or LLC"
                className="w-full rounded-xl border border-white/15 bg-white/[0.04] p-3 text-xs text-white placeholder:text-white/30 outline-none focus:border-[var(--accent)]"
              />
            </div>

            {/* Optional inline meeting request toggle */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  data-testid="schedule-call-toggle"
                  checked={alsoScheduleCall}
                  onChange={(e) => setAlsoScheduleCall(e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-white/10 text-[var(--accent)] focus:ring-[var(--accent)] accent-[var(--accent)]"
                />
                <span className="text-xs font-semibold text-white">
                  Also set up a time to talk with the operator
                </span>
              </label>

              {alsoScheduleCall && (
                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-white/50 mb-1">
                      Target Date
                    </label>
                    <input
                      type="date"
                      min={defaultDateStr}
                      value={preferredDate}
                      onChange={(e) => setPreferredDate(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-white/5 p-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-white/50 mb-1">
                      Time Slot
                    </label>
                    <select
                      value={timeSlot}
                      onChange={(e) => setTimeSlot(e.target.value as any)}
                      className="w-full rounded-lg border border-white/10 bg-[#16141a] p-2 text-xs text-white focus:outline-none"
                    >
                      <option value="morning">Morning (9am - 12pm)</option>
                      <option value="afternoon">Afternoon (1pm - 5pm)</option>
                      <option value="evening">Evening (5pm - 7pm)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <Button
                type="button"
                variant="tertiary"
                size="md"
                onClick={onClose}
                disabled={loading}
                className="min-h-[44px]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={loading}
                data-testid="submit-interest-btn"
                className="min-w-[150px] justify-center min-h-[44px]"
              >
                {loading ? 'Submitting…' : 'Submit Interest'}
              </Button>
            </div>
          </form>
        ) : (
          /* Meeting Scheduler Form: "Set up a time to talk" */
          <form onSubmit={handleScheduleSubmit} noValidate className="mt-4 space-y-4">
            {error && (
              <div
                data-testid="scheduler-form-error"
                className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px] text-red-400">error</span>
                <span>{error}</span>
              </div>
            )}

            <div className="rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/[0.04] p-3 text-xs text-white/80 flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px] text-[var(--accent)] shrink-0">
                event_available
              </span>
              <p>
                Propose a time to speak directly with the operating partner regarding deal strategy, waterfall hurdle terms, and subscription steps.
              </p>
            </div>

            {/* Date Selection */}
            <div className="space-y-1.5">
              <label htmlFor="pref-date" className="block text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">
                Preferred Date *
              </label>
              <input
                id="pref-date"
                data-testid="preferred-date-input"
                type="date"
                min={defaultDateStr}
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                required
                className="w-full rounded-xl border border-white/15 bg-white/[0.04] p-2.5 text-xs text-white outline-none focus:border-[var(--accent)] min-h-[44px]"
              />
            </div>

            {/* Time Slot Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">
                Proposed Time Slot *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(['morning', 'afternoon', 'evening'] as const).map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    data-testid={`time-slot-${slot}`}
                    onClick={() => setTimeSlot(slot)}
                    className={`rounded-xl border p-2.5 text-center text-xs font-semibold transition min-h-[44px] flex flex-col justify-center items-center ${
                      timeSlot === slot
                        ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-white'
                        : 'border-white/10 bg-white/[0.02] text-white/50 hover:text-white'
                    }`}
                  >
                    <span className="capitalize">{slot}</span>
                    <span className="text-[10px] opacity-70">
                      {slot === 'morning' ? '9am-12pm' : slot === 'afternoon' ? '1pm-5pm' : '5pm-7pm'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Meeting Format */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">
                Meeting Format *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'google_meet', label: 'Google Meet', icon: 'videocam' },
                  { id: 'phone', label: 'Phone Call', icon: 'call' },
                  { id: 'in_person', label: 'In-Person', icon: 'groups' },
                ].map((fmt) => (
                  <button
                    key={fmt.id}
                    type="button"
                    data-testid={`meeting-format-${fmt.id}`}
                    onClick={() => setMeetingFormat(fmt.id as any)}
                    className={`rounded-xl border p-2.5 text-center text-xs font-semibold transition min-h-[44px] flex items-center justify-center gap-1.5 ${
                      meetingFormat === fmt.id
                        ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-white'
                        : 'border-white/10 bg-white/[0.02] text-white/50 hover:text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">{fmt.icon}</span>
                    <span>{fmt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Contact details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="inv-email" className="block text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">
                  Your Email *
                </label>
                <input
                  id="inv-email"
                  data-testid="investor-email-input"
                  type="email"
                  value={investorEmail}
                  onChange={(e) => setInvestorEmail(e.target.value)}
                  required
                  placeholder="name@fund.com"
                  className="w-full rounded-xl border border-white/15 bg-white/[0.04] p-2.5 text-xs text-white outline-none focus:border-[var(--accent)] min-h-[44px]"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="inv-phone" className="block text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">
                  Phone (Optional)
                </label>
                <input
                  id="inv-phone"
                  data-testid="investor-phone-input"
                  type="tel"
                  value={investorPhone}
                  onChange={(e) => setInvestorPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full rounded-xl border border-white/15 bg-white/[0.04] p-2.5 text-xs text-white outline-none focus:border-[var(--accent)] min-h-[44px]"
                />
              </div>
            </div>

            {/* Agenda / Questions */}
            <div className="space-y-1.5">
              <label htmlFor="meeting-agenda" className="block text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">
                Discussion Agenda / Questions
              </label>
              <textarea
                id="meeting-agenda"
                data-testid="meeting-agenda-input"
                value={agenda}
                onChange={(e) => setAgenda(e.target.value)}
                rows={2}
                placeholder="Topics you'd like to cover..."
                className="w-full rounded-xl border border-white/15 bg-white/[0.04] p-3 text-xs text-white placeholder:text-white/30 outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <Button
                type="button"
                variant="tertiary"
                size="md"
                onClick={onClose}
                disabled={loading}
                className="min-h-[44px]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={loading}
                data-testid="submit-meeting-btn"
                className="min-w-[170px] justify-center min-h-[44px]"
              >
                {loading ? 'Transmitting…' : 'Request Meeting'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
