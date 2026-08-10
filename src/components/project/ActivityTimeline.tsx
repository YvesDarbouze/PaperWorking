import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Mail,
  Eye,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Heart,
  UserCheck,
  DollarSign,
  Edit3,
  RefreshCw,
  Lock,
  AlertCircle
} from 'lucide-react';

export type DealActivityType =
  | 'invite'
  | 'open'
  | 'question'
  | 'answer'
  | 'decline'
  | 'interest'
  | 'exchange'
  | 'indication'
  | 'edit'
  | 'republish'
  | 'mode_change';

export interface DealActivity {
  id: string;
  projectId: string;
  dealId: string;
  actorUid: string;
  type: DealActivityType;
  metadata: {
    inviteeEmail?: string;
    inviteeName?: string;
    questionText?: string;
    answerText?: string;
    amountCents?: number;
    oldVisibilityMode?: string;
    newVisibilityMode?: string;
    editSummary?: string;
    [key: string]: any;
  };
  createdAt: string;
}

interface ActivityTimelineProps {
  projectId?: string;
  initialTimeline?: DealActivity[];
  isCrossDeal?: boolean;
}

export function ActivityTimeline({ projectId, initialTimeline, isCrossDeal = false }: ActivityTimelineProps) {
  const { user } = useAuth();
  const [timeline, setTimeline] = useState<DealActivity[]>(initialTimeline || []);
  const [loading, setLoading] = useState(!initialTimeline && !!(projectId || isCrossDeal));
  const [error, setError] = useState<string | null>(null);

  /**
   * Both timeline endpoints are guarded by `requireAuth`, which requires an
   * `Authorization: Bearer <idToken>` header — cookies alone are rejected.
   * This request previously sent no header at all, so it 401'd on every load
   * and the panel always rendered "Timeline Load Error". The token is the
   * actual fix; the retry UI below is the safety net.
   */
  const fetchTimeline = useCallback(async () => {
    setLoading(true);
    setError(null);

    const url = isCrossDeal
      ? '/api/investor/timeline'
      : `/api/projects/${projectId}/timeline`;

    try {
      if (!user) throw new Error('No authenticated user');
      const token = await user.getIdToken();

      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        throw new Error(`Timeline request failed: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      setTimeline(data.timeline || []);
    } catch (err: unknown) {
      // Diagnostics go to the console; the user sees a friendly message.
      console.error('[ActivityTimeline] failed to load', url, err);
      setError('load-failed');
    } finally {
      setLoading(false);
    }
  }, [projectId, isCrossDeal, user]);

  useEffect(() => {
    if (initialTimeline) {
      setTimeline(initialTimeline);
      return;
    }
    if (projectId || isCrossDeal) {
      void fetchTimeline();
    }
  }, [projectId, initialTimeline, isCrossDeal, fetchTimeline]);

  if (loading) {
    // Skeleton rather than a spinner: it holds the row layout so the panel
    // does not jump when content arrives.
    return (
      <div className="space-y-3 animate-pulse" data-testid="timeline-skeleton">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-zinc-800 bg-zinc-950/40">
            <div className="w-8 h-8 rounded-full bg-zinc-800 shrink-0" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-3 rounded bg-zinc-800 w-1/3" />
              <div className="h-2.5 rounded bg-zinc-800/70 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="p-6 rounded-xl border border-zinc-800 bg-zinc-950 flex items-start gap-3"
        data-testid="timeline-error"
      >
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
        <div className="flex-1">
          <h3 className="font-bold text-sm text-zinc-200">Unable to load activity timeline.</h3>
          <p className="text-xs text-zinc-500 mt-1">
            This is usually temporary. Your activity is safe.
          </p>
          <button
            onClick={() => void fetchTimeline()}
            data-testid="timeline-retry"
            className="pw-interactive-custom mt-3 inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (timeline.length === 0) {
    return (
      <div className="p-8 rounded-xl border border-zinc-800 bg-zinc-950 text-center text-zinc-500">
        <p className="text-sm font-mono">No activity timeline records found.</p>
      </div>
    );
  }

  const getEventIconAndStyle = (type: DealActivityType) => {
    switch (type) {
      case 'invite':
        return {
          icon: <Mail className="w-4 h-4 text-blue-400" />,
          bgColor: 'bg-blue-500/10 border-blue-500/30',
          title: 'Invitation Sent',
        };
      case 'open':
        return {
          icon: <Eye className="w-4 h-4 text-amber-400" />,
          bgColor: 'bg-amber-500/10 border-amber-500/30',
          title: 'Invitation Opened',
        };
      case 'question':
        return {
          icon: <MessageSquare className="w-4 h-4 text-purple-400" />,
          bgColor: 'bg-purple-500/10 border-purple-500/30',
          title: 'Inquiry Posted',
        };
      case 'answer':
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
          bgColor: 'bg-emerald-500/10 border-emerald-500/30',
          title: 'LeadInvestor Answered',
        };
      case 'decline':
        return {
          icon: <XCircle className="w-4 h-4 text-rose-400" />,
          bgColor: 'bg-rose-500/10 border-rose-500/30',
          title: 'Invitation Declined',
        };
      case 'interest':
        return {
          icon: <Heart className="w-4 h-4 text-pink-400" />,
          bgColor: 'bg-pink-500/10 border-pink-500/30',
          title: 'Interest Expressed',
        };
      case 'exchange':
        return {
          icon: <UserCheck className="w-4 h-4 text-cyan-400" />,
          bgColor: 'bg-cyan-500/10 border-cyan-500/30',
          title: 'Card Exchanged',
        };
      case 'indication':
        return {
          icon: <DollarSign className="w-4 h-4 text-yellow-400" />,
          bgColor: 'bg-yellow-500/10 border-yellow-500/30',
          title: 'Indication Submitted',
        };
      case 'edit':
        return {
          icon: <Edit3 className="w-4 h-4 text-zinc-400" />,
          bgColor: 'bg-zinc-500/10 border-zinc-500/30',
          title: 'Deal Modified',
        };
      case 'republish':
        return {
          icon: <RefreshCw className="w-4 h-4 text-emerald-400" />,
          bgColor: 'bg-emerald-500/10 border-emerald-500/30',
          title: 'Deal Republished',
        };
      case 'mode_change':
        return {
          icon: <Lock className="w-4 h-4 text-indigo-400" />,
          bgColor: 'bg-indigo-500/10 border-indigo-500/30',
          title: 'Visibility Mode Changed',
        };
      default:
        return {
          icon: <AlertCircle className="w-4 h-4 text-zinc-400" />,
          bgColor: 'bg-zinc-500/10 border-zinc-500/30',
          title: 'Activity Logged',
        };
    }
  };

  const formatCurrency = (cents: number) => {
    return (cents / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    });
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="relative border border-zinc-800/80 bg-zinc-950/40 rounded-2xl p-6 backdrop-blur-md shadow-2xl">
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(ellipse at center, #10b981 0%, transparent 70%)' }}></div>

      <div className="flex items-center justify-between mb-8 border-b border-zinc-800/80 pb-4">
        <div>
          <h2 className="text-lg font-bold text-zinc-100 tracking-wider">DEAL ACTIVITY TIMELINE</h2>
          <p className="text-xs text-zinc-500 font-mono mt-1">Chronological history of interactions and listings status changes</p>
        </div>
        <span className="text-xs font-mono px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
          {timeline.length} Events
        </span>
      </div>

      <div className="relative border-l border-zinc-800/60 ml-4 pl-8 space-y-8">
        {timeline.map((act) => {
          const { icon, bgColor, title } = getEventIconAndStyle(act.type);

          return (
            <div key={act.id} className="relative group">
              {/* Timeline Indicator Pin */}
              <div className={`absolute -left-[45px] top-1 w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300 group-hover:scale-115 ${bgColor}`}>
                {icon}
              </div>

              {/* Event Body card */}
              <div className="p-4 rounded-xl border border-zinc-800/60 bg-zinc-950/60 hover:border-zinc-700/80 hover:bg-zinc-900/40 transition-all duration-300">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-mono text-sm font-bold tracking-wide text-zinc-200">
                      {title}
                    </h3>

                    {/* Metadata Content */}
                    <div className="mt-2 text-xs text-zinc-400 leading-relaxed font-sans">
                      {act.type === 'invite' && (
                        <div>
                          Sent invite to <span className="font-mono text-zinc-300">{act.metadata.inviteeEmail}</span> 
                          {act.metadata.inviteeName && ` (${act.metadata.inviteeName})`}
                        </div>
                      )}

                      {act.type === 'open' && (
                        <div>
                          Invitee <span className="font-mono text-zinc-300">{act.metadata.inviteeEmail}</span> opened guest portal
                        </div>
                      )}

                      {act.type === 'question' && (
                        <div className="space-y-1.5">
                          <p>
                            Invitee <span className="font-mono text-zinc-300">{act.metadata.inviteeEmail}</span> posted an inquiry:
                          </p>
                          <blockquote className="border-l-2 border-purple-500/50 pl-3 italic text-zinc-400 font-mono text-[11px] py-1 bg-purple-950/10 rounded-r">
                            "{act.metadata.questionText}"
                          </blockquote>
                        </div>
                      )}

                      {act.type === 'answer' && (
                        <div className="space-y-1.5">
                          <p>
                            Replied to inquiry from <span className="font-mono text-zinc-300">{act.metadata.inviteeEmail}</span>:
                          </p>
                          <blockquote className="border-l-2 border-emerald-500/50 pl-3 italic text-zinc-400 font-mono text-[11px] py-1 bg-emerald-950/10 rounded-r">
                            "{act.metadata.answerText}"
                          </blockquote>
                        </div>
                      )}

                      {act.type === 'decline' && (
                        <div>
                          Invitee <span className="font-mono text-zinc-300">{act.metadata.inviteeEmail}</span> declined invitation
                          {act.metadata.declineReason && (
                            <p className="text-[11px] text-zinc-500 mt-1">Reason: {act.metadata.declineReason}</p>
                          )}
                        </div>
                      )}

                      {act.type === 'interest' && (
                        <div>
                          Invitee <span className="font-mono text-zinc-300">{act.metadata.inviteeEmail}</span> expressed interest
                          {act.metadata.cardExchangeStatus === 'pending' && (
                            <p className="text-[11px] text-cyan-400 mt-1">✓ Business card exchange requested</p>
                          )}
                        </div>
                      )}

                      {act.type === 'exchange' && (
                        <div>
                          Business card exchange completed with <span className="font-mono text-zinc-300">{act.metadata.inviteeEmail}</span>
                          <p className="text-[11px] text-zinc-500 mt-1">
                            LeadInvestor: {act.metadata.leadInvestorName} | Invitee: {act.metadata.inviteeName}
                          </p>
                        </div>
                      )}

                      {act.type === 'indication' && (
                        <div>
                          Commitment of <span className="font-bold text-zinc-200">{formatCurrency(act.metadata.amountCents || 0)}</span> recorded for <span className="font-mono text-zinc-300">{act.metadata.inviteeEmail}</span>
                          <p className="text-[11px] text-zinc-500 mt-1">Status: <span className="uppercase text-amber-500 font-mono">{act.metadata.status}</span></p>
                        </div>
                      )}

                      {act.type === 'edit' && (
                        <div>
                          {act.metadata.editSummary || 'Fields updated'}
                        </div>
                      )}

                      {act.type === 'republish' && (
                        <div>
                          Listing republished
                          {act.metadata.reason && <p className="text-[11px] text-zinc-500 mt-1">Notes: {act.metadata.reason}</p>}
                        </div>
                      )}

                      {act.type === 'mode_change' && (
                        <div>
                          Visibility transitioned: <span className="font-mono text-indigo-400 font-semibold">{act.metadata.oldVisibilityMode || 'PRIVATE'}</span> → <span className="font-mono text-emerald-400 font-semibold">{act.metadata.newVisibilityMode}</span>
                          {act.metadata.overrideReason && <p className="text-[11px] text-zinc-500 mt-1">Reason: {act.metadata.overrideReason}</p>}
                        </div>
                      )}
                    </div>
                  </div>

                  <span className="text-[10px] text-zinc-500 font-mono shrink-0 whitespace-nowrap">
                    {formatDate(act.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
