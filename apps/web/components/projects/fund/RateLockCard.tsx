'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/projects/phase-utils';
import type { RateLockDetails } from '@/lib/projects/types';

export interface RateLockCardProps {
  rateLock?: RateLockDetails;
  currentUnderwritingRate?: number;
  lenderName?: string;
  onUpdateRateLock: (updated: RateLockDetails) => void;
}

export default function RateLockCard({
  rateLock: initialRateLock,
  currentUnderwritingRate = 6.875,
  lenderName = 'Apex Commercial Capital',
  onUpdateRateLock,
}: RateLockCardProps) {
  const defaultRateLock: RateLockDetails = useMemo(() => {
    if (initialRateLock) return initialRateLock;
    return {
      status: 'floating',
      lockedRatePct: currentUnderwritingRate,
      lockPeriodDays: 45,
    };
  }, [initialRateLock, currentUnderwritingRate]);

  const [rateLock, setRateLock] = useState<RateLockDetails>(defaultRateLock);
  const [isEditing, setIsEditing] = useState(false);
  const [formRate, setFormRate] = useState<number>(rateLock.lockedRatePct || currentUnderwritingRate);
  const [formDays, setFormDays] = useState<number>(rateLock.lockPeriodDays || 45);
  const [formPoints, setFormPoints] = useState<number>(rateLock.pointsOrFeeAmount || 0);
  const [formConfNum, setFormConfNum] = useState<string>(rateLock.lenderConfirmationNumber || '');
  const [formAgreementName, setFormAgreementName] = useState<string>(
    rateLock.agreementDocumentName || ''
  );

  // Compute expiration timestamp & countdown
  const countdown = useMemo(() => {
    if (rateLock.status !== 'locked' || !rateLock.expirationDate) return null;
    const now = Date.now();
    const expTime = new Date(rateLock.expirationDate).getTime();
    const diffMs = expTime - now;
    if (diffMs <= 0) return { isExpired: true, daysLeft: 0, hoursLeft: 0 };
    const daysLeft = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hoursLeft = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return { isExpired: false, daysLeft, hoursLeft };
  }, [rateLock]);

  const handleConfirmLock = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date();
    const expDate = new Date();
    expDate.setDate(now.getDate() + (Number(formDays) || 45));

    const updated: RateLockDetails = {
      status: 'locked',
      lockedRatePct: Number(formRate),
      lockExecutionDate: now.toISOString(),
      expirationDate: expDate.toISOString(),
      lockPeriodDays: Number(formDays),
      pointsOrFeeAmount: Number(formPoints),
      lenderConfirmationNumber: formConfNum.trim() || `RL-${Math.floor(10000 + Math.random() * 90000)}`,
      agreementDocumentName: formAgreementName.trim() || 'Lender_Rate_Lock_Agreement.pdf',
      agreementDocumentUrl: '/documents/rate_lock_agreement.pdf',
    };

    setRateLock(updated);
    onUpdateRateLock(updated);
    setIsEditing(false);
  };

  const handleUnlockRate = () => {
    const updated: RateLockDetails = {
      status: 'floating',
      lockedRatePct: currentUnderwritingRate,
      lockPeriodDays: 45,
    };
    setRateLock(updated);
    onUpdateRateLock(updated);
  };

  const isLocked = rateLock.status === 'locked' && !countdown?.isExpired;
  const isExpired = rateLock.status === 'expired' || countdown?.isExpired;

  return (
    <div
      data-testid="rate-lock-card"
      className="w-full rounded-none border border-neutral-800 bg-[#0a0a0a] p-5 font-sans text-neutral-100"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-none px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                isLocked
                  ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                  : isExpired
                  ? 'border border-rose-500/30 bg-rose-500/10 text-rose-400'
                  : 'border border-amber-500/30 bg-amber-500/10 text-amber-400'
              }`}
            >
              {isLocked ? 'Interest Rate Locked' : isExpired ? 'Rate Lock Expired' : 'Floating (Unlocked)'}
            </span>
            <span className="text-xs text-neutral-400">Lender: <strong className="text-white">{lenderName}</strong></span>
          </div>
          <h3 className="mt-1 text-base font-bold text-white tracking-tight">
            Mortgage Interest Rate Lock Controller
          </h3>
          <p className="mt-0.5 text-xs text-neutral-400">
            Confirm and freeze the loan interest rate to eliminate debt service volatility before the closing table.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isEditing && (
            <Button
              type="button"
              variant={isLocked ? 'secondary' : 'primary'}
              size="sm"
              className="rounded-none min-h-[44px] px-4 text-xs"
              onClick={() => setIsEditing(true)}
              data-testid="toggle-rate-lock-btn"
            >
              <span className="material-symbols-outlined text-[16px] mr-1.5">
                {isLocked ? 'edit' : 'lock'}
              </span>
              {isLocked ? 'Modify Lock Terms' : 'Freeze & Lock Rate'}
            </Button>
          )}
        </div>
      </div>

      {/* Expiration Countdown Banner */}
      {isLocked && countdown && !countdown.isExpired && (
        <div
          data-testid="rate-lock-countdown-banner"
          className={`mt-4 flex items-center justify-between rounded-none border p-3.5 text-xs ${
            countdown.daysLeft <= 7
              ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
              : 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">timer</span>
            <span>
              <strong>Rate Freeze Active:</strong> {countdown.daysLeft} days, {countdown.hoursLeft} hours remaining until lock expires.
            </span>
          </div>
          <span className="text-[11px] font-mono text-neutral-300">
            Expires {new Date(rateLock.expirationDate!).toLocaleDateString()}
          </span>
        </div>
      )}

      {/* Lock Form */}
      {isEditing ? (
        <form
          onSubmit={handleConfirmLock}
          data-testid="rate-lock-form"
          className="mt-4 rounded-none border border-neutral-700 bg-neutral-900/60 p-4 space-y-4"
        >
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
            Confirm Lender Rate Lock Agreement
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-neutral-300 font-semibold mb-1">Locked Rate (%)</label>
              <input
                type="number"
                step="0.001"
                required
                data-testid="form-rate-input"
                value={formRate}
                onChange={(e) => setFormRate(Number(e.target.value))}
                className="w-full min-h-[44px] rounded-none border border-neutral-700 bg-neutral-950 px-3 py-2 text-white text-base sm:text-xs focus:border-neutral-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-neutral-300 font-semibold mb-1">Lock Duration</label>
              <select
                data-testid="form-duration-select"
                value={formDays}
                onChange={(e) => setFormDays(Number(e.target.value))}
                className="w-full min-h-[44px] rounded-none border border-neutral-700 bg-neutral-950 px-3 py-2 text-white text-base sm:text-xs focus:border-neutral-400 focus:outline-none"
              >
                <option value={30}>30 Days</option>
                <option value={45}>45 Days (Recommended)</option>
                <option value={60}>60 Days</option>
                <option value={90}>90 Days</option>
              </select>
            </div>
            <div>
              <label className="block text-neutral-300 font-semibold mb-1">Lock Fee / Points ($)</label>
              <input
                type="number"
                data-testid="form-points-input"
                value={formPoints}
                onChange={(e) => setFormPoints(Number(e.target.value))}
                className="w-full min-h-[44px] rounded-none border border-neutral-700 bg-neutral-950 px-3 py-2 text-white text-base sm:text-xs focus:border-neutral-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-neutral-300 font-semibold mb-1">Lender Confirmation #</label>
              <input
                type="text"
                data-testid="form-conf-input"
                placeholder="e.g. RL-84920"
                value={formConfNum}
                onChange={(e) => setFormConfNum(e.target.value)}
                className="w-full min-h-[44px] rounded-none border border-neutral-700 bg-neutral-950 px-3 py-2 text-white text-base sm:text-xs focus:border-neutral-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-neutral-300 font-semibold mb-1 text-xs">
              Rate Lock Confirmation Agreement Document
            </label>
            <input
              type="text"
              data-testid="form-agreement-name-input"
              placeholder="e.g. Apex_Rate_Lock_Agreement_Signed.pdf"
              value={formAgreementName}
              onChange={(e) => setFormAgreementName(e.target.value)}
              className="w-full min-h-[44px] rounded-none border border-neutral-700 bg-neutral-950 px-3 py-2 text-white text-base sm:text-xs focus:border-neutral-400 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="tertiary"
              size="sm"
              className="rounded-none min-h-[44px] px-4"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </Button>
            {isLocked && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="rounded-none min-h-[44px] px-4 text-rose-400"
                onClick={handleUnlockRate}
                data-testid="unlock-rate-btn"
              >
                Revert to Floating
              </Button>
            )}
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="rounded-none min-h-[44px] px-5"
              data-testid="confirm-rate-lock-btn"
            >
              Confirm & Lock Rate
            </Button>
          </div>
        </form>
      ) : (
        /* Status Card */
        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3 rounded-none border border-neutral-800 bg-neutral-900/40 p-4 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-neutral-400">Locked Rate</span>
            <p className="text-base font-bold text-emerald-400 mt-0.5">
              {rateLock.lockedRatePct ? `${rateLock.lockedRatePct.toFixed(3)}%` : 'Floating'}
            </p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-neutral-400">Lock Expiration Date</span>
            <p className="font-semibold text-white mt-0.5">
              {rateLock.expirationDate
                ? new Date(rateLock.expirationDate).toLocaleDateString()
                : 'Not Set (Floating)'}
            </p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-neutral-400">Points / Lock Fee</span>
            <p className="font-semibold text-white mt-0.5">
              {formatCurrency(rateLock.pointsOrFeeAmount || 0)}
            </p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-neutral-400">Confirmation Agreement</span>
            <p className="font-semibold text-white mt-0.5 flex items-center gap-1.5 truncate">
              {rateLock.agreementDocumentName ? (
                <>
                  <span className="material-symbols-outlined text-[14px] text-emerald-400">description</span>
                  <span className="truncate">{rateLock.agreementDocumentName}</span>
                </>
              ) : (
                <span className="text-neutral-500 italic">No agreement attached</span>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
