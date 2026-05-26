'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { db } from '@/lib/firebase/config';

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

  // ─── 2FA State ────────────────────────────────────────
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);

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
      {/* ─── Grid Layout ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Personal Information (Form) */}
        <div className="lg:col-span-7 space-y-8">
          <section className="glass-card p-6 sm:p-8 rounded-2xl relative overflow-hidden">
            <h2 className="text-xs font-bold uppercase tracking-widest text-pw-primary mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-base">manage_accounts</span>
              Personal Information
            </h2>

            <form onSubmit={handleSaveProfile} className="space-y-6">
              {/* Avatar & Email */}
              <div className="flex items-center gap-5 pb-4 border-b border-pw-border/50">
                <div className="relative group">
                  <div className="w-16 h-16 rounded-full bg-pw-glass-bg border border-pw-border text-pw-primary flex items-center justify-center text-xl font-bold transition-all shadow-sm shadow-pw-primary/20">
                    {initials}
                  </div>
                  <button
                    type="button"
                    className="absolute inset-0 rounded-full bg-pw-black/60 text-pw-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border border-pw-primary/30"
                    title="Upload photo"
                  >
                    <span className="material-symbols-outlined text-lg">photo_camera</span>
                  </button>
                </div>
                <div>
                  <p className="text-sm font-semibold text-pw-black">{firstName} {lastName}</p>
                  <p className="text-xs text-pw-muted mt-0.5">{user?.email}</p>
                </div>
              </div>

              {/* Name fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-pw-muted uppercase tracking-wider mb-2">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="glass-input w-full text-sm px-4 py-3 text-pw-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-pw-muted uppercase tracking-wider mb-2">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="glass-input w-full text-sm px-4 py-3 text-pw-black"
                  />
                </div>
              </div>

              {/* Contact fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-pw-muted uppercase tracking-wider mb-2">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                    className="glass-input w-full text-sm px-4 py-3 text-pw-black placeholder:text-pw-muted/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-pw-muted uppercase tracking-wider mb-2">Company Name</label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Realty Corp LLC"
                    className="glass-input w-full text-sm px-4 py-3 text-pw-black placeholder:text-pw-muted/40"
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="flex items-center gap-4 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="luminous-button w-full sm:w-auto inline-flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-lg disabled:opacity-50 cursor-pointer"
                >
                  {saving ? (
                    <span className="material-symbols-outlined animate-spin text-sm select-none">progress_activity</span>
                  ) : (
                    <span className="material-symbols-outlined text-sm select-none">save</span>
                  )}
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
                {saved && (
                  <span className="text-xs text-pw-primary flex items-center gap-1.5 animate-pulse">
                    <span className="material-symbols-outlined text-xs select-none">check_circle</span>
                    Profile updated successfully.
                  </span>
                )}
              </div>
            </form>
          </section>
        </div>

        {/* Right Column: Account Stats, Security, and Sessions */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* Card A: Account Completeness & Overview */}
          <section className="glass-card p-6 sm:p-8 rounded-2xl relative overflow-hidden">
            <h2 className="text-xs font-bold uppercase tracking-widest text-pw-primary mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-base">analytics</span>
              Account Overview
            </h2>

            <div className="space-y-6">
              {/* Profile completeness progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-pw-muted font-medium">Profile Completeness</span>
                  <span className="text-pw-primary font-bold">{completeness}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-pw-glass-bg border border-pw-border overflow-hidden">
                  <div 
                    className="h-full bg-pw-primary transition-all duration-500 rounded-full" 
                    style={{ width: `${completeness}%` }}
                  />
                </div>
              </div>

              {/* Details table / grid */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-pw-border/50">
                <div className="space-y-1">
                  <span className="text-xs text-pw-muted">Access Role</span>
                  <p className="text-sm font-semibold text-pw-black">{profile?.role || 'Investment Lead'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-pw-muted">Account Status</span>
                  <p className="text-sm font-semibold text-pw-primary flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-pw-primary animate-ping" />
                    Active
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-pw-muted">Security Tier</span>
                  <p className="text-sm font-semibold text-pw-black">
                    {twoFAEnabled ? 'Enhanced (2FA)' : 'Standard'}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-pw-muted">Joined Date</span>
                  <p className="text-sm font-semibold text-pw-black">
                    {profile?.createdAt ? new Date(profile.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Card B: Authentication & Security */}
          <section className="glass-card p-6 sm:p-8 rounded-2xl relative overflow-hidden">
            <h2 className="text-xs font-bold uppercase tracking-widest text-pw-primary mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-base">security</span>
              Authentication & Security
            </h2>

            {/* 2FA Toggle */}
            <div className="flex items-center justify-between py-4 border-b border-pw-border/50 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-pw-glass-bg border border-pw-border flex items-center justify-center text-pw-muted">
                  <span className="material-symbols-outlined text-lg select-none">
                    {twoFAEnabled ? 'verified_user' : 'shield'}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-pw-black">Two-Factor Auth</p>
                  <p className="text-xs text-pw-muted mt-0.5">
                    {twoFAEnabled ? 'Protected' : 'Add shield layer'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTwoFAEnabled(!twoFAEnabled)}
                className={`
                  relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer border
                  ${twoFAEnabled ? 'bg-pw-primary/20 border-pw-primary/40' : 'bg-pw-glass-bg border-pw-border'}
                `}
                role="switch"
                aria-checked={twoFAEnabled}
              >
                <span
                  className={`
                    inline-block h-4 w-4 transform rounded-full transition-all duration-300 shadow-sm
                    ${twoFAEnabled ? 'translate-x-6 bg-pw-primary' : 'translate-x-1 bg-pw-muted'}
                  `}
                />
              </button>
            </div>

            {/* Password Change Form */}
            <h3 className="text-xs font-bold text-pw-muted uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm select-none">lock_reset</span>
              Change Password
            </h3>

            <form onSubmit={handlePasswordChange} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-pw-muted uppercase tracking-wider mb-2">Current Password</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={currentPwd}
                    onChange={(e) => setCurrentPwd(e.target.value)}
                    required
                    className="glass-input w-full text-sm px-4 py-3 pr-10 text-pw-black"
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
                <label className="block text-xs font-bold text-pw-muted uppercase tracking-wider mb-2">New Password</label>
                <input
                  type="password"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  required
                  minLength={8}
                  className="glass-input w-full text-sm px-4 py-3 text-pw-black"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-pw-muted uppercase tracking-wider mb-2">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  required
                  minLength={8}
                  className="glass-input w-full text-sm px-4 py-3 text-pw-black"
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
                className="luminous-button w-full inline-flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-lg disabled:opacity-50 cursor-pointer"
              >
                {pwdLoading && (
                  <span className="material-symbols-outlined animate-spin text-sm select-none">progress_activity</span>
                )}
                {pwdLoading ? 'Updating…' : 'Update Password'}
              </button>
            </form>
          </section>

          {/* Card C: Active Sessions */}
          <section className="glass-card p-6 sm:p-8 rounded-2xl relative overflow-hidden">
            <h2 className="text-xs font-bold uppercase tracking-widest text-pw-primary mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-base">devices</span>
              Device Sessions
            </h2>

            <div className="space-y-4">
              <p className="text-xs text-pw-muted leading-relaxed">
                Sign out of all other active sessions across your devices. This will invalidate all your refresh tokens immediately.
              </p>
              
              <button
                onClick={handleRevokeSessions}
                disabled={revoking}
                className="w-full inline-flex items-center justify-center gap-2 bg-error/10 border border-error/30 text-error hover:bg-error/20 text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
              >
                {revoking ? (
                  <span className="material-symbols-outlined animate-spin text-sm select-none">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-sm select-none">logout</span>
                )}
                {revoking ? 'Revoking…' : 'Revoke All Other Sessions'}
              </button>
              
              {revokeSuccess && (
                <p className="text-xs text-pw-primary flex items-center gap-1.5 animate-pulse mt-2">
                  <span className="material-symbols-outlined text-xs select-none">check_circle</span>
                  All other active sessions have been revoked.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

