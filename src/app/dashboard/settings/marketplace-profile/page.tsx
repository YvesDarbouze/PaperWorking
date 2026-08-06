'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { STRATEGY_LABELS, type InvestmentStrategy } from '@/lib/marketplace/investorProfile';

/* ═══════════════════════════════════════════════════════════════════════════
   Marketplace profile editor — requirement 4's write path.

   Lives under Settings because that is where the rest of the account surfaces
   are; the public read surfaces stay at /marketplace/investors.

   `isVerified` is intentionally not editable here — verification is an admin
   decision, and a self-serve badge would be worthless.
   ═══════════════════════════════════════════════════════════════════════════ */

interface Member {
  uid?: string;
  displayName: string;
  role: string;
  invitedEmail?: string;
}

interface Draft {
  profileType: 'individual' | 'team';
  businessName: string;
  teamLogoUrl: string;
  publicBio: string;
  location: string;
  websiteUrl: string;
  strategies: InvestmentStrategy[];
  publicProfile: boolean;
  showRoiPublicly: boolean;
  teamMembers: Member[];
}

const EMPTY: Draft = {
  profileType: 'individual',
  businessName: '',
  teamLogoUrl: '',
  publicBio: '',
  location: '',
  websiteUrl: '',
  strategies: [],
  publicProfile: false,
  showRoiPublicly: false,
  teamMembers: [],
};

/* Inline sizing throughout: globals.css styles `input`/`select` outside any
   cascade layer with `width: 100%`, which beats Tailwind's layered utilities. */
const FIELD: React.CSSProperties = {
  background: '#111111',
  border: '1px solid var(--pw-border)',
  width: '100%',
  padding: '0 12px',
  minHeight: 40,
  borderRadius: 10,
  color: '#fff',
  fontSize: 14,
};

