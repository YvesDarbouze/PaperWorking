'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  User,
  Shield,
  CreditCard,
  Building,
  Activity,
  Key,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  Landmark,
} from 'lucide-react';
import StatusBadge from '@/components/admin/StatusBadge';
import {
  getUser360,
  requestSensitiveUserAction,
  confirmSensitiveUserAction,
  toggleUserAccountStatus,
} from '@/actions/adminUserManagement';
import type { User360Data } from '@/lib/admin/user360';
import type { SensitiveActionType } from '@/lib/admin/verificationGate';
import { maskEmail, maskPhone as _maskPhone, maskAccount } from '@/lib/utils';

interface User360DrawerProps {
  targetUid: string | null;
  onClose: () => void;
  onRefreshParent?: () => void;
}

export default function User360Drawer({ targetUid, onClose, onRefreshParent }: User360DrawerProps) {
  const [data, setData] = useState<User360Data | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'identity' | 'billing' | 'plaid' | 'org' | 'activity'>('identity');
  const [isMasked, setIsMasked] = useState(true);

  // Verification Gate State
  const [verifyingAction, setVerifyingAction] = useState<SensitiveActionType | null>(null);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [inputCode, setInputCode] = useState('');
  const [newEmailInput, setNewEmailInput] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [verificationSuccess, setVerificationSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    if (!targetUid) return;

    queueMicrotask(() => {
      if (!active) return;
      setLoading(true);
      setVerifyingAction(null);
      setVerificationId(null);
      setInputCode('');
      setVerificationError('');
      setVerificationSuccess('');
    });

    getUser360(targetUid)
      .then((u360) => {
        if (active) {
          setData(u360);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          console.error('[User360Drawer] Fetch failed:', err);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [targetUid]);

  if (!targetUid) return null;

  const handleInitiateAction = async (actionType: SensitiveActionType) => {
    if (actionType === 'EMAIL_CHANGE' && !newEmailInput) {
      setVerificationError('Please enter the new email address.');
      return;
    }

    setSubmitting(true);
    setVerificationError('');
    setVerificationSuccess('');
    try {
      const res = await requestSensitiveUserAction({
        targetUid,
        actionType,
        newEmail: actionType === 'EMAIL_CHANGE' ? newEmailInput : undefined,
      });

      if (res.success && res.verificationId) {
        setVerifyingAction(actionType);
        setVerificationId(res.verificationId);
        setVerificationSuccess('Verification code sent to user email via Resend.');
      } else {
        setVerificationError(res.error || 'Failed to initiate verification.');
      }
    } catch (err: unknown) {
      setVerificationError((err as Error)?.message || 'Initiation error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!verificationId || !inputCode) {
      setVerificationError('Please enter the 6-digit code.');
      return;
    }

    setSubmitting(true);
    setVerificationError('');
    try {
      const res = await confirmSensitiveUserAction({
        verificationId,
        code: inputCode,
      });

      if (res.success) {
        setVerificationSuccess(res.message || 'Action completed successfully.');
        setVerifyingAction(null);
        setVerificationId(null);
        setInputCode('');
        if (targetUid) {
          getUser360(targetUid).then(setData).catch(console.error);
        }
        if (onRefreshParent) onRefreshParent();
      } else {
        setVerificationError(res.error || 'Invalid verification code.');
      }
    } catch (err: unknown) {
      setVerificationError((err as Error)?.message || 'Confirmation error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAccount = async (disabled: boolean) => {
    if (!confirm(`Are you sure you want to ${disabled ? 'disable' : 'enable'} this account?`)) return;
    setSubmitting(true);
    try {
      const res = await toggleUserAccountStatus({ targetUid, disabled });
      if (res.success) {
        if (targetUid) {
          getUser360(targetUid).then(setData).catch(console.error);
        }
        if (onRefreshParent) onRefreshParent();
      } else {
        alert(`Failed: ${res.error}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const identity = data?.identity;
  const billing = data?.billing;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex justify-end">
      <div
        className="w-full max-w-2xl min-h-screen flex flex-col shadow-2xl transition-transform"
        style={{ background: 'var(--bg-canvas)', borderLeft: '1px solid var(--border-ui)' }}
      >
        {/* Drawer Header */}
        <div className="px-6 py-5 flex items-center justify-between border-b" style={{ borderColor: 'var(--border-ui)', background: 'var(--bg-surface)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-black text-white shrink-0">
              {identity?.displayName?.charAt(0) || 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {identity?.displayName || 'User 360 Profile'}
                </h2>
                <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800" style={{ color: 'var(--text-secondary)' }}>
                  {identity?.role}
                </span>
              </div>
              <p className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                UID: {identity?.uid}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMasked(!isMasked)}
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-xs flex items-center gap-1.5"
              title={isMasked ? 'Click to unmask PII data' : 'Click to mask PII data'}
              style={{ color: 'var(--text-secondary)' }}
            >
              {isMasked ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 text-amber-500" />}
              <span>{isMasked ? 'Unmask' : 'Masked'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              style={{ color: 'var(--text-primary)' }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b px-6 text-xs font-semibold overflow-x-auto shrink-0" style={{ borderColor: 'var(--border-ui)', background: 'var(--bg-surface)' }}>
          {[
            { id: 'identity', label: 'Identity & Auth', icon: User },
            { id: 'billing', label: 'Billing & Stripe', icon: CreditCard },
            { id: 'plaid', label: 'Banks (Plaid)', icon: Landmark },
            { id: 'org', label: 'Organizations', icon: Building },
            { id: 'activity', label: 'Activity Log', icon: Activity },
          ].map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as 'identity' | 'billing' | 'plaid' | 'org' | 'activity')}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                  active ? 'border-black text-black dark:border-white dark:text-white font-bold' : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 animate-shimmer rounded" style={{ border: '1px solid var(--border-ui)' }} />
              ))}
            </div>
          ) : !data ? (
            <p className="text-center py-12 text-sm text-gray-500">Failed to load User 360 data.</p>
          ) : (
            <>
              {/* TAB 1: Identity & Auth */}
              {activeTab === 'identity' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4 p-4 rounded-lg border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-ui)' }}>
                    <div>
                      <p className="text-xs uppercase font-bold text-gray-500">Email Address</p>
                      <p className="text-sm font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>
                        {isMasked ? maskEmail(identity?.email) : identity?.email}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase font-bold text-gray-500">Email Verification</p>
                      <div className="mt-1">
                        <StatusBadge
                          label={identity?.emailVerified ? 'VERIFIED' : 'UNVERIFIED'}
                          variant={identity?.emailVerified ? 'success' : 'warning'}
                        />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs uppercase font-bold text-gray-500">Account Type</p>
                      <p className="text-sm capitalize mt-1" style={{ color: 'var(--text-primary)' }}>
                        {identity?.accountType}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase font-bold text-gray-500">Account Status</p>
                      <div className="mt-1">
                        <StatusBadge
                          label={identity?.disabled ? 'DISABLED' : 'ACTIVE'}
                          variant={identity?.disabled ? 'danger' : 'success'}
                        />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs uppercase font-bold text-gray-500">Joined Date</p>
                      <p className="text-xs font-mono mt-1" style={{ color: 'var(--text-secondary)' }}>
                        {new Date(identity?.createdAt || '').toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase font-bold text-gray-500">Last Sign-In</p>
                      <p className="text-xs font-mono mt-1" style={{ color: 'var(--text-secondary)' }}>
                        {new Date(identity?.lastLoginAt || '').toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Verification-Before-Change Actions Panel (Amendment E) */}
                  <div className="p-4 rounded-lg border bg-amber-500/5 border-amber-500/20 space-y-4">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-amber-600" />
                      <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-300">
                        Verification-Gated Sensitive Actions
                      </h3>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Modifying sensitive credentials sends a 6-digit confirmation code via Resend to the user before executing the change.
                    </p>

                    {verificationError && (
                      <div className="p-3 text-xs bg-red-50 text-red-600 rounded border border-red-200">
                        {verificationError}
                      </div>
                    )}
                    {verificationSuccess && (
                      <div className="p-3 text-xs bg-emerald-50 text-emerald-700 rounded border border-emerald-200">
                        {verificationSuccess}
                      </div>
                    )}

                    {verifyingAction ? (
                      <div className="space-y-3 p-3 bg-white dark:bg-gray-900 rounded border">
                        <p className="text-xs font-bold uppercase text-gray-700 dark:text-gray-300">
                          Confirming {verifyingAction}
                        </p>
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="Enter 6-digit code"
                          value={inputCode}
                          onChange={(e) => setInputCode(e.target.value)}
                          className="w-full text-center tracking-widest font-mono text-lg py-2 border rounded"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleConfirmAction}
                            disabled={submitting || inputCode.length !== 6}
                            className="ag-button flex-1 text-xs"
                          >
                            {submitting ? 'Verifying...' : 'Confirm & Execute'}
                          </button>
                          <button
                            onClick={() => { setVerifyingAction(null); setVerificationId(null); }}
                            className="px-3 py-1.5 text-xs border rounded hover:bg-gray-100"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            const email = prompt('Enter new email address:');
                            if (email) {
                              setNewEmailInput(email);
                              handleInitiateAction('EMAIL_CHANGE');
                            }
                          }}
                          disabled={submitting}
                          className="flex items-center justify-center gap-2 p-2.5 text-xs border rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-semibold"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          Change Email
                        </button>

                        <button
                          onClick={() => handleInitiateAction('PASSWORD_RESET')}
                          disabled={submitting}
                          className="flex items-center justify-center gap-2 p-2.5 text-xs border rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-semibold"
                        >
                          <Key className="w-3.5 h-3.5" />
                          Send Password Reset
                        </button>

                        <button
                          onClick={() => handleInitiateAction('MFA_RESET')}
                          disabled={submitting}
                          className="flex items-center justify-center gap-2 p-2.5 text-xs border rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-semibold"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          Reset MFA Factors
                        </button>

                        <button
                          onClick={() => handleToggleAccount(!identity?.disabled)}
                          disabled={submitting}
                          className={`flex items-center justify-center gap-2 p-2.5 text-xs border rounded font-semibold ${
                            identity?.disabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                          }`}
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {identity?.disabled ? 'Enable Account' : 'Disable Account'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: Billing & Stripe */}
              {activeTab === 'billing' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 p-4 rounded-lg border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-ui)' }}>
                    <div>
                      <p className="text-xs uppercase font-bold text-gray-500">Subscription Plan</p>
                      <p className="text-base font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>
                        {billing?.subscriptionPlan}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase font-bold text-gray-500">Subscription Status</p>
                      <div className="mt-1">
                        <StatusBadge
                          label={(billing?.subscriptionStatus || 'inactive').replace('_', ' ')}
                          variant={billing?.subscriptionStatus === 'active' ? 'success' : 'warning'}
                        />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs uppercase font-bold text-gray-500">Stripe Customer ID</p>
                      <p className="text-xs font-mono mt-1" style={{ color: 'var(--text-secondary)' }}>
                        {billing?.stripeCustomerId || 'No Stripe Customer'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase font-bold text-gray-500">Estimated MRR</p>
                      <p className="text-base font-bold mt-1 text-emerald-600">
                        ${billing?.mrr}/mo
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: Banks (Plaid) */}
              {activeTab === 'plaid' && (
                <div className="space-y-4">
                  {data.plaidConnections.length === 0 ? (
                    <div className="p-8 text-center border rounded-lg" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-ui)' }}>
                      <Landmark className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>No Plaid Bank Connections</p>
                      <p className="text-xs text-gray-500 mt-1">This user has not connected any external bank accounts.</p>
                    </div>
                  ) : (
                    data.plaidConnections.map((c) => (
                      <div key={c.id} className="p-4 rounded-lg border space-y-2" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-ui)' }}>
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {c.institutionName}
                          </h4>
                          <StatusBadge label={c.status} variant={c.status === 'OK' ? 'success' : 'warning'} />
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Account: {maskAccount(c.accountMask)}</span>
                          <span>Sync Errors: {c.syncErrorCount}</span>
                        </div>
                        {c.lastSyncErrorMessage && (
                          <p className="text-xs text-red-500 bg-red-50 p-2 rounded border border-red-100">
                            Error: {c.lastSyncErrorMessage}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 4: Organizations */}
              {activeTab === 'org' && (
                <div className="space-y-4">
                  {data.organizations.length === 0 ? (
                    <div className="p-8 text-center border rounded-lg" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-ui)' }}>
                      <Building className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Single-Tenant Account</p>
                      <p className="text-xs text-gray-500 mt-1">User has no active organization collaborations.</p>
                    </div>
                  ) : (
                    data.organizations.map((org, i) => (
                      <div key={i} className="p-4 rounded-lg border space-y-2" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-ui)' }}>
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {org.projectDisplayName}
                          </h4>
                          <span className="text-xs uppercase font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                            {org.role}
                          </span>
                        </div>
                        <p className="text-xs font-mono text-gray-500">
                          Org ID: {org.organizationId}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 5: Activity Log */}
              {activeTab === 'activity' && (
                <div className="space-y-3">
                  {data.activityTimeline.length === 0 ? (
                    <p className="text-center py-8 text-xs text-gray-500">No activity events recorded.</p>
                  ) : (
                    data.activityTimeline.map((item) => (
                      <div key={item.id} className="p-3 rounded border text-xs space-y-1" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-ui)' }}>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {item.action}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {new Date(item.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-gray-500">{item.details}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
