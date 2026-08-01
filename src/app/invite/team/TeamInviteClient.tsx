'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { acceptTeamInvitation } from '@/actions/team';
import { TeamInvitation } from '@/types/schema';

export default function TeamInviteClient({ invite, token }: { invite: TeamInvitation; token: string }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Redirect unauthenticated guests to login
  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/login?redirectTo=/invite/team?token=${token}`);
    }
  }, [authLoading, user, router, token]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pw-border" />
      </div>
    );
  }

  if (invite.status !== 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary px-4">
        <div className="text-center max-w-sm p-6 bg-bg-surface border border-pw-border">
          <div className="w-16 h-16 bg-bg-primary border border-pw-border flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-7 h-7 text-text-secondary" />
          </div>
          <h1 className="text-xl font-bold text-text-primary mb-2">Invitation {invite.status}</h1>
          <p className="text-sm text-text-secondary">
            This invitation is no longer pending.
          </p>
        </div>
      </div>
    );
  }

  const emailMatches = user.email?.toLowerCase() === invite.email.toLowerCase();

  const handleAccept = async () => {
    if (!emailMatches) return;
    setIsAccepting(true);
    setError(null);
    try {
      await acceptTeamInvitation(token);
      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation');
      setIsAccepting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary px-4">
        <div className="text-center max-w-sm p-6 bg-bg-surface border border-pw-border">
          <div className="w-16 h-16 bg-bg-primary border border-pw-border flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-text-primary" />
          </div>
          <h1 className="text-xl font-bold text-text-primary mb-2">Welcome to the Team!</h1>
          <p className="text-sm text-text-secondary mb-4">
            You have successfully joined {invite.organizationName}. Redirecting to your dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <header className="bg-bg-surface border-b border-pw-border px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-pw-black flex items-center justify-center">
              <span className="text-pw-white text-xs font-bold">PW</span>
            </div>
            <span className="text-sm font-semibold text-text-primary tracking-tight">PaperWorking</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Team Invitation</h1>
          <p className="text-sm text-text-secondary mt-1">
            {invite.invitedByName} invited you to join their organization. Create your account and start your first Project. 14-day trial, no charge until day 15.
          </p>
        </div>

        <div className="bg-bg-surface border border-pw-border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-bg-primary border border-pw-border flex items-center justify-center">
              <Users className="w-6 h-6 text-text-secondary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">{invite.organizationName}</h2>
              <p className="text-sm text-text-secondary">Role: {invite.role}</p>
            </div>
          </div>

          {!emailMatches ? (
            <div className="p-4 border border-pw-border bg-bg-primary text-text-primary">
              <p className="text-sm mb-4">
                This invitation was sent to <strong>{invite.email}</strong>, but you are logged in as <strong>{user.email}</strong>.
              </p>
              <button 
                onClick={() => router.push('/dashboard/settings/profile')} 
                className="pw-btn pw-btn--secondary w-full"
              >
                Sign out and switch accounts
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {error && (
                <div className="p-3 border border-red-500 bg-red-50 text-red-900 text-sm">
                  {error}
                </div>
              )}
              <button
                onClick={handleAccept}
                disabled={isAccepting}
                className="pw-btn pw-btn--primary w-full flex items-center justify-center gap-2"
              >
                {isAccepting ? 'Accepting...' : 'Accept Invitation'}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
