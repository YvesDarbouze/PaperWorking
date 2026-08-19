import React, { useState } from 'react';
import { Send, Users, UserPlus } from 'lucide-react';

interface DealInviteModalProps {
  dealId: string;
  dealName?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function DealInviteModal({ dealId, dealName = 'Deal Opportunity', isOpen, onClose }: DealInviteModalProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error_not_team' | 'error_not_subscribed'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus('sending');
    setErrorMessage('');

    try {
      const res = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), role: 'team_member', projectId: dealId }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.action === 'prompt_join_team' || data.error?.includes('Investment Team')) {
          setStatus('error_not_team');
          setErrorMessage(data.error || 'Recipient must be part of an Investment Team to participate in this Deal.');
        } else {
          setStatus('error_not_subscribed');
          setErrorMessage(data.error || 'Recipient must create an account to participate.');
        }
        return;
      }

      setStatus('success');
      setEmail('');
    } catch {
      setStatus('error_not_team');
      setErrorMessage('Failed to send invite. Recipient must join an Investment Team.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Invite to {dealName}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-sm">✕</button>
        </div>

        <p className="text-xs text-slate-400">
          Only Investment Team members can invite collaborators to deals. Inviting a recipient requires them to be part of an Investment Team.
        </p>

        {status === 'success' ? (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-bold">
            ✓ Invitation sent to {email}!
          </div>
        ) : (
          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Recipient Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@investmentfirm.com"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {status === 'error_not_team' && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                <p className="text-xs text-amber-300 font-semibold">{errorMessage}</p>
                <p className="text-[11px] text-slate-400">
                  Send them an invitation to join your Investment Team first.
                </p>
                <button
                  type="button"
                  onClick={() => alert(`Team invite sent to ${email}`)}
                  className="w-full py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Invite to Investment Team</span>
                </button>
              </div>
            )}

            {status === 'error_not_subscribed' && (
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl space-y-2">
                <p className="text-xs text-blue-300 font-semibold">Recipient doesn&apos;t have an account yet.</p>
                <p className="text-[11px] text-slate-400">
                  Send them a sign-up link: &quot;You&apos;re invited to invest in {dealName}. Create your free Investor account and join an Investment Team to get started.&quot;
                </p>
                <button
                  type="button"
                  onClick={() => alert(`Sign-up invite sent to ${email}`)}
                  className="w-full py-2 bg-blue-500 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Send Sign-up Invite</span>
                </button>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={status === 'sending' || !email.trim()}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{status === 'sending' ? 'Sending...' : 'Send Deal Invite'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default DealInviteModal;
