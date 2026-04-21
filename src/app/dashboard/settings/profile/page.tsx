'use client';

import { useState } from 'react';
import { Save, Loader2, Eye, EyeOff, Shield, ShieldCheck, Monitor, Smartphone, MapPin, X, Camera } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { db } from '@/lib/firebase/config';

/* ═══════════════════════════════════════════════════════
   Profile & Security Settings

   Three cards:
   1. User Details — name, phone, company, avatar
   2. Authentication & Security — password, 2FA toggle
   3. Active Sessions — placeholder device list
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
    } catch (err: any) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setPwdError('Current password is incorrect.');
      } else if (err.code === 'auth/weak-password') {
        setPwdError('New password is too weak. Use at least 8 characters.');
      } else {
        setPwdError('Failed to update password. Please try again.');
      }
    } finally {
      setPwdLoading(false);
    }
  };

  // ─── Mock Sessions ────────────────────────────────────
  const sessions = [
    { id: '1', device: 'MacBook Pro',   location: 'New York, NY',     icon: Monitor,    current: true  },
    { id: '2', device: 'iPhone 15 Pro', location: 'New York, NY',     icon: Smartphone, current: false },
    { id: '3', device: 'Windows PC',    location: 'Los Angeles, CA',  icon: Monitor,    current: false },
  ];

  return (
    <div className="space-y-6">

      {/* ═══ Card 1: User Details ═══ */}
      <section className="bg-white border border-pw-border p-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-pw-muted mb-6">
          Personal Information
        </h2>

        <form onSubmit={handleSaveProfile} className="space-y-5">
          {/* Avatar */}
          <div className="flex items-center gap-5 mb-2">
            <div className="relative group">
              <div className="w-16 h-16 rounded-full bg-pw-fg text-white flex items-center justify-center text-lg font-bold">
                {initials}
              </div>
              <button
                type="button"
                className="absolute inset-0 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                title="Upload photo"
              >
                <Camera className="w-5 h-5" />
              </button>
            </div>
            <div>
              <p className="text-sm font-medium text-pw-black">{firstName} {lastName}</p>
              <p className="text-xs text-pw-muted">{user?.email}</p>
            </div>
          </div>

          {/* Name fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-pw-muted mb-1">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full text-sm bg-pw-bg border border-pw-border px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-pw-black"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-pw-muted mb-1">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full text-sm bg-pw-bg border border-pw-border px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-pw-black"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-pw-muted mb-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className="w-full text-sm bg-pw-bg border border-pw-border px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-pw-black"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-pw-muted mb-1">Company Name</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Realty Corp LLC"
                className="w-full text-sm bg-pw-bg border border-pw-border px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-pw-black"
              />
            </div>
          </div>

          {/* Save */}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 bg-pw-black text-white text-sm font-medium px-5 py-2.5 hover:opacity-90 transition disabled:opacity-50"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              ) : (
                <><Save className="w-4 h-4" /> Save Changes</>
              )}
            </button>
            {saved && (
              <span className="text-sm text-green-700">Profile updated.</span>
            )}
          </div>
        </form>
      </section>

      {/* ═══ Card 2: Authentication & Security ═══ */}
      <section className="bg-white border border-pw-border p-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-pw-muted mb-6">
          Authentication & Security
        </h2>

        {/* 2FA Toggle */}
        <div className="flex items-center justify-between py-4 border-b border-pw-border mb-6">
          <div className="flex items-center gap-3">
            {twoFAEnabled ? (
              <ShieldCheck className="w-5 h-5 text-green-600" />
            ) : (
              <Shield className="w-5 h-5 text-pw-muted" />
            )}
            <div>
              <p className="text-sm font-medium text-pw-black">Two-Factor Authentication</p>
              <p className="text-xs text-pw-muted">
                {twoFAEnabled ? 'Enabled — your account is protected' : 'Add an extra layer of security to your account'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setTwoFAEnabled(!twoFAEnabled)}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer
              ${twoFAEnabled ? 'bg-green-600' : 'bg-pw-border'}
            `}
            role="switch"
            aria-checked={twoFAEnabled}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm
                ${twoFAEnabled ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        </div>

        {/* Password Change Form */}
        <h3 className="text-xs font-semibold text-pw-muted uppercase tracking-wider mb-4">
          Change Password
        </h3>

        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-semibold text-pw-muted mb-1">Current Password</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                required
                className="w-full text-sm bg-pw-bg border border-pw-border px-3 py-2.5 pr-10 focus:outline-none focus:ring-1 focus:ring-pw-black"
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-pw-muted hover:text-pw-fg"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-pw-muted mb-1">New Password</label>
            <input
              type="password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              required
              minLength={8}
              className="w-full text-sm bg-pw-bg border border-pw-border px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-pw-black"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-pw-muted mb-1">Confirm New Password</label>
            <input
              type="password"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              required
              minLength={8}
              className="w-full text-sm bg-pw-bg border border-pw-border px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-pw-black"
            />
          </div>

          {pwdError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2">{pwdError}</p>
          )}
          {pwdSuccess && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2">Password updated successfully.</p>
          )}

          <button
            type="submit"
            disabled={pwdLoading}
            className="inline-flex items-center gap-2 bg-pw-black text-white text-sm font-medium px-5 py-2.5 hover:opacity-90 transition disabled:opacity-50"
          >
            {pwdLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Updating…</>
            ) : (
              'Update Password'
            )}
          </button>
        </form>
      </section>

      {/* ═══ Card 3: Active Sessions ═══ */}
      <section className="bg-white border border-pw-border p-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-pw-muted mb-6">
          Active Sessions
        </h2>

        <div className="space-y-0 divide-y divide-pw-border">
          {sessions.map((session) => (
            <div key={session.id} className="flex items-center gap-4 py-3.5">
              <session.icon className="w-5 h-5 text-pw-muted flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-pw-black">
                  {session.device}
                  {session.current && (
                    <span className="ml-2 text-xs text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5">
                      This device
                    </span>
                  )}
                </p>
                <p className="text-xs text-pw-muted flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {session.location}
                </p>
              </div>
              {!session.current && (
                <button className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium transition-colors">
                  <X className="w-3.5 h-3.5" /> End Session
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
