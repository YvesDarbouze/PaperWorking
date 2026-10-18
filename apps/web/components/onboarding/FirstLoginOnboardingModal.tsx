'use client';

import React, { useState, useEffect, useRef, useMemo, ChangeEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { X, UploadSimple, UserPlus, Briefcase, Check } from '@phosphor-icons/react';
import { CANONICAL_VENDOR_PROFESSIONS } from '@/lib/marketplace/vendor-professions';

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
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [skillsSearchQuery, setSkillsSearchQuery] = useState('');

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
            if (Array.isArray(p.vendorSkills)) {
              setSelectedSkills(p.vendorSkills);
            }

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

  const resizeImage = (file: File, maxWidth = 800): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL(file.type, 0.8));
        };
        img.onerror = () => reject(new Error('Failed to parse image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleLogoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const resized = await resizeImage(file, 400);
        setLogoUrl(resized);
      } catch (err) {
        console.error('Logo resize failed', err);
      }
    }
  };

  const handleAvatarUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const resized = await resizeImage(file, 400);
        setAvatarUrl(resized);
      } catch (err) {
        console.error('Avatar resize failed', err);
      }
    }
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) => {
      if (prev.includes(skill)) {
        return prev.filter((s) => s !== skill);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, skill];
    });
  };

  const filteredSkills = useMemo(() => {
    if (!skillsSearchQuery.trim()) return CANONICAL_VENDOR_PROFESSIONS;
    const q = skillsSearchQuery.toLowerCase().trim();
    return CANONICAL_VENDOR_PROFESSIONS.filter((prof) => prof.toLowerCase().includes(q));
  }, [skillsSearchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) {
      setError('Please provide your business or entity name.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // 1. Persist business name, logo, avatar, completion flag, and 1-3 vendor skills to profile
      const res = await fetch('/api/marketplace/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: displayName.trim(),
          businessName: businessName.trim(),
          avatarUrl: avatarUrl || undefined,
          teamLogoUrl: logoUrl || undefined,
          onboardingCompleted: true,
          profileType: isInvestmentTeam ? 'team' : 'individual',
          vendorSkills: selectedSkills,
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
        className="w-full max-w-xl rounded-none border border-neutral-800 bg-neutral-950 p-6 shadow-2xl sm:p-8 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-4 border-b border-neutral-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-none">
                Investor Setup
              </Badge>
              {isInvestmentTeam && (
                <Badge variant="outline" className="rounded-none border-amber-500/30 text-amber-300">
                  Investment Team Tier
                </Badge>
              )}
            </div>
            <h2 id="onboarding-modal-title" className="mt-2 text-xl font-bold tracking-tight text-neutral-100 sm:text-2xl">
              Welcome to PaperWorking
            </h2>
            <p className="mt-1 text-xs text-neutral-400">
              Configure your investor profile and business details to personalize your underwriting models and deal room documents.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-none text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100 transition"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-none border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* Identity & Avatar from Google / Facebook */}
          <div className="rounded-none border border-neutral-800 bg-neutral-900/40 p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Account Identity
            </span>
            <div
              data-testid="onboarding-identity-row"
              className="mt-3 flex flex-wrap sm:flex-nowrap items-end gap-4"
            >
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-none border border-neutral-700 bg-neutral-800 text-sm font-bold text-neutral-200">
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
              <div className="flex-1 min-w-[180px] space-y-1.5">
                <label htmlFor="onboarding-display-name" className="text-xs text-neutral-300 block">Your Name</label>
                <input
                  id="onboarding-display-name"
                  data-testid="onboarding-display-name-input"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Investor or Principal Name"
                  className="h-11 min-h-[44px] w-full rounded-none border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-base md:text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-600 focus:outline-none"
                />
              </div>
              <div className="shrink-0 self-end">
                <label
                  htmlFor="onboarding-avatar-upload"
                  data-testid="onboarding-change-photo-btn"
                  className="h-11 min-h-[44px] self-end cursor-pointer rounded-none border border-neutral-800 bg-neutral-900 px-3 py-2 text-[11px] font-medium text-neutral-300 hover:bg-neutral-800 transition inline-flex items-center justify-center whitespace-nowrap"
                >
                  Change Photo
                  <input
                    id="onboarding-avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
            <p className="mt-2 text-[10px] text-neutral-500">
              Imported automatically from your authentication provider. You can update it anytime.
            </p>
          </div>

          {/* Question 1: What is your business name */}
          <div>
            <label htmlFor="onboarding-business-name" className="text-xs font-semibold text-neutral-200 block">
              What is your business name? <span className="text-rose-400">*</span>
            </label>
            <p className="text-[11px] text-neutral-400 mb-1.5">
              Enter the legal entity, fund, or operating company name that represents your real estate investments.
            </p>
            <input
              id="onboarding-business-name"
              type="text"
              data-testid="onboarding-business-name-input"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Apex Commercial Capital Partners LLC"
              required
              className="w-full rounded-none border border-neutral-800 bg-neutral-900 px-3.5 py-2.5 text-base md:text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-600 focus:outline-none min-h-[44px]"
            />
          </div>

          {/* Question 2: Do you want to add your business logo */}
          <div>
            <span className="text-xs font-semibold text-neutral-200 block">
              Do you want to add your business logo?
            </span>
            <p className="text-[11px] text-neutral-400 mb-2">
              Your logo appears on deal pitch decks, investor distributions, and underwriting summaries.
            </p>
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-none border border-neutral-800 bg-neutral-900 p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoUrl} alt="Business logo preview" className="max-h-full max-w-full object-contain" />
                </div>
              ) : (
                <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-none border border-dashed border-neutral-800 bg-neutral-900/50 text-[10px] text-neutral-500">
                  No Logo
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="onboarding-logo-upload-input" className="cursor-pointer inline-flex items-center gap-1.5 rounded-none border border-neutral-800 bg-neutral-900 px-3.5 py-2 text-xs font-semibold text-neutral-200 hover:bg-neutral-800 transition min-h-[44px]">
                  <UploadSimple className="h-4 w-4 text-neutral-400" />
                  <span>Upload Logo Image</span>
                  <input
                    id="onboarding-logo-upload-input"
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

          {/* Question 3: Vendor Directory & Professional Skills (1 to 3 skills) */}
          <div className="rounded-none border border-neutral-800 bg-neutral-900/40 p-4 space-y-3" data-testid="onboarding-vendor-skills-section">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-neutral-300" />
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-200">
                  Vendor Directory Skills (1–3 Skills)
                </span>
              </div>
              <Badge
                variant="outline"
                className={`rounded-none text-[11px] ${
                  selectedSkills.length >= 1 ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' : 'border-neutral-700 text-neutral-400'
                }`}
                data-testid="onboarding-skills-count-badge"
              >
                {selectedSkills.length}/3 Selected
              </Badge>
            </div>
            <p className="text-[11px] text-neutral-400">
              Every PaperWorking account can list on the Vendor Directory to offer professional or trade services. Identify 1 to 3 professions from PaperWorking&apos;s directory to list your skills in search engines. If you do not select skills, you cannot post on the directory (you can edit anytime in Settings).
            </p>

            {/* Selected skill chips */}
            {selectedSkills.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {selectedSkills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 rounded-none border border-neutral-600 bg-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-100"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className="text-neutral-400 hover:text-neutral-100 min-h-[24px] min-w-[24px] flex items-center justify-center"
                      aria-label={`Remove ${skill}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  onClick={() => setSelectedSkills([])}
                  className="text-[11px] text-neutral-400 hover:text-neutral-200 underline ml-1"
                >
                  Clear
                </button>
              </div>
            )}

            {/* Search/filter input */}
            <div className="relative">
              <input
                type="text"
                data-testid="onboarding-skills-search-input"
                placeholder="Search 38 certified professions (e.g. Electrician, Attorney, General Contractor)..."
                value={skillsSearchQuery}
                onChange={(e) => setSkillsSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape' && skillsSearchQuery) {
                    e.preventDefault();
                    setSkillsSearchQuery('');
                  }
                }}
                className="w-full rounded-none border border-neutral-800 bg-neutral-900 py-2 pl-3 pr-11 text-base md:text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-600 focus:outline-none min-h-[44px]"
              />
              {skillsSearchQuery.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setSkillsSearchQuery('')}
                  aria-label="Clear search"
                  data-testid="clear-onboarding-skills-search-btn"
                  className="absolute right-0 top-0 bottom-0 flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-none text-neutral-400 transition hover:text-neutral-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400"
                >
                  <X size={14} weight="bold" />
                </button>
              ) : null}
            </div>

            {/* Scrollable grid of skills */}
            <div className="max-h-44 overflow-y-auto rounded-none border border-neutral-800 bg-neutral-950/60 p-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {filteredSkills.map((profession) => {
                  const isSelected = selectedSkills.includes(profession);
                  const isDisabled = !isSelected && selectedSkills.length >= 3;
                  return (
                    <button
                      key={profession}
                      type="button"
                      data-testid={`skill-pill-${profession.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                      disabled={isDisabled}
                      onClick={() => toggleSkill(profession)}
                      className={`flex items-center justify-between text-left px-2.5 py-1.5 text-xs transition rounded-none min-h-[36px] ${
                        isSelected
                          ? 'border border-neutral-400 bg-neutral-800 text-neutral-100 font-semibold'
                          : isDisabled
                            ? 'border border-transparent text-neutral-600 cursor-not-allowed opacity-40'
                            : 'border border-neutral-800/80 bg-neutral-900/60 text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100'
                      }`}
                    >
                      <span className="truncate">{profession}</span>
                      {isSelected ? (
                        <Check className="h-3.5 w-3.5 text-neutral-100 shrink-0 ml-1" />
                      ) : null}
                    </button>
                  );
                })}
                {filteredSkills.length === 0 && (
                  <p className="col-span-2 py-3 text-center text-xs text-neutral-500">
                    No matching professions found.
                  </p>
                )}
              </div>
            </div>

            {/* Directory listing status message */}
            <div className="text-[11px] pt-1">
              {selectedSkills.length >= 1 ? (
                <span className="text-emerald-400 flex items-center gap-1 font-medium">
                  <Check className="h-3.5 w-3.5" />
                  Active: Your profile will be listed on the Vendor Directory under your {selectedSkills.length} selected skill{selectedSkills.length > 1 ? 's' : ''}.
                </span>
              ) : (
                <span className="text-neutral-400">
                  Unlisted: Without skills, you cannot post on the Vendor Directory. You can select 1–3 skills anytime in Settings.
                </span>
              )}
            </div>
          </div>

          {/* Question 4: For people who get the Investment Team tier */}
          {isInvestmentTeam && (
            <div className="rounded-none border border-amber-500/20 bg-amber-500/[0.04] p-4 space-y-3">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-amber-300" />
                <span className="text-xs font-bold uppercase tracking-wider text-amber-200">
                  Investment Team Collaboration Seats
                </span>
              </div>
              <p className="text-[11px] text-neutral-300">
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
                    className="w-full rounded-none border border-neutral-800 bg-neutral-900 px-3 py-2 text-base md:text-xs text-neutral-100 placeholder-neutral-500 focus:border-amber-400 focus:outline-none min-h-[44px]"
                  />
                </div>
                <div className="sm:col-span-4">
                  <select
                    value={teamMemberRole}
                    onChange={(e) => setTeamMemberRole(e.target.value)}
                    className="w-full cursor-pointer rounded-none border border-neutral-800 bg-neutral-900 px-3 py-2 text-base md:text-xs text-neutral-100 focus:border-amber-400 focus:outline-none min-h-[44px]"
                  >
                    <option value="Partner" className="bg-neutral-950">Partner</option>
                    <option value="CPA" className="bg-neutral-950">CPA / Tax Professional</option>
                    <option value="Acquisition Analyst" className="bg-neutral-950">Acquisition Analyst</option>
                    <option value="General Contractor" className="bg-neutral-950">General Contractor</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-neutral-800 pt-4">
            <button
              type="button"
              onClick={handleDismiss}
              className="text-xs text-neutral-400 hover:text-neutral-100 transition min-h-[44px] flex items-center"
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
                className="rounded-none min-h-[44px]"
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
