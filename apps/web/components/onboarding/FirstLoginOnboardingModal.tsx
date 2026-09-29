'use client';

import React, { useState, useEffect, useRef, ChangeEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export interface FirstLoginOnboardingModalProps {
  forceOpen?: boolean;
  onComplete?: () => void;
}

export function FirstLoginOnboardingModal({
  forceOpen = false,
  onComplete,
}: FirstLoginOnboardingModalProps) {
  const { profile: authProfile, authenticated, loading: authLoading } = useAuth();

  const [isOpen, setIsOpen] = useState(forceOpen);
  const [loading, setLoading] = useState(!forceOpen);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [displayName, setDisplayName] = useState((authProfile as any)?.name || (authProfile as any)?.displayName || '');
  const [avatarUrl, setAvatarUrl] = useState((authProfile as any)?.avatarUrl || (authProfile as any)?.photoURL || '');
  const [businessName, setBusinessName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [teamMemberEmail, setTeamMemberEmail] = useState('');
  const [teamMemberRole, setTeamMemberRole] = useState('Partner');

  const modalRef = useRef<HTMLDivElement>(null);
  const isInvestmentTeam =
    authProfile?.subscriptionPlan?.toLowerCase().includes('team') ||
    authProfile?.accountType?.toLowerCase() === 'team';

  useEffect(() => {
    if (authLoading || !authenticated) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function checkOnboardingStatus() {
      try {
        const res = await fetch('/api/marketplace/profile', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const p = data.profile || {};

          // Prefill name and avatar from profile or auth session (Google/Facebook provider)
          const resolvedName =
            p.displayName ||
            p.name ||
            (authProfile as any)?.name ||
            (authProfile as any)?.displayName ||
            'Alex Morgan';
          const resolvedAvatar =
            p.avatarUrl ||
            p.avatar ||
            (authProfile as any)?.avatarUrl ||
            (authProfile as any)?.photoURL ||
            '';
          const resolvedBusiness = p.businessName || p.companyName || '';
          const resolvedLogo = p.teamLogoUrl || '';

          if (isMounted) {
            setDisplayName(resolvedName);
            setAvatarUrl(resolvedAvatar);
            setBusinessName(resolvedBusiness);
            setLogoUrl(resolvedLogo);

            // Open if forced or if onboarding was not explicitly completed and businessName is not set
            const isCompleted = Boolean(p.onboardingCompleted);
            const needsSetup = forceOpen || (!isCompleted && !resolvedBusiness);

            // Check session storage to avoid annoyance if user dismissed in current session
            const sessionDismissed =
              typeof window !== 'undefined'
                ? window.sessionStorage?.getItem('pw_onboarding_dismissed') === 'true'
                : false;

            if (forceOpen || (needsSetup && !sessionDismissed)) {
              setIsOpen(true);
            }
          }
        }
      } catch (err) {
        console.warn('[FirstLoginOnboardingModal] Failed to query profile status:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    checkOnboardingStatus();

    return () => {
      isMounted = false;
    };
  }, [authLoading, authenticated, forceOpen]);

  // Trap focus and support Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleDismiss = () => {
    sessionStorage.setItem('pw_onboarding_dismissed', 'true');
    setIsOpen(false);
    if (onComplete) onComplete();
  };

  const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setLogoUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setAvatarUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) {
      setError('Please provide your business or entity name.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // 1. Persist business name, logo, avatar, and completion flag to profile
      const res = await fetch('/api/marketplace/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: displayName.trim(),
          businessName: businessName.trim(),
          avatarUrl: avatarUrl || undefined,
          teamLogoUrl: logoUrl || undefined,
          onboardingCompleted: true,
          profileType: isInvestmentTeam ? 'team' : 'individual',
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save business settings.');
      }

      // 2. If Investment Team and an email invite was entered, trigger invite
      if (isInvestmentTeam && teamMemberEmail.trim()) {
        try {
          await fetch('/api/invites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: teamMemberEmail.trim(),
              role: teamMemberRole,
            }),
          });
        } catch (inviteErr) {
          console.warn('[FirstLoginOnboardingModal] Non-blocking team invite warning:', inviteErr);
        }
      }

      sessionStorage.setItem('pw_onboarding_dismissed', 'true');
      setIsOpen(false);
      if (onComplete) onComplete();
    } catch (err: any) {
      setError(err?.message || 'Unable to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
    >
      <div
        ref={modalRef}
        data-testid="first-login-onboarding-modal"
        className="w-full max-w-xl rounded-2xl border border-white/15 bg-[#121014] p-6 shadow-2xl sm:p-8 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                Investor Setup
              </Badge>
              {isInvestmentTeam && (
                <Badge variant="outline" className="border-amber-500/30 text-amber-300">
                  Investment Team Tier
                </Badge>
              )}
            </div>
            <h2 id="onboarding-modal-title" className="mt-2 text-xl font-bold tracking-tight text-white sm:text-2xl">
              Welcome to PaperWorking
            </h2>
            <p className="mt-1 text-xs text-white/60">
              Configure your investor profile and business details to personalize your underwriting models and deal room documents.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white transition"
            aria-label="Close dialog"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* Identity & Avatar from Google / Facebook */}
          <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
              Account Identity
            </span>
            <div className="mt-3 flex items-center gap-4">
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-[#627C85]/20 text-sm font-bold text-white">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  <span>
                    {displayName
                      .split(/\s+/)
                      .map((p: string) => p[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase() || 'IN'}
                  </span>
                )}
              </div>
              <div className="flex-1 space-y-1.5">
                <label className="text-xs text-white/70 block">Your Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Investor or Principal Name"
                  className="w-full rounded-md border border-input bg-background/50 px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
                />
              </div>
              <div>
                <label className="cursor-pointer rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-[11px] font-medium text-white/80 hover:bg-white/10 transition inline-block">
                  Change Photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
            <p className="mt-2 text-[10px] text-white/40">
              Imported automatically from your authentication provider. You can update it anytime.
            </p>
          </div>

          {/* Question 1: What is your business name */}
          <div>
            <label className="text-xs font-semibold text-white block">
              What is your business name? <span className="text-rose-400">*</span>
            </label>
            <p className="text-[11px] text-white/50 mb-1.5">
              Enter the legal entity, fund, or operating company name that represents your real estate investments.
            </p>
            <input
              type="text"
              data-testid="onboarding-business-name-input"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Apex Commercial Capital Partners LLC"
              required
              className="w-full rounded-md border border-input bg-background/50 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
            />
          </div>

          {/* Question 2: Do you want to add your business logo */}
          <div>
            <label className="text-xs font-semibold text-white block">
              Do you want to add your business logo?
            </label>
            <p className="text-[11px] text-white/50 mb-2">
              Your logo appears on deal pitch decks, investor distributions, and underwriting summaries.
            </p>
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-black/40 p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoUrl} alt="Business logo preview" className="max-h-full max-w-full object-contain" />
                </div>
              ) : (
                <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/[0.02] text-[10px] text-white/40">
                  No Logo
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/15 transition">
                  <span className="material-symbols-outlined text-[16px]">upload</span>
                  <span>Upload Logo Image</span>
                  <input
                    type="file"
                    data-testid="onboarding-logo-upload"
                    accept="image/png,image/jpeg,image/svg+xml"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => setLogoUrl('')}
                    className="text-left text-[11px] text-rose-400 hover:underline"
                  >
                    Remove logo
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Question 3: For people who get the Investment Team tier */}
          {isInvestmentTeam && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-amber-300">group_add</span>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-200">
                  Investment Team Collaboration Seats
                </span>
              </div>
              <p className="text-[11px] text-white/70">
                Your Investment Team subscription includes shared project workspaces and role-based seats. Invite your first team partner or CPA now:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-8">
                  <input
                    type="email"
                    data-testid="onboarding-team-invite-email"
                    placeholder="partner@yourfirm.com"
                    value={teamMemberEmail}
                    onChange={(e) => setTeamMemberEmail(e.target.value)}
                    className="w-full rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-xs text-white placeholder-white/40 focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-4">
                  <select
                    value={teamMemberRole}
                    onChange={(e) => setTeamMemberRole(e.target.value)}
                    className="w-full rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                  >
                    <option value="Partner">Partner</option>
                    <option value="CPA">CPA / Tax Professional</option>
                    <option value="Acquisition Analyst">Acquisition Analyst</option>
                    <option value="General Contractor">General Contractor</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={handleDismiss}
              className="text-xs text-white/50 hover:text-white transition"
            >
              Skip for now
            </button>
            <div className="flex gap-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                data-testid="onboarding-submit-button"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save & Enter Workspace'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
