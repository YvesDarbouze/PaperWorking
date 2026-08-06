'use client';

import { useState } from 'react';
import { Globe, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';

/* ═══════════════════════════════════════════════════════════════════════════
   DealVisibilityToggle — requirement 3.

   Publishes a deal to the owner's marketplace profile. OFF by default; the
   copy states plainly what does and does not become visible, because the
   consequence of this switch is disclosure and the user should not have to
   guess its blast radius.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface DealVisibilityToggleProps {
  projectId: string;
  initialIsPublic?: boolean;
  onChange?: (isPublic: boolean) => void;
  testId?: string;
}

export function DealVisibilityToggle({
  projectId,
  initialIsPublic = false,
  onChange,
  testId = 'deal-visibility',
}: DealVisibilityToggleProps) {
  const { user } = useAuth();
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [pending, setPending] = useState(false);

  const toggle = async () => {
    if (!user) { toast.error('Sign in to change visibility.'); return; }

    const next = !isPublic;
    setPending(true);
    setIsPublic(next); // optimistic
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/projects/${projectId}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ isPublic: next }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error ?? `Server error ${res.status}`);
      }
      onChange?.(next);
      toast.success(next ? 'Deal is now public on your profile.' : 'Deal is private again.');
    } catch (err) {
      setIsPublic(!next); // roll back
      toast.error(err instanceof Error ? err.message : 'Could not update visibility.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      className="rounded-xl border p-4 space-y-3"
      style={{ borderColor: 'var(--pw-border)' }}
      data-testid={`${testId}-panel`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white flex items-center gap-2">
            {isPublic ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            Make this deal public on marketplace profile
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {isPublic
              ? 'Visible on your profile: address, photo, phase and a value range.'
              : 'Private. Only you and invited collaborators can see this deal.'}
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={isPublic}
          aria-label="Make this deal public on marketplace profile"
          onClick={toggle}
          disabled={pending}
          data-testid={`${testId}-switch`}
          className="pw-interactive-custom relative w-11 h-6 rounded-full shrink-0 transition-colors cursor-pointer disabled:opacity-60"
          style={{
            background: isPublic ? '#334155' : 'transparent',
            border: '1px solid var(--pw-border)',
          }}
        >
          <span
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white transition-all"
            style={{ left: isPublic ? 24 : 3 }}
          />
        </button>
      </div>

      {/* Never leave the disclosure boundary implicit. */}
      <p className="text-[11px] text-slate-500" data-testid={`${testId}-disclosure`}>
        Purchase price, loan amount, rent, seller details and your ledger are never
        shared, whichever way this is set.
      </p>
    </div>
  );
}

export default DealVisibilityToggle;
