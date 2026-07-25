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

/* ═══════════════════════════════════════════════════════
   Profile & Security Settings (Luminous Glass Terminal)
   ═══════════════════════════════════════════════════════ */

export default function ProfileSettingsPage() {
  const { user, profile } = useAuth();

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
    <div className="w-full space-y-8">
      {/* ─── 12-Column Bento Grid ─── */}
      <div className="grid grid-cols-12 gap-8">

        {/* ════════════════════════════════════════════════
            SUSPENSION BANNER (col-span-12)
            ════════════════════════════════════════════════ */}
        {profile?.invitationSuspended && (
          <section className="col-span-12 border border-red-500/30 bg-red-500/5 rounded-2xl p-6 relative overflow-hidden backdrop-blur-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
                  <span className="material-symbols-outlined text-2xl select-none">warning</span>
                </div>
                <div>
                  <h4 className="text-base font-semibold text-white">Invitation Privileges Suspended</h4>
                  <p className="text-xs text-pw-muted mt-1 leading-relaxed max-w-2xl">
                    Your invitation privileges were suspended automatically due to a complaint or bounce rate threshold breach. 
                    Reason: <span className="font-semibold text-white">{profile.suspensionReason || 'USER_COMPLAINT'}</span>.
                    You are currently restricted from sending invitations to co-investors.
                  </p>
                </div>
              </div>

              <div className="shrink-0">
                {profile.appealSubmitted ? (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400 select-none">
                    <span className="material-symbols-outlined text-xs select-none">check_circle</span>
                    Appeal Under Review
                  </span>
                ) : (
                  <button
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
                    className="h-10 px-5 bg-error text-white hover:bg-error/90 active:scale-98 transition-all text-sm font-medium rounded-lg cursor-pointer flex items-center justify-center"
                  >
                    Appeal Suspension
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ════════════════════════════════════════════════
            1 · HERO PROFILE CARD (col-span-12)
            ════════════════════════════════════════════════ */}
        <section className="col-span-12 glass-card rounded-2xl p-6 flex items-center justify-between relative overflow-hidden transition-all duration-200 hover:shadow-md">
          {/* Ambient glow */}
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-pw-primary/10 rounded-full blur-[120px] pointer-events-none" />

          <div className="flex items-center gap-8 relative z-10">
            {/* Avatar */}
            <div className="relative group cursor-pointer">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pw-primary/30 to-pw-primary/10 border-2 border-pw-primary/30 flex items-center justify-center text-3xl font-bold text-pw-primary select-none transition-all">
                {initials}
              </div>
              <button
                type="button"
                className="absolute inset-0 rounded-full bg-pw-black/60 text-pw-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border border-pw-primary/30"
                title="Upload photo"
              >
                <span className="material-symbols-outlined text-xl">photo_camera</span>
              </button>
              <div className="absolute bottom-0 right-0 bg-pw-glass-bg border border-white/20 rounded-full p-1.5 shadow-lg z-20">
                <span className="material-symbols-outlined text-[14px] text-pw-black">edit</span>
              </div>
            </div>

            {/* Name & email */}
            <div>
              <h3 className="text-2xl font-bold text-pw-black mb-1">
                {firstName} {lastName}
              </h3>
              <div className="flex items-center gap-2 text-pw-muted text-sm">
                <span className="material-symbols-outlined text-[16px]">mail</span>
                <span className="text-pw-primary/80 font-mono">{user?.email}</span>
              </div>
            </div>
          </div>

          {/* Status badge */}
          <div className="hidden md:block relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pw-primary/10 border border-pw-primary/20 text-pw-primary font-semibold text-xs tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-pw-primary animate-pulse" />
              {profile?.role || 'Active Member'}
            </span>
          </div>
        </section>

        {/* ════════════════════════════════════════════════
            2 · PERSONAL INFORMATION FORM (col-span-7)
            ════════════════════════════════════════════════ */}
        <section className="col-span-12 lg:col-span-7 glass-card rounded-2xl p-6 flex flex-col relative overflow-hidden transition-all duration-200 hover:shadow-md">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-pw-primary text-xl select-none">person</span>
              <h4 className="text-base font-semibold text-pw-black">Personal Information</h4>
            </div>
          </div>

          {/* Profile completeness mini-bar */}
          <div className="space-y-2 mb-6">
            <div className="flex items-center justify-between text-xs">
              <span className="text-pw-muted font-medium">Profile Completeness</span>
              <span className="text-pw-primary font-bold">{completeness}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-pw-glass-bg border border-pw-border overflow-hidden">
              <div
                className="h-full bg-pw-primary transition-all duration-500 rounded-full"
                style={{ width: `${completeness}%` }}
              />
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-6 flex-1">
            {/* Name fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-pw-muted uppercase tracking-wider mb-2">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="glass-input w-full text-sm px-4 h-10 rounded-lg text-pw-black focus:ring-2 focus:ring-pw-primary focus:outline-none transition-all duration-150"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-pw-muted uppercase tracking-wider mb-2">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="glass-input w-full text-sm px-4 h-10 rounded-lg text-pw-black focus:ring-2 focus:ring-pw-primary focus:outline-none transition-all duration-150"
                />
              </div>
            </div>

            {/* Contact fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-pw-muted uppercase tracking-wider mb-2">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="glass-input w-full text-sm px-4 h-10 rounded-lg text-pw-black placeholder:text-pw-muted/40 focus:ring-2 focus:ring-pw-primary focus:outline-none transition-all duration-150"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-pw-muted uppercase tracking-wider mb-2">Company Name</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Realty Corp LLC"
                  className="glass-input w-full text-sm px-4 h-10 rounded-lg text-pw-black placeholder:text-pw-muted/40 focus:ring-2 focus:ring-pw-primary focus:outline-none transition-all duration-150"
                />
              </div>
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="block text-xs font-semibold text-pw-muted uppercase tracking-wider mb-2">Email Address</label>
              <div className="glass-input w-full text-sm px-4 h-10 rounded-lg text-pw-muted/70 flex items-center gap-2 cursor-not-allowed">
                <span className="material-symbols-outlined text-[16px] text-pw-muted/50">lock</span>
                {user?.email}
              </div>
            </div>

            {/* Submit */}
            <div className="flex items-center gap-4 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="luminous-button h-10 px-5 rounded-lg text-sm font-medium active:scale-98 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {saving ? (
                  <span className="material-symbols-outlined animate-spin text-[16px] select-none">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-[16px] select-none">save</span>
                )}
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
              {saved && (
                <span className="text-sm text-pw-primary flex items-center gap-1.5 animate-pulse">
                  <span className="material-symbols-outlined text-sm select-none">check_circle</span>
                  Profile updated successfully.
                </span>
              )}
            </div>
          </form>
        </section>

        {/* ════════════════════════════════════════════════
            3 · SECURITY CARD (col-span-5)
            ════════════════════════════════════════════════ */}
        <section className="col-span-12 lg:col-span-5 glass-card rounded-2xl p-6 flex flex-col relative overflow-hidden transition-all duration-200 hover:shadow-md">
          {/* Ambient glow */}
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-pw-primary/8 rounded-full blur-[100px] pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-pw-primary text-xl select-none">shield_lock</span>
              <h4 className="text-base font-semibold text-pw-black">Security</h4>
            </div>
          </div>

          {/* 2FA Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-pw-glass-bg/50 border border-white/5 mb-6">
            <div>
              <p className="text-sm font-semibold text-pw-black mb-0.5">Two-Factor Auth</p>
              <p className="text-xs text-pw-muted">
                {isMFAEnabled ? 'TOTP authenticator active' : 'Add an extra layer of protection'}
              </p>
            </div>
            <button
              onClick={() => isMFAEnabled ? setShowUnenrollModal(true) : setShowEnrollModal(true)}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer border
                ${isMFAEnabled ? 'bg-pw-primary/20 border-pw-primary/40' : 'bg-pw-glass-bg border-pw-border'}
              `}
              role="switch"
              aria-checked={isMFAEnabled}
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full transition-all duration-300 shadow-sm
                  ${isMFAEnabled ? 'translate-x-6 bg-pw-primary' : 'translate-x-1 bg-pw-muted'}
                `}
              />
            </button>
          </div>

          {/* MFA modals */}
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

          {/* ── Change Password ── */}
          <div className="border-b border-white/10 pb-3 mb-5">
            <h5 className="text-xs font-semibold text-pw-muted uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm select-none">lock_reset</span>
              Change Password
            </h5>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-4 flex-1">
            <div>
              <label className="block text-xs font-semibold text-pw-muted uppercase tracking-wider mb-2">Current Password</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={currentPwd}
                  onChange={(e) => setCurrentPwd(e.target.value)}
                  required
                  className="glass-input w-full text-sm px-4 h-10 rounded-lg pr-10 text-pw-black focus:ring-2 focus:ring-pw-primary focus:outline-none transition-all duration-150"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-pw-muted hover:text-pw-black transition-colors"
                >
                  <span className="material-symbols-outlined text-lg select-none">
                    {showPwd ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-pw-muted uppercase tracking-wider mb-2">New Password</label>
              <input
                type="password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                required
                minLength={8}
                className="glass-input w-full text-sm px-4 h-10 rounded-lg text-pw-black focus:ring-2 focus:ring-pw-primary focus:outline-none transition-all duration-150"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-pw-muted uppercase tracking-wider mb-2">Confirm New Password</label>
              <input
                type="password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                required
                minLength={8}
                className="glass-input w-full text-sm px-4 h-10 rounded-lg text-pw-black focus:ring-2 focus:ring-pw-primary focus:outline-none transition-all duration-150"
              />
            </div>

            {pwdError && (
              <p className="text-xs text-error bg-error/10 border border-error/30 rounded-lg px-4 py-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm select-none">error</span>
                {pwdError}
              </p>
            )}
            {pwdSuccess && (
              <p className="text-xs text-pw-primary bg-pw-primary/10 border border-pw-primary/25 rounded-lg px-4 py-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm select-none">check_circle</span>
                Password updated successfully.
              </p>
            )}

            <button
              type="submit"
              disabled={pwdLoading}
              className="w-full h-10 px-5 rounded-lg bg-pw-glass-bg hover:bg-pw-border/30 border border-white/10 text-pw-black text-sm font-medium active:scale-98 disabled:opacity-50 disabled:pointer-events-none transition-all flex justify-center items-center gap-2 cursor-pointer"
            >
              {pwdLoading && (
                <span className="material-symbols-outlined animate-spin text-[16px] select-none">progress_activity</span>
              )}
              <span className="material-symbols-outlined text-[16px]">key</span>
              {pwdLoading ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        </section>

        {/* ════════════════════════════════════════════════
            4 · ACTIVE SESSIONS (col-span-12)
            ════════════════════════════════════════════════ */}
        <section className="col-span-12 glass-card rounded-2xl p-6 relative overflow-hidden transition-all duration-200 hover:shadow-md">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-pw-primary text-xl select-none">devices</span>
              <h4 className="text-base font-semibold text-pw-black">Active Sessions</h4>
            </div>
            <p className="text-sm text-pw-muted">Manage external authentication and active device sessions.</p>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            {/* Current session card */}
            <div className="flex-1 bg-pw-glass-bg/30 border border-white/5 rounded-xl p-5 flex items-center justify-between hover:bg-pw-glass-bg/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-pw-primary/10 border border-pw-primary/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-pw-primary text-[20px]">computer</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-pw-black">This Device</p>
                  <p className="text-xs text-pw-primary/70 font-mono mt-0.5">Current session</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-pw-primary/10 text-pw-primary text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-pw-primary animate-pulse" />
                Active
              </span>
            </div>

            {/* Other sessions card */}
            <div className="flex-1 bg-pw-glass-bg/30 border border-white/5 rounded-xl p-5 flex items-center justify-between hover:bg-pw-glass-bg/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-pw-muted text-[20px]">devices_other</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-pw-black">Other Sessions</p>
                  <p className="text-xs text-pw-muted mt-0.5">Sign out everywhere else</p>
                </div>
              </div>
              <button
                onClick={handleRevokeSessions}
                disabled={revoking}
                className="h-10 px-5 text-pw-muted hover:text-error hover:bg-error/10 hover:border-error/30 border border-white/10 rounded-lg bg-white/5 active:scale-98 disabled:opacity-50 disabled:pointer-events-none transition-all text-sm font-medium cursor-pointer"
              >
                {revoking ? (
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined animate-spin text-[16px] select-none">progress_activity</span>
                    Revoking…
                  </span>
                ) : (
                  'Revoke All'
                )}
              </button>
            </div>
          </div>

          {revokeSuccess && (
            <p className="text-xs text-pw-primary flex items-center gap-1.5 animate-pulse mt-4">
              <span className="material-symbols-outlined text-[16px] select-none">check_circle</span>
              All other active sessions have been revoked.
            </p>
          )}
        </section>

        {/* ════════════════════════════════════════════════
            Claim History Section (col-span-12)
            ════════════════════════════════════════════════ */}
        <ClaimHistorySection />

        {/* ════════════════════════════════════════════════
            Deal Activity Timeline (col-span-12)
            ════════════════════════════════════════════════ */}
        <div className="col-span-12">
          <ActivityTimeline isCrossDeal={true} />
        </div>

        {/* ════════════════════════════════════════════════
            5 · GDPR DATA ERASURE (col-span-12)
            ════════════════════════════════════════════════ */}
        <section className="col-span-12 glass-card rounded-2xl p-6 border border-red-500/20 relative overflow-hidden transition-all duration-200 hover:shadow-md">
          <div className="absolute top-0 right-0 w-40 h-40 bg-red-500/5 rounded-full blur-[60px] -z-10 pointer-events-none translate-x-1/2 -translate-y-1/2" />

          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-red-400 text-xl select-none">delete_forever</span>
            <h4 className="text-base font-semibold text-pw-black">Data Erasure</h4>
          </div>
          <p className="text-sm text-pw-muted mb-6 leading-relaxed max-w-2xl">
            Permanently delete your PaperWorking account, projects, documents, and profile data. A 24-hour grace window is applied before the purge runs. Legal audit logs are retained for 7 years for compliance.
          </p>

          {/* Grace-period active banner */}
          {isDeletionPending && (
            <div className="mb-6 p-4 rounded-xl bg-amber-950/40 border border-amber-800/30 flex items-start gap-3">
              <span className="material-symbols-outlined text-amber-400 text-xl shrink-0 mt-0.5 select-none">warning</span>
              <div className="space-y-2 flex-1">
                <p className="text-sm font-semibold text-amber-300">
                  Deletion scheduled for {deletionDate?.toLocaleString() ?? '24 hours from now'}.
                </p>
                <p className="text-xs text-amber-300/80">All features remain active during this window. You can cancel below.</p>
                <button
                  onClick={handleCancelDeletion}
                  disabled={deleting}
                  className="mt-1 h-10 px-5 rounded-lg bg-amber-500 text-black hover:bg-amber-400 active:scale-98 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer text-sm font-medium"
                >
                  {deleting && <span className="material-symbols-outlined animate-spin text-[16px] select-none">progress_activity</span>}
                  Cancel Deletion Request
                </button>
              </div>
            </div>
          )}

          {/* Two-step confirmation flow */}
          {!isDeletionPending && !showDeleteConfirm && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="h-10 px-5 rounded-lg bg-error/10 border border-error/30 text-error text-sm font-medium hover:bg-error/20 active:scale-98 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] select-none">delete_forever</span>
              Request Data Erasure (GDPR)
            </button>
          )}

          {!isDeletionPending && showDeleteConfirm && (
            <div
              data-testid="delete-confirm-panel"
              className="p-5 rounded-xl bg-red-950/40 border border-red-500/30 space-y-4"
            >
              <p className="text-sm font-semibold text-red-300">
                Are you sure? This schedules permanent deletion of your account after a 24-hour grace period.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRequestErasure}
                  disabled={deleting}
                  className="h-10 px-5 rounded-lg bg-error text-white text-sm font-medium hover:bg-error/90 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                >
                  {deleting && <span className="material-symbols-outlined animate-spin text-[16px] select-none">progress_activity</span>}
                  Confirm Request
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="h-10 px-5 rounded-lg border border-white/10 text-pw-muted hover:text-pw-black text-sm font-medium active:scale-98 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ─── Modals ─── */}
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
