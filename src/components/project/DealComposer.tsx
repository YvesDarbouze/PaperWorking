'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Mail, Sparkles, Send, Loader2, ShieldAlert, CheckCircle2, History, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

interface DealComposerProps {
  projectId: string;
  project: any;
  derivedMetrics?: any;
  onRefresh?: () => void;
}

export function DealComposer({ projectId, project, derivedMetrics, onRefresh }: DealComposerProps) {
  const [subject, setSubject] = useState('');
  const [bodyTemplate, setBodyTemplate] = useState('');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [lastSentTime, setLastSentTime] = useState<Date | null>(null);

  const isE2E = typeof window !== 'undefined' && document.cookie.includes('__e2e_test');

  const fin = project?.financials ?? {};
  const terms = fin.equityTerms ?? {};
  const fundingTarget = terms.funding_target ?? 0;
  const equityOfferedPct = terms.equity_offered_pct ?? 0;
  const minTicket = terms.min_ticket ?? 0;
  const termsVersion = terms.version ?? 1;

  // Formatting helpers
  const formatUSD = (centsOrDollars: number, isCents = false) => {
    const value = isCents ? centsOrDollars / 100 : centsOrDollars;
    return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  };

  const getTargetPrice = () => {
    if (fin.finalAgreedPrice) return formatUSD(fin.finalAgreedPrice, true);
    if (fin.purchasePrice) return formatUSD(fin.purchasePrice, true);
    return '$0';
  };

  const getProjectedNOI = () => {
    if (fin.projectedNOI) return formatUSD(fin.projectedNOI, true);
    if (derivedMetrics?.projectedNOI) return formatUSD(derivedMetrics.projectedNOI, true);
    return '$0';
  };

  const getCapRate = () => {
    if (fin.projectedCapRate) return `${fin.projectedCapRate}%`;
    if (derivedMetrics?.capRate) return `${(derivedMetrics.capRate * 100).toFixed(2)}%`;
    return '0%';
  };

  const getCoC = () => {
    if (fin.projectedCashOnCash) return `${fin.projectedCashOnCash}%`;
    if (derivedMetrics?.cashOnCash) return `${(derivedMetrics.cashOnCash * 100).toFixed(2)}%`;
    return '0%';
  };

  const getHoldHorizon = () => {
    return fin.holdPeriodYears ? `${fin.holdPeriodYears} Years` : '5 Years';
  };

  const getStrategy = () => {
    return project?.subStrategy || project?.dispositionType || 'Value-Add';
  };

  const defaultSubject = `Investment Invitation: ${dealAddress()}`;
  const defaultBody = `I am pleased to invite you to review a new co-investment opportunity for {{PROPERTY_ADDRESS}}.

Underwriting Highlights:
- Projected NOI: {{PROJECTED_NOI}}
- Projected Cap Rate: {{PROJECTED_CAP_RATE}}
- Projected Cash-on-Cash: {{PROJECTED_COC}}
- Strategy: {{STRATEGY}} ({{HOLD_HORIZON}} Hold)
- Target Acquisition Cost: {{TARGET_PRICE}}

Investment Offering:
- Seeking {{FUNDING_TARGET}} in exchange for {{EQUITY_PERCENT}} equity.
- Minimum ticket size: {{MIN_TICKET}}.

Please click the secure link below to review the detailed underwriting model, asset photos, and to pledge your commitment.`;

  function dealAddress() {
    if (project?.propertyAddress) return project.propertyAddress;
    if (project?.address) {
      const addr = project.address;
      return [addr.street, addr.city, addr.state].filter(Boolean).join(', ');
    }
    return project?.propertyName || 'Untitled Deal';
  }

  // Pre-populate defaults
  useEffect(() => {
    if (!subject) setSubject(defaultSubject);
    if (!bodyTemplate) setBodyTemplate(defaultBody);
  }, [project]);

  // Listen to Send History
  useEffect(() => {
    if (!projectId || isE2E) return;
    const q = query(
      collection(db, 'projects', projectId, 'invitation_history'),
      orderBy('sentAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          sentAt: data.sentAt?.toDate ? data.sentAt.toDate() : new Date(data.sentAt),
        };
      });
      setHistory(items);
      if (items.length > 0) {
        setLastSentTime(items[0].sentAt);
      }
    });
    return unsub;
  }, [projectId, isE2E]);

  // E2E mock history listener
  useEffect(() => {
    if (isE2E) {
      const loadMockHistory = () => {
        const key = `pw_e2e_inv_history_${projectId}`;
        try {
          const val = localStorage.getItem(key);
          const items = val ? JSON.parse(val) : [];
          const formatted = items.map((i: any) => ({
            ...i,
            sentAt: new Date(i.sentAt),
          }));
          setHistory(formatted);
          if (formatted.length > 0) {
            setLastSentTime(formatted[0].sentAt);
          }
        } catch (e) {
          console.error(e);
        }
      };
      loadMockHistory();
      window.addEventListener(`update_history_${projectId}`, loadMockHistory);
      return () => window.removeEventListener(`update_history_${projectId}`, loadMockHistory);
    }
  }, [projectId, isE2E]);

  const resolveTemplate = (template: string) => {
    return template
      .replaceAll('{{PROPERTY_ADDRESS}}', dealAddress())
      .replaceAll('{{TARGET_PRICE}}', getTargetPrice())
      .replaceAll('{{PROJECTED_NOI}}', getProjectedNOI())
      .replaceAll('{{PROJECTED_CAP_RATE}}', getCapRate())
      .replaceAll('{{PROJECTED_COC}}', getCoC())
      .replaceAll('{{STRATEGY}}', getStrategy())
      .replaceAll('{{HOLD_HORIZON}}', getHoldHorizon())
      .replaceAll('{{FUNDING_TARGET}}', formatUSD(fundingTarget))
      .replaceAll('{{EQUITY_PERCENT}}', `${equityOfferedPct}%`)
      .replaceAll('{{MIN_TICKET}}', formatUSD(minTicket));
  };

  const isRateLimited = () => {
    if (!lastSentTime) return false;
    const diffMs = Date.now() - lastSentTime.getTime();
    return diffMs < 24 * 60 * 60 * 1000;
  };

  const handleSend = async () => {
    if (isRateLimited()) {
      toast.error('Rate limit: You can only send one invitation batch every 24 hours.');
      return;
    }

    setSending(true);
    try {
      const idToken = await (window as any).firebaseAuthToken || '';
      
      const payload = {
        projectId,
        subject: subject.trim() || defaultSubject,
        bodyTemplate: bodyTemplate.trim() || defaultBody,
        termsVersion,
      };

      if (isE2E) {
        // E2E mock send
        const key = `pw_e2e_inv_history_${projectId}`;
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        const newLog = {
          id: `hist_${Date.now()}`,
          sentAt: new Date().toISOString(),
          subject: payload.subject,
          bodyTemplate: payload.bodyTemplate,
          termsVersion,
          recipients: [
            { email: 'bob@investor.com', name: 'Investor Bob', channels: ['email', 'in-app'], status: 'not tracked' },
            { email: 'sarah@resistance.io', name: 'Sarah Connor', channels: ['email', 'in-app'], status: 'not tracked' },
          ],
        };
        localStorage.setItem(key, JSON.stringify([newLog, ...existing]));

        // Simulate creating invitations
        const invsKey = `pw_e2e_invitations_${projectId}`;
        const currentInvs = JSON.parse(localStorage.getItem(invsKey) || '[]');
        const newInvs = newLog.recipients.map((rec) => ({
          id: `inv_${Date.now()}_${rec.name.replace(/\s+/g, '')}`,
          projectId,
          dealName: project?.propertyName || 'Capital Heights',
          email: rec.email,
          name: rec.name,
          proposedAmount: minTicket,
          proposedEquityPercent: equityOfferedPct,
          token: `token_${rec.email.replace(/[@.]/g, '')}`,
          status: 'pending',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        }));
        localStorage.setItem(invsKey, JSON.stringify([...newInvs, ...currentInvs]));

        // Create mock inbox item for Bob
        const notificationsKey = `pw_e2e_notifications_bob`;
        const existingNotifs = JSON.parse(localStorage.getItem(notificationsKey) || '[]');
        const bobNotif = {
          id: `not_${Date.now()}`,
          recipientId: 'user_bob',
          type: 'INVEST_INVITE',
          title: `Investment Invitation — Capital Heights`,
          body: `Lead Investor has invited you to co-invest in the project at Capital Heights.`,
          actor: { name: 'Lead Investor' },
          objectReference: { projectId, dealAddress: 'Capital Heights', amount: `$${minTicket.toLocaleString()}`, token: 'token_bobinvestorcom' },
          read: false,
          archived: false,
          createdAt: new Date().toISOString(),
          deepLinkUrl: `/invest/token_bobinvestorcom`,
        };
        localStorage.setItem(notificationsKey, JSON.stringify([bobNotif, ...existingNotifs]));

        window.dispatchEvent(new Event(`update_history_${projectId}`));
        window.dispatchEvent(new Event(`update_${notificationsKey}`));
        
        toast.success('Mock broadcast invitation sent successfully!');
        if (onRefresh) onRefresh();
        setSending(false);
        return;
      }

      const res = await fetch('/api/invitations/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send broadcast');

      toast.success(`Invitation broadcast sent to ${data.totalCount} consented recipients!`);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'An error occurred.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Rate limit status alert */}
      {isRateLimited() && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3 text-amber-400 font-medium">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-amber-500 animate-pulse" />
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-amber-500">Composer Rate Locked</h5>
            <p className="text-[11px] text-amber-400/80 mt-1">
              An invitation broadcast was sent within the last 24 hours (on {lastSentTime?.toLocaleString()}). To protect your audience from email fatigue, subsequent compose batches are locked.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">Deal Communication Composer</h4>
        <p className="text-[10px] text-[#9E9DA0]/60 mt-1">Ready to invite investors? We'll write the invitation from your analysis — you approve every word.</p>
      </div>

      {/* Main split editor / preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Editor (Left 6 Columns) */}
        <div className="lg:col-span-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0]">Email Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={defaultSubject}
                disabled={isRateLimited()}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-[#454955]/60 text-sm disabled:opacity-50"
                id="composer-subject"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0]">Email Body (Prose)</label>
                <span className="text-[9px] text-[#9E9DA0]/60 font-mono">Use {"{{VAR}}"} place-markers</span>
              </div>
              <textarea
                rows={10}
                value={bodyTemplate}
                onChange={(e) => setBodyTemplate(e.target.value)}
                placeholder={defaultBody}
                disabled={isRateLimited()}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-[#454955]/60 text-xs font-sans leading-relaxed disabled:opacity-50"
                id="composer-body"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 space-y-3">
            {/* Variables quick-reference check */}
            <div className="grid grid-cols-3 gap-2 text-[9px] font-mono text-[#9E9DA0]/50 p-2 bg-white/5 rounded-lg border border-white/5">
              <div>Target: <span className="text-white">{getTargetPrice()}</span></div>
              <div>NOI: <span className="text-white">{getProjectedNOI()}</span></div>
              <div>Cap Rate: <span className="text-white">{getCapRate()}</span></div>
              <div>Coc: <span className="text-white">{getCoC()}</span></div>
              <div>Horizon: <span className="text-white">{getHoldHorizon()}</span></div>
              <div>Min Ticket: <span className="text-white">{formatUSD(minTicket)}</span></div>
            </div>

            <button
              onClick={handleSend}
              disabled={sending || isRateLimited() || !bodyTemplate}
              id="btn-broadcast-invitation"
              className="w-full py-3 bg-[#454955] text-[#0d0a0b] font-bold text-xs uppercase tracking-wider rounded-xl hover:brightness-110 active:scale-97 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {sending ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Send className="w-4.5 h-4.5" />}
              Send Invitation Batch (v{termsVersion} Terms)
            </button>
          </div>
        </div>

        {/* Live Preview (Right 6 Columns) */}
        <div className="lg:col-span-6 border border-white/10 rounded-2xl bg-pw-night-bg/60 p-6 flex flex-col justify-between" id="composer-preview">
          <div>
            <div className="border-b border-white/5 pb-3 mb-4 space-y-1">
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#9E9DA0]/50">Email Preview</span>
              <div className="font-bold text-white text-sm" id="preview-subject">{subject || defaultSubject}</div>
            </div>

            <div className="text-xs text-[#9E9DA0] space-y-4 whitespace-pre-wrap leading-relaxed min-h-[180px] font-sans" id="preview-body">
              {resolveTemplate(bodyTemplate || defaultBody)}
            </div>

            <div className="mt-6 pt-4 border-t border-white/5 flex justify-center">
              <div className="px-5 py-2.5 bg-[#454955]/15 border border-[#454955]/30 text-white font-bold text-xs uppercase tracking-wider rounded-lg select-none">
                Review Deal & Respond
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-white/5 space-y-4">
            {/* Branding Block */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-white font-mono uppercase">
                LI
              </div>
              <div className="text-[10px] leading-tight">
                <div className="font-bold text-white">Lead Investor Branding</div>
                <div className="text-[#9E9DA0]/60">PaperWorking Platform Sponsor</div>
              </div>
            </div>

            {/* Non-editable locked disclosure */}
            <div className="text-[9px] text-[#9E9DA0]/40 leading-normal bg-white/5 p-3 rounded-lg border border-white/5">
              <strong>Disclosure (Locked):</strong> This invitation and any associated materials are for informational purposes only and do not constitute an offer to sell or a solicitation of an offer to buy any securities. Any investment commitment made hereunder is non-binding.
            </div>
          </div>
        </div>
      </div>

      {/* Send History accordion */}
      <div className="border border-white/5 rounded-2xl overflow-hidden bg-pw-night-bg/20">
        <button
          onClick={() => setShowHistory(!showHistory)}
          id="btn-toggle-composer-history"
          className="w-full flex justify-between items-center p-4 hover:bg-white/5 transition-colors text-left"
        >
          <div className="flex items-center gap-2 text-white">
            <History size={16} className="text-[#9E9DA0]" />
            <span className="text-xs font-bold uppercase tracking-wider">Broadcast Invitation History ({history.length})</span>
          </div>
          {showHistory ? <ChevronUp size={16} className="text-[#9E9DA0]" /> : <ChevronDown size={16} className="text-[#9E9DA0]" />}
        </button>

        {showHistory && (
          <div className="p-4 border-t border-white/5 bg-pw-night-bg/40 space-y-4 animate-in slide-in-from-top-1 duration-200">
            {history.length === 0 ? (
              <p className="text-xs text-[#9E9DA0]/60 text-center py-6">No invitation history log found.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-white/5">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/5 text-[#9E9DA0] uppercase tracking-wider text-[9px] font-bold">
                      <th className="p-3">Sent At</th>
                      <th className="p-3">Subject</th>
                      <th className="p-3">Terms Version</th>
                      <th className="p-3">Recipients Log</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {history.map((h) => (
                      <tr key={h.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-3 font-mono text-[10px] text-white">
                          {h.sentAt.toLocaleString()}
                        </td>
                        <td className="p-3 font-semibold text-white">
                          {h.subject}
                        </td>
                        <td className="p-3 font-bold text-sky-400">
                          v{h.termsVersion}
                        </td>
                        <td className="p-3 space-y-1">
                          <div className="text-[10px] text-[#9E9DA0] max-h-24 overflow-y-auto space-y-1">
                            {h.recipients?.map((rec: any, idx: number) => (
                              <div key={idx} className="flex justify-between gap-4 border-b border-white/5 pb-1">
                                <span>{rec.name} ({rec.email})</span>
                                <span className="font-mono text-[9px] uppercase tracking-wide text-amber-500">{rec.status}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
