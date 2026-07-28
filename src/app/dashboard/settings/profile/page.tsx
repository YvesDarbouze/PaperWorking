'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useMFA } from '@/hooks/useMFA';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { db } from '@/lib/firebase/config';
import toast from 'react-hot-toast';
import MFAEnrollmentModal from '@/components/auth/MFAEnrollmentModal';
import MFAUnenrollModal from '@/components/auth/MFAUnenrollModal';
import ClaimHistorySection from '@/components/profile/ClaimHistorySection';
import { ActivityTimeline } from '@/components/project/ActivityTimeline';
import { useTheme } from '@/lib/utils/ThemeProvider';
import { settingsTokens, panelStyle, inputStyle } from '@/components/settings/settingsTheme';

/* Profile settings — identity & security desk */

export default function ProfileSettingsPage() {
  const { user, profile } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const t = settingsTokens(isDark);
  const panel = panelStyle(t);
  const field = inputStyle(t);

  // ─── User Details State ───────────────────────────────
  const displayName = profile?.displayName || '';
  const nameParts = displayName.split(' ');
  const [firstName, setFirstName]     = useState(nameParts[0] || '');
  const [lastName, setLastName]       = useState(nameParts.slice(1).join(' ') || '');
  const [phone, setPhone]             = useState(profile?.phone || '');
  const [company, setCompany]         = useState(profile?.companyName || '');
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);

  // ─── Password State ───────────────────────────────────
  const [currentPwd, setCurrentPwd]   = useState('');
  const [newPwd, setNewPwd]           = useState('');
  const [confirmPwd, setConfirmPwd]   = useState('');
  const [showPwd, setShowPwd]         = useState(false);
  const [pwdLoading, setPwdLoading]   = useState(false);
  const [pwdError, setPwdError]       = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess]   = useState(false);

  // ─── 2FA — enrollment state read from Firebase enrolled factors ──
  const { isMFAEnabled, totpFactor, refresh: refreshMFA } = useMFA();
  const [showEnrollModal, setShowEnrollModal]   = useState(false);
  const [showUnenrollModal, setShowUnenrollModal] = useState(false);

  // ─── Avatar ───────────────────────────────────────────
  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'U';

  // ─── Save Profile ─────────────────────────────────────
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: `${firstName.trim()} ${lastName.trim()}`.trim(),
        phone: phone.trim(),
        companyName: company.trim(),
        updatedAt: serverTimestamp(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setSaving(false);
    }
  };

  // ─── Change Password ──────────────────────────────────
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) return;

    setPwdError(null);
    setPwdSuccess(false);

    if (newPwd.length < 8) {
      setPwdError('New password must be at least 8 characters.');
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdError('Passwords do not match.');
      return;
    }

    setPwdLoading(true);
    try {
      // Re-authenticate before password change
      const credential = EmailAuthProvider.credential(user.email, currentPwd);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPwd);

      setPwdSuccess(true);
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
      setTimeout(() => setPwdSuccess(false), 3000);
    } catch (err: unknown) {
      const error = err as { code?: string };
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setPwdError('Current password is incorrect.');
      } else if (error.code === 'auth/weak-password') {
        setPwdError('New password is too weak. Use at least 8 characters.');
      } else {
        setPwdError('Failed to update password. Please try again.');
      }
    } finally {
      setPwdLoading(false);
    }
  };

  // ─── Active Sessions State ────────────────────────────
  const [revoking, setRevoking] = useState(false);
  const [revokeSuccess, setRevokeSuccess] = useState(false);

  // ─── GDPR Deletion State ──────────────────────────────
  const [deleting, setDeleting]           = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const deletionScheduledAt = profile?.deletionScheduledAt;
  let deletionDate: Date | null = null;
  if (deletionScheduledAt) {
    if (
      typeof deletionScheduledAt === 'object' &&
      deletionScheduledAt !== null &&
      'toDate' in deletionScheduledAt &&
      typeof (deletionScheduledAt as { toDate: () => unknown }).toDate === 'function'
    ) {
      deletionDate = (deletionScheduledAt as { toDate: () => Date }).toDate();
    } else {
      deletionDate = new Date(deletionScheduledAt as string | number);
    }
  }
  const isDeletionPending = !!deletionDate;

  const handleRequestErasure = async () => {
    if (!user) return;
    setDeleting(true);
    const tid = toast.loading('Scheduling account deletion…');
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/account/data/delete', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to schedule deletion');
      toast.success('Account deletion scheduled. 24-hour grace period active.', { id: tid });
      setShowDeleteConfirm(false);
    } catch (e) {
      toast.error(`Failed: ${e instanceof Error ? e.message : 'Unknown error'}`, { id: tid });
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDeletion = async () => {
    if (!user) return;
    setDeleting(true);
    const tid = toast.loading('Cancelling deletion request…');
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/account/data/delete', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to cancel deletion');
      toast.success('Account deletion request cancelled.', { id: tid });
    } catch (e) {
      toast.error(`Failed: ${e instanceof Error ? e.message : 'Unknown error'}`, { id: tid });
    } finally {
      setDeleting(false);
    }
  };

  const handleRevokeSessions = async () => {
    if (!user) return;
    setRevoking(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/auth/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });
      if (!res.ok) throw new Error('Failed to revoke sessions');
      setRevokeSuccess(true);
      setTimeout(() => setRevokeSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setRevoking(false);
    }
  };

  // ─── Calculate completeness ───────────────────────────
  const fields = [firstName, lastName, phone, company];
  const filledFields = fields.filter(f => f.trim().length > 0).length;
  const completeness = Math.round((filledFields / fields.length) * 100);

  return (
    <div className="w-full space-y-6" style={{ color: t.body }}>
      <header className="pb-5" style={{ borderBottom: `1px solid ${t.divider}` }}>
        <p className="text-[11px] font-medium tracking-[0.14em] uppercase mb-1" style={{ color: t.accent }}>
          Identity
        </p>
        <h2 className="text-[1.35rem] font-semibold tracking-tight" style={{ color: t.heading }}>
          Profile
        </h2>
        <p className="text-sm mt-1.5 leading-relaxed max-w-xl" style={{ color: t.muted }}>
          Personal details, security, sessions, and data erasure for your account.
        </p>
      </header>

      <div className="grid grid-cols-12 gap-5">

        {profile?.invitationSuspended && (
          <section
            className="col-span-12 p-5"
            style={{ background: t.alertMuted, border: `1px solid ${t.border}`, borderRadius: 2 }}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 flex items-center justify-center shrink-0"
                  style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 2, color: t.alert }}
                >
                  <span className="material-symbols-outlined text-2xl select-none">warning</span>
                </div>
                <div>
                  <h4 className="text-base font-semibold" style={{ color: t.heading }}>
                    Invitation privileges suspended
                  </h4>
                  <p className="text-xs mt-1 leading-relaxed max-w-2xl" style={{ color: t.muted }}>
                    Suspended due to a complaint or bounce-rate threshold.
                    Reason:{' '}
                    <span className="font-semibold" style={{ color: t.heading }}>
                      {profile.suspensionReason || 'USER_COMPLAINT'}
                    </span>
                    . You cannot send co-investor invitations until this is resolved.
                  </p>
                </div>
              </div>

              <div className="shrink-0">
                {profile.appealSubmitted ? (
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold"
                    style={{ background: t.successMuted, border: `1px solid ${t.border}`, borderRadius: 2, color: t.success }}
                  >
                    <span className="material-symbols-outlined text-xs select-none">check_circle</span>
                    Appeal under review
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={async () => {
                      const tid = toast.loading('Submitting appeal…');
                      try {
                        const token = await user?.getIdToken();
                        const res = await fetch('/api/identity/appeal', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                          },
                          body: JSON.stringify({ reason: 'Requesting review of suspension.' })
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || 'Failed to submit appeal');
                        toast.success('Appeal submitted successfully.', { id: tid });
                        window.location.reload();
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : 'Failed to submit appeal', { id: tid });
                      }
                    }}
                    className="pw-interactive-custom text-sm font-semibold"
                    style={{ background: t.alert, color: '#fff', border: 'none', borderRadius: 2, padding: '8px 16px' }}
                  >
                    Appeal suspension
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        <section className="col-span-12 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5" style={panel}>
          <div className="flex items-center gap-5 min-w-0">
            <div className="relative group shrink-0">
              <div
                className="w-20 h-20 flex items-center justify-center text-2xl font-semibold select-none"
                style={{
                  borderRadius: 2,
                  background: t.accentMuted,
                  border: `1px solid ${t.border}`,
                  color: t.accent,
                }}
              >
                {initials}
              </div>
              <button
                type="button"
                className="pw-interactive-custom absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: 'rgba(10,11,14,0.72)', border: `1px solid ${t.border}`, borderRadius: 2, color: t.ctaFg }}
                title="Upload photo"
              >
                <span className="material-symbols-outlined text-xl">photo_camera</span>
              </button>
            </div>

            <div className="min-w-0">
              <h3 className="text-xl font-semibold tracking-tight truncate" style={{ color: t.heading }}>
                {firstName} {lastName}
              </h3>
              <div className="flex items-center gap-1.5 text-sm mt-1" style={{ color: t.muted }}>
                <span className="material-symbols-outlined text-[16px]">mail</span>
                <span className="font-mono truncate" style={{ color: t.accent }}>{user?.email}</span>
              </div>
            </div>
          </div>

          <span
            className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold shrink-0"
            style={{ background: t.successMuted, border: `1px solid ${t.border}`, borderRadius: 2, color: t.success }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: t.success }} />
            {profile?.role || 'Active member'}
          </span>
        </section>

        <section className="col-span-12 lg:col-span-7 p-5 sm:p-6 flex flex-col" style={panel}>
          <div className="flex items-center gap-2 pb-4 mb-5" style={{ borderBottom: `1px solid ${t.divider}` }}>
            <span className="material-symbols-outlined text-xl select-none" style={{ color: t.accent }}>person</span>
            <h4 className="text-base font-semibold" style={{ color: t.heading }}>Personal information</h4>
          </div>

          <div className="space-y-2 mb-5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium" style={{ color: t.muted }}>Profile completeness</span>
              <span className="font-semibold tabular-nums" style={{ color: completeness === 100 ? t.success : t.accent }}>
                {completeness}%
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden" style={{ background: t.surfaceHigh, borderRadius: 1 }}>
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${completeness}%`,
                  background: completeness === 100 ? t.success : t.accent,
                  borderRadius: 1,
                }}
              />
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-5 flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] mb-1.5" style={{ color: t.muted }}>
                  First name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full text-sm px-3 h-10 outline-none"
                  style={field}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] mb-1.5" style={{ color: t.muted }}>
                  Last name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full text-sm px-3 h-10 outline-none"
                  style={field}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] mb-1.5" style={{ color: t.muted }}>
                  Phone number
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="w-full text-sm px-3 h-10 outline-none"
                  style={field}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] mb-1.5" style={{ color: t.muted }}>
                  Company name
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Realty Corp LLC"
                  className="w-full text-sm px-3 h-10 outline-none"
                  style={field}
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] mb-1.5" style={{ color: t.muted }}>
                Email address
              </label>
              <div
                className="w-full text-sm px-3 h-10 flex items-center gap-2 cursor-not-allowed"
                style={{ ...field, color: t.muted, background: t.surfaceMuted }}
              >
                <span className="material-symbols-outlined text-[16px]">lock</span>
                {user?.email}
              </div>
            </div>

            <div className="flex items-center gap-4 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="pw-interactive-custom flex items-center justify-center gap-2 text-sm font-semibold disabled:opacity-50"
                style={{ background: t.ctaBg, color: t.ctaFg, border: 'none', borderRadius: 2, padding: '8px 16px' }}
              >
                {saving ? (
                  <span className="material-symbols-outlined animate-spin text-[16px] select-none">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-[16px] select-none">save</span>
                )}
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              {saved && (
                <span className="text-sm flex items-center gap-1.5" style={{ color: t.success }}>
                  <span className="material-symbols-outlined text-sm select-none">check_circle</span>
                  Profile updated.
                </span>
              )}
            </div>
          </form>
        </section>

        <section className="col-span-12 lg:col-span-5 p-5 sm:p-6 flex flex-col" style={panel}>
          <div className="flex items-center gap-2 pb-4 mb-5" style={{ borderBottom: `1px solid ${t.divider}` }}>
            <span className="material-symbols-outlined text-xl select-none" style={{ color: t.accent }}>shield_lock</span>
            <h4 className="text-base font-semibold" style={{ color: t.heading }}>Security</h4>
          </div>

          <div
            className="flex items-center justify-between p-3.5 mb-5 gap-3"
            style={{ background: t.surfaceMuted, border: `1px solid ${t.border}`, borderRadius: 2 }}
          >
            <div>
              <p className="text-sm font-semibold mb-0.5" style={{ color: t.heading }}>Two-factor auth</p>
              <p className="text-xs" style={{ color: t.muted }}>
                {isMFAEnabled ? 'TOTP authenticator active' : 'Add an extra layer of protection'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => isMFAEnabled ? setShowUnenrollModal(true) : setShowEnrollModal(true)}
              className="pw-interactive-custom relative inline-flex h-6 w-11 items-center transition-colors"
              style={{
                borderRadius: 999,
                border: `1px solid ${t.border}`,
                background: isMFAEnabled ? t.successMuted : t.surfaceHigh,
                padding: 0,
              }}
              role="switch"
              aria-checked={isMFAEnabled}
            >
              <span
                className="inline-block h-4 w-4 transform transition-all duration-300"
                style={{
                  borderRadius: 999,
                  background: isMFAEnabled ? t.success : t.muted,
                  transform: isMFAEnabled ? 'translateX(22px)' : 'translateX(4px)',
                }}
              />
            </button>
          </div>

          {showEnrollModal && (
            <MFAEnrollmentModal
              onClose={() => setShowEnrollModal(false)}
              onEnrolled={async () => { await refreshMFA(); toast.success('Two-factor authentication enabled.'); }}
            />
          )}
          {showUnenrollModal && totpFactor && (
            <MFAUnenrollModal
              totpFactor={totpFactor}
              onClose={() => setShowUnenrollModal(false)}
              onUnenrolled={async () => { await refreshMFA(); toast.success('Two-factor authentication disabled.'); }}
            />
          )}

          <div className="pb-3 mb-4" style={{ borderBottom: `1px solid ${t.divider}` }}>
            <h5 className="text-[11px] font-semibold uppercase tracking-[0.12em] flex items-center gap-1.5" style={{ color: t.muted }}>
              <span className="material-symbols-outlined text-sm select-none">lock_reset</span>
              Change password
            </h5>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-4 flex-1">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] mb-1.5" style={{ color: t.muted }}>
                Current password
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={currentPwd}
                  onChange={(e) => setCurrentPwd(e.target.value)}
                  required
                  className="w-full text-sm px-3 h-10 pr-10 outline-none"
                  style={field}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="pw-interactive-custom absolute right-2 top-1/2 -translate-y-1/2"
                  style={{ background: 'transparent', border: 'none', padding: 4, color: t.muted }}
                >
                  <span className="material-symbols-outlined text-lg select-none">
                    {showPwd ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] mb-1.5" style={{ color: t.muted }}>
                New password
              </label>
              <input
                type="password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                required
                minLength={8}
                className="w-full text-sm px-3 h-10 outline-none"
                style={field}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] mb-1.5" style={{ color: t.muted }}>
                Confirm new password
              </label>
              <input
                type="password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                required
                minLength={8}
                className="w-full text-sm px-3 h-10 outline-none"
                style={field}
              />
            </div>

            {pwdError && (
              <p
                className="text-xs px-3 py-2.5 flex items-center gap-2"
                style={{ background: t.alertMuted, border: `1px solid ${t.border}`, borderRadius: 2, color: t.alert }}
              >
                <span className="material-symbols-outlined text-sm select-none">error</span>
                {pwdError}
              </p>
            )}
            {pwdSuccess && (
              <p
                className="text-xs px-3 py-2.5 flex items-center gap-2"
                style={{ background: t.successMuted, border: `1px solid ${t.border}`, borderRadius: 2, color: t.success }}
              >
                <span className="material-symbols-outlined text-sm select-none">check_circle</span>
                Password updated.
              </p>
            )}

            <button
              type="submit"
              disabled={pwdLoading}
              className="pw-interactive-custom w-full flex justify-center items-center gap-2 text-sm font-semibold disabled:opacity-50"
              style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: 2, padding: '8px 16px', color: t.heading }}
            >
              {pwdLoading && (
                <span className="material-symbols-outlined animate-spin text-[16px] select-none">progress_activity</span>
              )}
              <span className="material-symbols-outlined text-[16px]">key</span>
              {pwdLoading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </section>

        <section className="col-span-12 p-5 sm:p-6" style={panel}>
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-xl select-none" style={{ color: t.accent }}>devices</span>
              <h4 className="text-base font-semibold" style={{ color: t.heading }}>Active sessions</h4>
            </div>
            <p className="text-sm" style={{ color: t.muted }}>Manage authentication and device sessions.</p>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <div
              className="flex-1 p-4 flex items-center justify-between gap-3"
              style={{ background: t.surfaceMuted, border: `1px solid ${t.border}`, borderRadius: 2 }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 flex items-center justify-center"
                  style={{ background: t.successMuted, border: `1px solid ${t.border}`, borderRadius: 2, color: t.success }}
                >
                  <span className="material-symbols-outlined text-[20px]">computer</span>
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: t.heading }}>This device</p>
                  <p className="text-xs font-mono mt-0.5" style={{ color: t.muted }}>Current session</p>
                </div>
              </div>
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold"
                style={{ background: t.successMuted, color: t.success, borderRadius: 2 }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: t.success }} />
                Active
              </span>
            </div>

            <div
              className="flex-1 p-4 flex items-center justify-between gap-3"
              style={{ background: t.surfaceMuted, border: `1px solid ${t.border}`, borderRadius: 2 }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 flex items-center justify-center"
                  style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 2, color: t.muted }}
                >
                  <span className="material-symbols-outlined text-[20px]">devices_other</span>
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: t.heading }}>Other sessions</p>
                  <p className="text-xs mt-0.5" style={{ color: t.muted }}>Sign out everywhere else</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRevokeSessions}
                disabled={revoking}
                className="pw-interactive-custom text-sm font-semibold disabled:opacity-50"
                style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: 2, padding: '8px 12px', color: t.muted }}
              >
                {revoking ? (
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined animate-spin text-[16px] select-none">progress_activity</span>
                    Revoking…
                  </span>
                ) : (
                  'Revoke all'
                )}
              </button>
            </div>
          </div>

          {revokeSuccess && (
            <p className="text-xs flex items-center gap-1.5 mt-4" style={{ color: t.success }}>
              <span className="material-symbols-outlined text-[16px] select-none">check_circle</span>
              All other sessions have been revoked.
            </p>
          )}
        </section>

        <ClaimHistorySection />

        <div className="col-span-12">
          <ActivityTimeline isCrossDeal={true} />
        </div>

        <section
          className="col-span-12 p-5 sm:p-6"
          style={{ ...panel, borderColor: t.alert }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-xl select-none" style={{ color: t.alert }}>delete_forever</span>
            <h4 className="text-base font-semibold" style={{ color: t.heading }}>Data erasure</h4>
          </div>
          <p className="text-sm mb-5 leading-relaxed max-w-2xl" style={{ color: t.muted }}>
            Permanently delete your account, projects, documents, and profile. A 24-hour grace window applies before purge. Legal audit logs are retained for 7 years.
          </p>

          {isDeletionPending && (
            <div
              className="mb-5 p-4 flex items-start gap-3"
              style={{ background: t.warnMuted, border: `1px solid ${t.border}`, borderRadius: 2 }}
            >
              <span className="material-symbols-outlined text-xl shrink-0 mt-0.5 select-none" style={{ color: t.warn }}>warning</span>
              <div className="space-y-2 flex-1">
                <p className="text-sm font-semibold" style={{ color: t.warn }}>
                  Deletion scheduled for {deletionDate?.toLocaleString() ?? '24 hours from now'}.
                </p>
                <p className="text-xs" style={{ color: t.muted }}>Features stay active during this window. You can cancel below.</p>
                <button
                  type="button"
                  onClick={handleCancelDeletion}
                  disabled={deleting}
                  className="pw-interactive-custom mt-1 flex items-center justify-center gap-2 text-sm font-semibold disabled:opacity-50"
                  style={{ background: t.warn, color: '#0A0B0E', border: 'none', borderRadius: 2, padding: '8px 14px' }}
                >
                  {deleting && <span className="material-symbols-outlined animate-spin text-[16px] select-none">progress_activity</span>}
                  Cancel deletion request
                </button>
              </div>
            </div>
          )}

          {!isDeletionPending && !showDeleteConfirm && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="pw-interactive-custom flex items-center justify-center gap-2 text-sm font-semibold"
              style={{ background: t.alertMuted, border: `1px solid ${t.border}`, borderRadius: 2, padding: '8px 16px', color: t.alert }}
            >
              <span className="material-symbols-outlined text-[16px] select-none">delete_forever</span>
              Request data erasure (GDPR)
            </button>
          )}

          {!isDeletionPending && showDeleteConfirm && (
            <div
              data-testid="delete-confirm-panel"
              className="p-4 space-y-4"
              style={{ background: t.alertMuted, border: `1px solid ${t.border}`, borderRadius: 2 }}
            >
              <p className="text-sm font-semibold" style={{ color: t.alert }}>
                Are you sure? This schedules permanent deletion after a 24-hour grace period.
              </p>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleRequestErasure}
                  disabled={deleting}
                  className="pw-interactive-custom flex items-center justify-center gap-2 text-sm font-semibold disabled:opacity-50"
                  style={{ background: t.alert, color: '#fff', border: 'none', borderRadius: 2, padding: '8px 16px' }}
                >
                  {deleting && <span className="material-symbols-outlined animate-spin text-[16px] select-none">progress_activity</span>}
                  Confirm request
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="pw-interactive-custom text-sm font-semibold disabled:opacity-50"
                  style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: 2, padding: '8px 14px', color: t.muted }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>

        {showEnrollModal && (
          <MFAEnrollmentModal
            onClose={() => setShowEnrollModal(false)}
            onEnrolled={() => {
              setShowEnrollModal(false);
              refreshMFA();
            }}
          />
        )}
        {showUnenrollModal && totpFactor && (
          <MFAUnenrollModal
            totpFactor={totpFactor}
            onClose={() => setShowUnenrollModal(false)}
            onUnenrolled={() => {
              setShowUnenrollModal(false);
              refreshMFA();
            }}
          />
        )}

      </div>
    </div>
  );
}
