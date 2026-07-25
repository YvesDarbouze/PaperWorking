'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, query, onSnapshot, orderBy, where, doc, getDoc } from 'firebase/firestore';
import type { InvestorInquiry } from '@/types/dealInquiry';
import { Send, Eye, EyeOff, Loader2, MessageSquare, Check, HelpCircle, Contact, UserCheck, ShieldAlert, Award } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAuth } from 'firebase/auth';

interface InvestorQandATrackerProps {
  projectId: string;
}

export function InvestorQandATracker({ projectId }: InvestorQandATrackerProps) {
  const [activeTab, setActiveTab] = useState<'qna' | 'exchanges'>('qna');
  const [inquiries, setInquiries] = useState<InvestorInquiry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'open' | 'answered'>('all');
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [togglingShare, setTogglingShare] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Invitations / Card Exchange States
  const [invitations, setInvitations] = useState<any[]>([]);
  const [selectedExchangeId, setSelectedExchangeId] = useState<string | null>(null);
  const [sponsorCard, setSponsorCard] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
  });
  const [submittingExchange, setSubmittingExchange] = useState(false);

  // 1. Subscribe to inquiries
  useEffect(() => {
    if (!projectId) return;

    const inquiriesRef = collection(db, 'projects', projectId, 'investorInquiries');
    const q = query(inquiriesRef, orderBy('updatedAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            projectId: data.projectId,
            invitationId: data.invitationId,
            investorName: data.investorName || 'Anonymous',
            investorEmail: data.investorEmail || '',
            status: data.status || 'open',
            isShared: !!data.isShared,
            message: data.message,
            messages: data.messages || [],
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          } as InvestorInquiry;
        });
        setInquiries(list);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching inquiries:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [projectId]);

  // 2. Subscribe to dealInvitations
  useEffect(() => {
    if (!projectId) return;

    const invitesRef = collection(db, 'dealInvitations');
    const q = query(invitesRef, where('projectId', '==', projectId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setInvitations(list);
    });

    return () => unsubscribe();
  }, [projectId]);

  // 3. Load Sponsor Card Profile Defaults
  useEffect(() => {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (currentUser) {
      setSponsorCard({
        name: currentUser.displayName || '',
        email: currentUser.email || '',
        phone: '',
        company: '',
      });

      const userRef = doc(db, 'users', currentUser.uid);
      getDoc(userRef)
        .then((snap) => {
          if (snap.exists()) {
            const u = snap.data();
            setSponsorCard({
              name: u.displayName || currentUser.displayName || '',
              email: u.email || currentUser.email || '',
              phone: u.phone || '',
              company: u.company || u.companyName || '',
            });
          }
        })
        .catch((err) => console.warn('Failed to load user profile for card defaults:', err));
    }
  }, []);

  const activeInquiry = inquiries.find((i) => i.id === selectedId);

  const filteredInquiries = inquiries.filter((inq) => {
    if (filter === 'open') return inq.status === 'open';
    if (filter === 'answered') return inq.status === 'answered';
    return true;
  });

  const exchangeRequests = invitations.filter(
    (inv) => inv.status === 'interested'
  );

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !replyText.trim() || submittingReply) return;

    setSubmittingReply(true);
    try {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        toast.error('Authentication required.');
        setSubmittingReply(false);
        return;
      }

      const res = await fetch(`/api/projects/${projectId}/inquiries/${selectedId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: replyText.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setReplyText('');
        toast.success('Reply dispatched and investor notified via email.');
      } else {
        toast.error(data.error || 'Failed to send reply.');
      }
    } catch (err) {
      console.error('Reply failed:', err);
      toast.error('Failed to submit reply.');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleToggleShare = async (inquiryId: string, currentShared: boolean) => {
    if (togglingShare) return;
    setTogglingShare(inquiryId);

    try {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        toast.error('Authentication required.');
        setTogglingShare(null);
        return;
      }

      const nextShared = !currentShared;
      const res = await fetch(`/api/projects/${projectId}/inquiries/${inquiryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isShared: nextShared }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(
          nextShared
            ? 'Thread published to public Q&A anonymously.'
            : 'Thread retracted from public Q&A.'
        );
      } else {
        toast.error(data.error || 'Failed to toggle sharing.');
      }
    } catch (err) {
      console.error('Toggle share failed:', err);
      toast.error('Failed to update sharing settings.');
    } finally {
      setTogglingShare(null);
    }
  };

  const handleAcceptExchange = async (invitationId: string) => {
    if (submittingExchange) return;
    setSubmittingExchange(true);

    try {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        toast.error('Authentication required.');
        setSubmittingExchange(false);
        return;
      }

      const res = await fetch(`/api/projects/${projectId}/invitations/${invitationId}/exchange`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'accept', disclosedCard: sponsorCard }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Business card exchange accepted and cards saved to Project Files.');
        setSelectedExchangeId(null);
      } else {
        toast.error(data.error || 'Failed to accept exchange.');
      }
    } catch (err) {
      console.error('Accept exchange failed:', err);
      toast.error('Failed to accept exchange.');
    } finally {
      setSubmittingExchange(false);
    }
  };

  const handleDeclineExchange = async (invitationId: string) => {
    if (submittingExchange) return;
    setSubmittingExchange(true);

    try {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        toast.error('Authentication required.');
        setSubmittingExchange(false);
        return;
      }

      const res = await fetch(`/api/projects/${projectId}/invitations/${invitationId}/exchange`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'decline' }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Exchange declined silently (no rejection notification sent to investor).');
      } else {
        toast.error(data.error || 'Failed to decline exchange.');
      }
    } catch (err) {
      console.error('Decline exchange failed:', err);
      toast.error('Failed to decline exchange.');
    } finally {
      setSubmittingExchange(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-xs uppercase tracking-wider text-[#9E9DA0]">
        <Loader2 className="w-5 h-5 animate-spin mb-2" />
        Synchronizing Stage 6 Audience Panel...
      </div>
    );
  }

  const activeExchange = exchangeRequests.find((r) => r.id === selectedExchangeId);

  return (
    <div className="space-y-4">
      {/* Navigation Headers */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('qna')}
            className={`text-xs font-bold uppercase tracking-wider font-mono transition-all pb-1 border-b-2 ${
              activeTab === 'qna' ? 'text-white border-white' : 'text-[#9E9DA0] border-transparent hover:text-white'
            }`}
          >
            Q&A Threads ({inquiries.length})
          </button>
          <button
            onClick={() => setActiveTab('exchanges')}
            className={`text-xs font-bold uppercase tracking-wider font-mono transition-all pb-1 border-b-2 ${
              activeTab === 'exchanges' ? 'text-white border-white' : 'text-[#9E9DA0] border-transparent hover:text-white'
            }`}
          >
            Card Exchanges ({exchangeRequests.filter((r) => r.cardExchangeStatus === 'pending').length} Pending)
          </button>
        </div>

        {activeTab === 'qna' && (
          <div className="flex gap-1.5 bg-black/40 p-0.5 rounded-lg border border-white/5">
            {(['all', 'open', 'answered'] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setFilter(opt)}
                className={`px-2.5 py-1 rounded text-[10px] uppercase font-bold tracking-wider transition-all ${
                  filter === opt ? 'bg-white/10 text-white shadow' : 'text-[#9E9DA0] hover:text-white'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tab 1: Q&A Threads */}
      {activeTab === 'qna' && (
        inquiries.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 bg-black/20 rounded-xl border border-white/5 text-center text-xs text-[#9E9DA0]">
            <HelpCircle className="w-6 h-6 text-white/20 mb-2" />
            No investor questions received for this deal yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[350px]">
            {/* Left panel: Threads List */}
            <div className="md:col-span-5 space-y-2 max-h-[450px] overflow-y-auto pr-1">
              {filteredInquiries.map((inq) => {
                const lastMsg = inq.messages[inq.messages.length - 1]?.text || inq.message || '';
                const isSelected = inq.id === selectedId;

                return (
                  <div
                    key={inq.id}
                    onClick={() => setSelectedId(inq.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none text-left ${
                      isSelected
                        ? 'bg-white/10 border-white/20 shadow'
                        : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-white truncate max-w-[150px]">
                        {inq.investorName}
                      </p>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider font-mono font-bold ${
                          inq.status === 'open'
                            ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        }`}
                      >
                        {inq.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#9E9DA0] truncate mt-0.5">{inq.investorEmail}</p>
                    <p className="text-xs text-white/70 truncate mt-2 font-mono">{lastMsg}</p>
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleShare(inq.id, inq.isShared);
                        }}
                        disabled={togglingShare === inq.id}
                        className={`flex items-center gap-1 text-[9px] uppercase tracking-wider font-bold transition-all hover:text-white ${
                          inq.isShared ? 'text-primary' : 'text-[#9E9DA0]'
                        }`}
                      >
                        {togglingShare === inq.id ? (
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        ) : inq.isShared ? (
                          <Eye className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <EyeOff className="w-3 h-3 text-[#9E9DA0]" />
                        )}
                        {inq.isShared ? 'Shared' : 'Private'}
                      </button>
                      <span className="text-[9px] text-[#9E9DA0] font-mono">
                        {inq.messages.length} messages
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right panel: Thread Messages */}
            <div className="md:col-span-7 flex flex-col bg-black/30 border border-white/5 rounded-2xl overflow-hidden max-h-[450px]">
              {activeInquiry ? (
                <>
                  <div className="p-4 border-b border-white/5 flex justify-between items-center bg-black/20">
                    <div>
                      <p className="text-xs font-bold text-white font-mono">{activeInquiry.investorName}</p>
                      <p className="text-[10px] text-[#9E9DA0] mt-0.5">{activeInquiry.investorEmail}</p>
                    </div>
                    <button
                      onClick={() => handleToggleShare(activeInquiry.id, activeInquiry.isShared)}
                      disabled={togglingShare === activeInquiry.id}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[9px] uppercase tracking-wider font-bold transition-all ${
                        activeInquiry.isShared
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                          : 'bg-white/5 text-[#9E9DA0] border-white/10 hover:text-white'
                      }`}
                    >
                      {activeInquiry.isShared ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      {activeInquiry.isShared ? 'Shared' : 'Make Shared'}
                    </button>
                  </div>

                  <div className="flex-1 p-4 space-y-3.5 overflow-y-auto max-h-[300px]">
                    {activeInquiry.messages.length === 0 ? (
                      <div className="flex flex-col gap-2 p-3 bg-white/5 border border-white/10 rounded-xl max-w-[85%] text-left">
                        <span className="text-[9px] font-bold text-primary font-mono uppercase">Investor</span>
                        <p className="text-xs text-white/90 whitespace-pre-wrap">{activeInquiry.message}</p>
                      </div>
                    ) : (
                      activeInquiry.messages.map((msg) => {
                        const isSponsor = msg.sender === 'sponsor';
                        return (
                          <div
                            key={msg.id}
                            className={`flex flex-col gap-1 p-3 rounded-xl max-w-[85%] text-left ${
                              isSponsor ? 'ml-auto bg-black/60 border border-[#454955]/30' : 'bg-white/5 border border-white/10'
                            }`}
                          >
                            <span className={`text-[9px] font-bold font-mono uppercase ${isSponsor ? 'text-[#8a9b9b]' : 'text-primary'}`}>
                              {isSponsor ? 'Sponsor' : 'Investor'}
                            </span>
                            <p className="text-xs text-white/90 whitespace-pre-wrap">{msg.text}</p>
                            <span className="text-[8px] text-[#9E9DA0] self-end mt-1 font-mono">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <form onSubmit={handleSendReply} className="p-3 border-t border-white/5 bg-black/20 flex gap-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={`Reply to ${activeInquiry.investorName}...`}
                      required
                      maxLength={2000}
                      className="flex-1 px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-primary transition-all"
                    />
                    <button
                      type="submit"
                      disabled={submittingReply || !replyText.trim()}
                      className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/20 rounded-xl text-white disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                    >
                      {submittingReply ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      <span className="text-[10px] uppercase font-bold tracking-wider">Reply</span>
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-xs text-[#9E9DA0] font-mono uppercase">
                  <HelpCircle className="w-7 h-7 text-white/10 mb-2 animate-bounce" />
                  Select a thread to respond
                </div>
              )}
            </div>
          </div>
        )
      )}

      {/* Tab 2: Business Card Exchanges */}
      {activeTab === 'exchanges' && (
        exchangeRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 bg-black/20 rounded-xl border border-white/5 text-center text-xs text-[#9E9DA0]">
            <Contact className="w-6 h-6 text-white/20 mb-2" />
            No business card exchange requests for this project.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[350px]">
            {/* Left panel: Requests List */}
            <div className="md:col-span-5 space-y-2 max-h-[450px] overflow-y-auto pr-1">
              {exchangeRequests.map((req) => {
                const isSelected = req.id === selectedExchangeId;
                const statusLabel = req.cardExchangeStatus || 'pending';

                return (
                  <div
                    key={req.id}
                    onClick={() => setSelectedExchangeId(req.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none text-left ${
                      isSelected
                        ? 'bg-white/10 border-white/20 shadow'
                        : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-white truncate max-w-[150px]">
                        {req.inviteeBusinessCard?.name || req.inviteeName || 'Anonymous'}
                      </p>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider font-mono font-bold ${
                          statusLabel === 'pending'
                            ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                            : statusLabel === 'accepted'
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            : 'bg-white/10 text-[#9E9DA0] border border-white/5'
                        }`}
                      >
                        {statusLabel}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#9E9DA0] truncate mt-0.5">
                      {req.inviteeBusinessCard?.company || 'Co-Investor'}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Right panel: Exchange Approval Console */}
            <div className="md:col-span-7 flex flex-col bg-black/30 border border-white/5 rounded-2xl overflow-hidden max-h-[450px] p-6 justify-between">
              {activeExchange ? (
                <div className="space-y-6 flex flex-col justify-between h-full">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono mb-4">
                      Review Exchange Request
                    </h4>

                    {/* Invitee Business Card Details */}
                    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-5 shadow-2xl backdrop-blur-md flex flex-col justify-between h-36">
                      <div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                          {activeExchange.inviteeBusinessCard?.name || activeExchange.inviteeName}
                        </h4>
                        <p className="text-[10px] text-[#8a9b9b]">
                          {activeExchange.inviteeBusinessCard?.company || 'Co-Investor'}
                        </p>
                      </div>
                      <div className="space-y-1 text-xs text-[#8a9b9b] font-mono">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-xs text-[#454955]">mail</span>
                          <span>{activeExchange.inviteeBusinessCard?.email}</span>
                        </div>
                        {activeExchange.inviteeBusinessCard?.phone && (
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-xs text-[#454955]">call</span>
                            <span>{activeExchange.inviteeBusinessCard.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="text-[10px] text-[#9E9DA0] leading-relaxed mt-4">
                      Accepting the exchange will share your business card with this investor and automatically publish both cards as files into the project Files.
                    </p>
                  </div>

                  {activeExchange.cardExchangeStatus === 'pending' ? (
                    <div className="space-y-4 border-t border-white/5 pt-4">
                      {/* Sponsor card configuration details preview */}
                      <div className="space-y-2.5">
                        <label className="block text-[9px] font-bold text-[#8a9b9b] uppercase tracking-wider">
                          Verify Your Card details to Disclose:
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Name"
                            value={sponsorCard.name}
                            onChange={(e) => setSponsorCard({ ...sponsorCard, name: e.target.value })}
                            className="p-2 bg-[#0d0a0b]/60 border border-white/10 rounded text-[10px] text-white focus:outline-none focus:border-primary"
                          />
                          <input
                            type="text"
                            placeholder="Company"
                            value={sponsorCard.company}
                            onChange={(e) => setSponsorCard({ ...sponsorCard, company: e.target.value })}
                            className="p-2 bg-[#0d0a0b]/60 border border-white/10 rounded text-[10px] text-white focus:outline-none focus:border-primary"
                          />
                          <input
                            type="email"
                            placeholder="Email"
                            value={sponsorCard.email}
                            onChange={(e) => setSponsorCard({ ...sponsorCard, email: e.target.value })}
                            className="p-2 bg-[#0d0a0b]/60 border border-white/10 rounded text-[10px] text-white focus:outline-none focus:border-primary col-span-2"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDeclineExchange(activeExchange.id)}
                          disabled={submittingExchange}
                          className="flex-1 py-2 px-3 border border-red-500/20 hover:bg-red-500/5 text-red-400 font-bold text-[10px] uppercase tracking-wider rounded-xl transition"
                        >
                          Decline Request
                        </button>
                        <button
                          onClick={() => handleAcceptExchange(activeExchange.id)}
                          disabled={submittingExchange || !sponsorCard.name || !sponsorCard.email}
                          className="flex-1 py-2 px-3 bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5"
                        >
                          {submittingExchange ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          )}
                          Accept & Swap
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 border border-emerald-500/10 bg-emerald-950/15 p-3 rounded-xl">
                      <UserCheck className="w-4 h-4" />
                      Exchange settings finalized. Status: {activeExchange.cardExchangeStatus}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-xs text-[#9E9DA0] font-mono uppercase">
                  <Contact className="w-7 h-7 text-white/10 mb-2 animate-bounce" />
                  Select an exchange request to review
                </div>
              )}
            </div>
          </div>
        )
      )}
    </div>
  );
}
