'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, CalendarPlus, X, CurrencyDollar, Clock, CheckCircle, WarningCircle, VideoCamera, Phone, Users, CalendarCheck } from '@phosphor-icons/react';
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
        className="relative w-full max-w-lg rounded-none border border-neutral-800 bg-neutral-950 p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div>
            <h2 id="interest-modal-title" className="text-lg font-semibold text-white flex items-center gap-2">
              {activeTab === 'commitment' ? (
                <ShieldCheck className="h-5 w-5 text-neutral-300" />
              ) : (
                <CalendarPlus className="h-5 w-5 text-neutral-300" />
              )}
              {activeTab === 'commitment' ? 'Express Soft Commitment' : 'Set up a time to talk'}
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5 truncate max-w-sm">
              {dealTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-none p-1 text-neutral-400 hover:bg-neutral-900 hover:text-white transition"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        {!submitted && (
          <div className="flex rounded-none bg-neutral-900 p-1 mt-4 border border-neutral-800">
            <button
              type="button"
              data-testid="tab-commitment"
              onClick={() => setActiveTab('commitment')}
              className={`flex-1 py-2 text-xs font-medium rounded-none transition min-h-[40px] flex items-center justify-center gap-1.5 ${
                activeTab === 'commitment'
                  ? 'bg-neutral-800 text-white font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <CurrencyDollar className="h-4 w-4" />
              <span>Express Commitment</span>
            </button>
            <button
              type="button"
              data-testid="tab-schedule"
              onClick={() => setActiveTab('schedule')}
              className={`flex-1 py-2 text-xs font-medium rounded-none transition min-h-[40px] flex items-center justify-center gap-1.5 ${
                activeTab === 'schedule'
                  ? 'bg-neutral-800 text-white font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>Set up a time to talk</span>
            </button>
          </div>
        )}

        {(auth?.profile?.accountType || '').toLowerCase() === 'vendor' && !submitted && (
          <div
            data-testid="vendor-equity-restriction-notice"
            className="mt-3 rounded-none border border-amber-500/30 bg-amber-950/20 p-3 text-xs text-amber-300"
          >
            <strong>Vendor Notice:</strong> Equity commitments on the Deals Marketplace are reserved for accredited Investors and Investment Teams. As a registered Vendor, please use &quot;Offer Services&quot; on the deal card to submit your trade or professional bids to this operator.
          </div>
        )}

        {submitted ? (
          /* Success State */
          <div className="py-8 text-center space-y-4" data-testid="interest-success-state">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-none border border-neutral-700 bg-neutral-900 text-white">
              <CheckCircle className="h-8 w-8 text-neutral-200" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                {submittedType === 'meeting'
                  ? 'Meeting Invitation Dispatched'
                  : submittedType === 'both'
                    ? 'Commitment & Meeting Proposal Dispatched'
                    : 'Interest Successfully Registered'}
              </h3>
              <p className="mt-1.5 text-xs text-neutral-400 max-w-sm mx-auto leading-relaxed">
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
                className="w-full justify-center min-h-[44px] rounded-none"
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
                className="rounded-none border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200 flex items-center gap-2"
              >
                <WarningCircle className="h-4 w-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 rounded-none border border-neutral-800 bg-neutral-900/40 p-3 text-xs">
              <div>
                <span className="text-neutral-400 block text-[10px] uppercase font-semibold">Min Investment</span>
                <span className="font-mono font-semibold text-white mt-0.5 block">
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
              <label htmlFor="commitment-amount" className="block text-xs font-medium uppercase tracking-wider text-neutral-400">
                Indicated Investment Amount ($) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-medium text-neutral-400">
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
                  className="w-full rounded-none border border-neutral-800 bg-neutral-900 py-2.5 pl-8 pr-4 font-mono text-base md:text-sm text-white placeholder:text-neutral-500 outline-none focus:border-neutral-500 min-h-[44px]"
                />
              </div>
            </div>

            <div className="rounded-none border border-neutral-800 bg-neutral-900/30 p-3.5 space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  data-testid="accreditation-checkbox"
                  checked={attested}
                  onChange={(e) => setAttested(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded-none border-neutral-700 bg-neutral-900 text-neutral-100 accent-neutral-100 focus:outline-none"
                />
                <span className="text-xs text-neutral-300 leading-snug">
                  I attest that I am an <strong>Accredited Investor</strong> under Rule 506(c) of SEC
                  Regulation D (net worth &gt; $1M excluding primary residence, or income &gt; $200k/$300k).
                </span>
              </label>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="commitment-notes" className="block text-xs font-medium uppercase tracking-wider text-neutral-400">
                Notes or Entity Name (Optional)
              </label>
              <textarea
                id="commitment-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="e.g. Investing via Family Trust or LLC"
                className="w-full rounded-none border border-neutral-800 bg-neutral-900 p-3 text-base md:text-xs text-white placeholder:text-neutral-500 outline-none focus:border-neutral-500"
              />
            </div>

            {/* Optional inline meeting request toggle */}
            <div className="rounded-none border border-neutral-800 bg-neutral-900/30 p-3 space-y-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  data-testid="schedule-call-toggle"
                  checked={alsoScheduleCall}
                  onChange={(e) => setAlsoScheduleCall(e.target.checked)}
                  className="h-4 w-4 rounded-none border-neutral-700 bg-neutral-900 text-neutral-100 accent-neutral-100 focus:outline-none"
                />
                <span className="text-xs font-medium text-white">
                  Also set up a time to talk with the operator
                </span>
              </label>

              {alsoScheduleCall && (
                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] uppercase font-medium text-neutral-400 mb-1">
                      Target Date
                    </label>
                    <input
                      type="date"
                      min={defaultDateStr}
                      value={preferredDate}
                      onChange={(e) => setPreferredDate(e.target.value)}
                      className="w-full rounded-none border border-neutral-800 bg-neutral-900 p-2 text-base md:text-xs text-white focus:outline-none min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-medium text-neutral-400 mb-1">
                      Time Slot
                    </label>
                    <select
                      value={timeSlot}
                      onChange={(e) => setTimeSlot(e.target.value as any)}
                      className="w-full rounded-none border border-neutral-800 bg-neutral-900 p-2 text-base md:text-xs text-white focus:outline-none min-h-[44px]"
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
                className="rounded-none border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200 flex items-center gap-2"
              >
                <WarningCircle className="h-4 w-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="rounded-none border border-neutral-800 bg-neutral-900/40 p-3 text-xs text-neutral-300 flex items-start gap-2">
              <CalendarCheck className="h-4 w-4 text-neutral-300 shrink-0 mt-0.5" />
              <p>
                Propose a time to speak directly with the operating partner regarding deal strategy, waterfall hurdle terms, and subscription steps.
              </p>
            </div>

            {/* Date Selection */}
            <div className="space-y-1.5">
              <label htmlFor="pref-date" className="block text-xs font-medium uppercase tracking-wider text-neutral-400">
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
                className="w-full rounded-none border border-neutral-800 bg-neutral-900 p-2.5 text-base md:text-xs text-white outline-none focus:border-neutral-500 min-h-[44px]"
              />
            </div>

            {/* Time Slot Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium uppercase tracking-wider text-neutral-400">
                Proposed Time Slot *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(['morning', 'afternoon', 'evening'] as const).map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    data-testid={`time-slot-${slot}`}
                    onClick={() => setTimeSlot(slot)}
                    className={`rounded-none border p-2.5 text-center text-xs font-medium transition min-h-[44px] flex flex-col justify-center items-center ${
                      timeSlot === slot
                        ? 'border-neutral-500 bg-neutral-800 text-white font-semibold'
                        : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white'
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
              <label className="block text-xs font-medium uppercase tracking-wider text-neutral-400">
                Meeting Format *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'google_meet', label: 'Google Meet', icon: VideoCamera },
                  { id: 'phone', label: 'Phone Call', icon: Phone },
                  { id: 'in_person', label: 'In-Person', icon: Users },
                ].map((fmt) => {
                  const Icon = fmt.icon;
                  return (
                    <button
                      key={fmt.id}
                      type="button"
                      data-testid={`meeting-format-${fmt.id}`}
                      onClick={() => setMeetingFormat(fmt.id as any)}
                      className={`rounded-none border p-2.5 text-center text-xs font-medium transition min-h-[44px] flex items-center justify-center gap-1.5 ${
                        meetingFormat === fmt.id
                          ? 'border-neutral-500 bg-neutral-800 text-white font-semibold'
                          : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{fmt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Contact details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="inv-email" className="block text-xs font-medium uppercase tracking-wider text-neutral-400">
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
                  className="w-full rounded-none border border-neutral-800 bg-neutral-900 p-2.5 text-base md:text-xs text-white outline-none focus:border-neutral-500 min-h-[44px]"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="inv-phone" className="block text-xs font-medium uppercase tracking-wider text-neutral-400">
                  Phone (Optional)
                </label>
                <input
                  id="inv-phone"
                  data-testid="investor-phone-input"
                  type="tel"
                  value={investorPhone}
                  onChange={(e) => setInvestorPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full rounded-none border border-neutral-800 bg-neutral-900 p-2.5 text-base md:text-xs text-white outline-none focus:border-neutral-500 min-h-[44px]"
                />
              </div>
            </div>

            {/* Agenda / Questions */}
            <div className="space-y-1.5">
              <label htmlFor="meeting-agenda" className="block text-xs font-medium uppercase tracking-wider text-neutral-400">
                Discussion Agenda / Questions
              </label>
              <textarea
                id="meeting-agenda"
                data-testid="meeting-agenda-input"
                value={agenda}
                onChange={(e) => setAgenda(e.target.value)}
                rows={2}
                placeholder="Topics you'd like to cover..."
                className="w-full rounded-none border border-neutral-800 bg-neutral-900 p-3 text-base md:text-xs text-white placeholder:text-neutral-500 outline-none focus:border-neutral-500"
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