export default function MarketplaceProfileEditorPage() {
  const { user } = useAuth();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      try {
        const idToken = await user.getIdToken();
        const res = await fetch('/api/marketplace/profile', {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        const data = (await res.json()) as { profile?: Partial<Draft> & { isVerified?: boolean } };
        if (cancelled || !data.profile) return;
        const p = data.profile;
        setIsVerified(p.isVerified === true);
        setDraft({
          profileType: p.profileType === 'team' ? 'team' : 'individual',
          businessName: p.businessName ?? '',
          teamLogoUrl: p.teamLogoUrl ?? '',
          publicBio: p.publicBio ?? '',
          location: p.location ?? '',
          websiteUrl: p.websiteUrl ?? '',
          strategies: p.strategies ?? [],
          publicProfile: p.publicProfile === true,
          showRoiPublicly: p.showRoiPublicly === true,
          teamMembers: p.teamMembers ?? [],
        });
      } catch (err) {
        console.error('[marketplace profile] load failed', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const toggleStrategy = (s: InvestmentStrategy) =>
    setDraft((d) => ({
      ...d,
      strategies: d.strategies.includes(s)
        ? d.strategies.filter((x) => x !== s)
        : [...d.strategies, s],
    }));

  const save = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/marketplace/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `Server error ${res.status}`);
      toast.success('Marketplace profile saved.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  }, [user, draft]);

  if (loading) {
    return <div className="h-40 rounded-2xl animate-pulse" style={{ background: 'var(--pw-surface)' }} />;
  }

  const isTeam = draft.profileType === 'team';

  return (
    <div className="w-full space-y-6" data-testid="marketplace-profile-editor">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-on-surface)]">
          Marketplace Profile
        </h1>
        <p className="text-sm text-[var(--color-on-surface-variant)] mt-1">
          How you appear to other investors at /marketplace/investors.
        </p>
      </div>

      {/* ── Profile type ── */}
      <section className="rounded-2xl border p-5 space-y-3" style={{ borderColor: 'var(--pw-border)' }}>
        <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
          Profile type
        </h2>
        <div className="flex gap-3">
          {(['individual', 'team'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => set('profileType', t)}
              aria-pressed={draft.profileType === t}
              data-testid={`profile-type-${t}`}
              className={`pw-interactive-custom h-10 px-4 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                draft.profileType === t ? 'bg-slate-100 text-slate-900' : 'border text-white hover:bg-white/5'
              }`}
              style={draft.profileType === t ? undefined : { borderColor: 'var(--pw-border)' }}
            >
              {t === 'individual' ? 'Individual Investor' : 'Investment Team'}
            </button>
          ))}
        </div>
      </section>

      {/* ── Identity ── */}
      <section className="rounded-2xl border p-5 space-y-4" style={{ borderColor: 'var(--pw-border)' }}>
        <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
          Identity
        </h2>

        {isTeam && (
          <>
            <label className="block">
              <span className="text-xs text-slate-400">Business name</span>
              <input
                value={draft.businessName}
                onChange={(e) => set('businessName', e.target.value)}
                placeholder="Apex Capital"
                data-testid="field-business-name"
                style={{ ...FIELD, marginTop: 6 }}
              />
            </label>
            <label className="block">
              <span className="text-xs text-slate-400">Team logo URL</span>
              <input
                value={draft.teamLogoUrl}
                onChange={(e) => set('teamLogoUrl', e.target.value)}
                placeholder="https://…"
                data-testid="field-team-logo"
                style={{ ...FIELD, marginTop: 6 }}
              />
            </label>
          </>
        )}

        <label className="block">
          <span className="text-xs text-slate-400">Public bio</span>
          <textarea
            value={draft.publicBio}
            onChange={(e) => set('publicBio', e.target.value)}
            maxLength={600}
            rows={3}
            placeholder="Value-add multifamily across the Sun Belt."
            data-testid="field-bio"
            style={{ ...FIELD, marginTop: 6, padding: '10px 12px', minHeight: 80, resize: 'vertical' }}
          />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs text-slate-400">Location</span>
            <input
              value={draft.location}
              onChange={(e) => set('location', e.target.value)}
              placeholder="Austin, TX"
              data-testid="field-location"
              style={{ ...FIELD, marginTop: 6 }}
            />
          </label>
          <label className="block">
            <span className="text-xs text-slate-400">Website</span>
            <input
              value={draft.websiteUrl}
              onChange={(e) => set('websiteUrl', e.target.value)}
              placeholder="https://example.com"
              data-testid="field-website"
              style={{ ...FIELD, marginTop: 6 }}
            />
          </label>
        </div>

        {isVerified && (
          <p className="text-xs text-slate-500">
            Your profile is verified. Verification is granted by review and cannot be
            changed here.
          </p>
        )}
      </section>

      {/* ── Strategy ── */}
      <section className="rounded-2xl border p-5 space-y-3" style={{ borderColor: 'var(--pw-border)' }}>
        <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
          Investment strategy
        </h2>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(STRATEGY_LABELS) as InvestmentStrategy[]).map((s) => {
            const on = draft.strategies.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleStrategy(s)}
                aria-pressed={on}
                data-testid={`strategy-${s}`}
                className={`pw-interactive-custom text-xs px-3 py-1.5 rounded-full transition-colors cursor-pointer ${
                  on ? 'bg-slate-100 text-slate-900 font-semibold' : 'border text-slate-300 hover:bg-white/5'
                }`}
                style={on ? undefined : { borderColor: 'var(--pw-border)' }}
              >
                {STRATEGY_LABELS[s]}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Team members ── */}
      {isTeam && (
        <section className="rounded-2xl border p-5 space-y-3" style={{ borderColor: 'var(--pw-border)' }} data-testid="team-members-section">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Team members
            </h2>
            <button
              type="button"
              onClick={() =>
                set('teamMembers', [...draft.teamMembers, { displayName: '', role: 'Member', invitedEmail: '' }])
              }
              data-testid="add-member"
              className="pw-interactive-custom inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-semibold text-white hover:bg-white/5 cursor-pointer"
              style={{ borderColor: 'var(--pw-border)' }}
            >
              <Plus className="w-3.5 h-3.5" /> Invite
            </button>
          </div>

          {draft.teamMembers.length === 0 ? (
            <p className="text-xs text-slate-500">No members yet. Invite by email.</p>
          ) : (
            <div className="space-y-2">
              {draft.teamMembers.map((m, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_120px_40px] gap-2 items-center">
                  <input
                    value={m.displayName}
                    onChange={(e) => {
                      const next = [...draft.teamMembers];
                      next[i] = { ...next[i], displayName: e.target.value };
                      set('teamMembers', next);
                    }}
                    placeholder="Name"
                    data-testid={`member-name-${i}`}
                    style={FIELD}
                  />
                  <input
                    value={m.invitedEmail ?? ''}
                    onChange={(e) => {
                      const next = [...draft.teamMembers];
                      next[i] = { ...next[i], invitedEmail: e.target.value };
                      set('teamMembers', next);
                    }}
                    placeholder="email@company.com"
                    data-testid={`member-email-${i}`}
                    style={FIELD}
                  />
                  <input
                    value={m.role}
                    onChange={(e) => {
                      const next = [...draft.teamMembers];
                      next[i] = { ...next[i], role: e.target.value };
                      set('teamMembers', next);
                    }}
                    placeholder="Role"
                    data-testid={`member-role-${i}`}
                    style={FIELD}
                  />
                  <button
                    type="button"
                    onClick={() => set('teamMembers', draft.teamMembers.filter((_, j) => j !== i))}
                    aria-label="Remove member"
                    data-testid={`member-remove-${i}`}
                    className="pw-interactive-custom h-10 w-10 rounded-lg border flex items-center justify-center text-slate-400 hover:text-rose-400 cursor-pointer"
                    style={{ borderColor: 'var(--pw-border)' }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Visibility ── */}
      <section className="rounded-2xl border p-5 space-y-3" style={{ borderColor: 'var(--pw-border)' }}>
        <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
          Visibility
        </h2>

        {([
          ['publicProfile', 'List me in investor discovery', 'Off means no one can find or view your profile.'],
          ['showRoiPublicly', 'Show my average ROI publicly', 'Off means visitors see a dash instead of a figure.'],
        ] as const).map(([key, label, hint]) => (
          <label key={key} className="flex items-start justify-between gap-4 cursor-pointer">
            <span className="min-w-0">
              <span className="text-sm text-white block">{label}</span>
              <span className="text-xs text-slate-500">{hint}</span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={draft[key]}
              aria-label={label}
              onClick={() => set(key, !draft[key])}
              data-testid={`toggle-${key}`}
              className="pw-interactive-custom relative w-11 h-6 rounded-full shrink-0 transition-colors cursor-pointer"
              style={{ background: draft[key] ? '#334155' : 'transparent', border: '1px solid var(--pw-border)' }}
            >
              <span
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white transition-all"
                style={{ left: draft[key] ? 24 : 3 }}
              />
            </button>
          </label>
        ))}
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          data-testid="save-profile"
          className="pw-interactive-custom h-10 px-5 rounded-lg text-xs font-bold bg-slate-100 text-slate-900 hover:bg-white disabled:opacity-60 cursor-pointer"
        >
          {saving ? 'Saving…' : 'Save profile'}
        </button>
      </div>
    </div>
  );
}
