'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import {
  Users,
  X,
  MagnifyingGlass,
  EnvelopeSimple,
  ArrowLeft,
  PaperPlaneRight,
  ArrowSquareOut,
  ChatCircle,
} from '@/components/icons/PhosphorIcons';
import { useModalScrollLock } from './useModalScrollLock';

export interface FollowerItem {
  id: string;
  name: string;
  dealName?: string;
  email?: string;
  firm?: string;
  role?: string;
  followedDate?: string;
}

export interface DirectChatMessage {
  id: string;
  sender: 'counterparty' | 'you';
  senderName: string;
  text: string;
  timestamp: string;
}

export interface FollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
  followers?: ReadonlyArray<FollowerItem>;
  totalCount?: number;
  initialSelectedFollower?: FollowerItem | null;
  initialTab?: 'followers' | 'following';
}

const DEFAULT_EXTENDED_FOLLOWERS: FollowerItem[] = [
  {
    id: 'f1',
    name: 'Alex Morgan',
    dealName: '1247 Elm Street',
    firm: 'Apex Commercial Capital',
    role: 'Acquisitions Director',
    email: 'alex@apexcommercial.com',
    followedDate: '2 weeks ago',
  },
  {
    id: 'f2',
    name: 'Jordan Lee',
    dealName: '88 Harbor Lane',
    firm: 'Harbor View Capital',
    role: 'Equity LP',
    email: 'jordan@harborviewcap.com',
    followedDate: '1 month ago',
  },
  {
    id: 'f3',
    name: 'Maya Patel',
    dealName: '4402 Congress Ave',
    firm: 'Beacon Street Ventures',
    role: 'General Partner',
    email: 'maya@beaconventures.com',
    followedDate: '3 weeks ago',
  },
  {
    id: 'f4',
    name: 'David Vance',
    dealName: '810 E 7th Street',
    firm: 'Lone Star Debt Partners',
    role: 'Commercial Debt Broker',
    email: 'david@lonestardebt.com',
    followedDate: '2 months ago',
  },
  {
    id: 'f5',
    name: 'Elena Rostova',
    dealName: '1904 Barton Springs',
    firm: 'Rostova Capital Management',
    role: 'Family Office Principal',
    email: 'elena@rostovacapital.com',
    followedDate: '4 days ago',
  },
  {
    id: 'f6',
    name: 'Carlos Ruiz',
    dealName: '302 Colorado St',
    firm: 'Sunbelt Urban Equity',
    role: 'Joint Venture Partner',
    email: 'carlos@sunbelturban.com',
    followedDate: '5 days ago',
  },
];

function buildInitialMessagesForFollower(follower: FollowerItem): DirectChatMessage[] {
  const dealContext = follower.dealName
    ? `regarding ${follower.dealName}`
    : 'regarding your active deal pipeline';
  const roleContext = follower.firm
    ? `${follower.role || 'Investor'} at ${follower.firm}`
    : follower.role || 'Investor';

  return [
    {
      id: `msg-init-${follower.id}-1`,
      sender: 'counterparty',
      senderName: follower.name,
      text: `Hi there, connecting as ${roleContext} ${dealContext}. Let me know when you have a moment to review underwriting assumptions or vendor scope.`,
      timestamp: follower.followedDate || 'Recent',
    },
  ];
}

export default function FollowersModal({
  isOpen,
  onClose,
  followers = DEFAULT_EXTENDED_FOLLOWERS,
  totalCount,
  initialSelectedFollower = null,
  initialTab = 'followers',
}: FollowersModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab);
  const [selectedFollower, setSelectedFollower] = useState<FollowerItem | null>(
    initialSelectedFollower,
  );
  const [chatHistoryByFollower, setChatHistoryByFollower] = useState<
    Record<string, DirectChatMessage[]>
  >({});
  const [draftMessage, setDraftMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageSent, setMessageSent] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  useModalScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSelectedFollower(null);
      setDraftMessage('');
      setMessageSent(null);
      return;
    }

    setActiveTab(initialTab);
    setSelectedFollower(initialSelectedFollower ?? null);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, initialSelectedFollower, initialTab]);

  useEffect(() => {
    if (isOpen && selectedFollower && chatInputRef.current) {
      chatInputRef.current.focus();
    }
  }, [isOpen, selectedFollower]);

  const allFollowers = useMemo(() => {
    if (followers && followers.length > 0) {
      const map = new Map<string, FollowerItem>();
      followers.forEach((f) => map.set(f.name, f));
      DEFAULT_EXTENDED_FOLLOWERS.forEach((f) => {
        if (!map.has(f.name)) map.set(f.name, f);
      });
      return Array.from(map.values());
    }
    return DEFAULT_EXTENDED_FOLLOWERS;
  }, [followers]);

  const filteredFollowers = useMemo(() => {
    if (!searchQuery.trim()) return allFollowers;
    const q = searchQuery.toLowerCase();
    return allFollowers.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.dealName && f.dealName.toLowerCase().includes(q)) ||
        (f.firm && f.firm.toLowerCase().includes(q)) ||
        (f.role && f.role.toLowerCase().includes(q)),
    );
  }, [allFollowers, searchQuery]);

  if (!isOpen) return null;

  const countDisplay = totalCount ?? allFollowers.length;

  const activeChatMessages = selectedFollower
    ? (chatHistoryByFollower[selectedFollower.id] ?? buildInitialMessagesForFollower(selectedFollower))
    : [];

  function openChatWithFollower(follower: FollowerItem) {
    setSelectedFollower(follower);
    setMessageSent(null);
    setChatHistoryByFollower((prev) => {
      if (prev[follower.id]) return prev;
      return {
        ...prev,
        [follower.id]: buildInitialMessagesForFollower(follower),
      };
    });
  }

  async function handleSendDirectMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFollower || !draftMessage.trim()) return;

    const text = draftMessage.trim();
    const target = selectedFollower;
    const newMsg: DirectChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'you',
      senderName: 'You',
      text,
      timestamp: 'Just now',
    };

    setDraftMessage('');
    setSendingMessage(true);
    setChatHistoryByFollower((prev) => {
      const existing = prev[target.id] ?? buildInitialMessagesForFollower(target);
      return {
        ...prev,
        [target.id]: [...existing, newMsg],
      };
    });
    setMessageSent(`Direct message sent to ${target.name}.`);

    try {
      await fetch('/api/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tab: 'team',
          type: 'TEAM_INVITE',
          subject: `Direct Message: ${target.name}`,
          project: target.dealName || target.firm || 'Investor Network',
          from: target.name,
          fromRole: [target.role || 'Investor', target.firm].filter(Boolean).join(' · '),
          body: `To: ${target.name}${target.email ? ` <${target.email}>` : ''}\n\n${text}`,
          unread: false,
          actionable: false,
        }),
      });
    } catch {
      // Local direct chat thread already updated
    } finally {
      setSendingMessage(false);
    }
  }

  const inboxDeepLinkHref = selectedFollower
    ? `/dashboard/inbox?to=${encodeURIComponent(selectedFollower.name)}&role=${encodeURIComponent(
        selectedFollower.role || 'Investor',
      )}&firm=${encodeURIComponent(selectedFollower.firm || '')}&deal=${encodeURIComponent(
        selectedFollower.dealName || '',
      )}&email=${encodeURIComponent(selectedFollower.email || '')}`
    : '/dashboard/inbox';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="followers-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md overscroll-contain"
    >
      <div
        ref={modalRef}
        data-testid="portfolio-followers-modal"
        className="w-full max-w-xl overflow-hidden rounded-none border border-border bg-card p-6 shadow-2xl flex flex-col max-h-[85vh] text-card-foreground"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-400" />
              <span className="rounded-none border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                Investor Network
              </span>
            </div>
            <h2 id="followers-modal-title" className="mt-2 text-xl font-bold tracking-tight text-foreground">
              Portfolio Followers &amp; Network
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Investors, capital partners, and lenders actively tracking your deals and track record.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-none p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {selectedFollower ? (
          /* Active In-Modal Live Direct Chat View */
          <div
            data-testid="follower-direct-chat-panel"
            className="mt-4 flex flex-1 flex-col overflow-hidden"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <button
                type="button"
                data-testid="back-to-followers-list-btn"
                onClick={() => {
                  setSelectedFollower(null);
                  setMessageSent(null);
                }}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-none border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition touch-target"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Network</span>
              </button>

              <Link
                href={inboxDeepLinkHref}
                data-testid="open-in-inbox-link"
                onClick={onClose}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-none border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition touch-target"
              >
                <span>Open in Inbox</span>
                <ArrowSquareOut className="h-4 w-4" />
              </Link>
            </div>

            {/* Active Counterparty Header */}
            <div className="mt-3 flex items-center justify-between gap-3 rounded-none border border-border bg-muted/20 p-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-none border border-border bg-muted font-bold text-foreground uppercase text-xs">
                  {selectedFollower.name.slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-sm text-foreground break-words">
                      {selectedFollower.name}
                    </p>
                    <span className="inline-flex items-center gap-1 rounded-none border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-emerald-400">
                      <ChatCircle className="h-3 w-3" />
                      Direct Chat
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground break-words">
                    {selectedFollower.role || 'Investor'}
                    {selectedFollower.firm ? ` · ${selectedFollower.firm}` : ''}
                  </p>
                  {selectedFollower.dealName && (
                    <p className="text-[11px] text-emerald-400 font-medium mt-0.5">
                      Deal Context: {selectedFollower.dealName}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {messageSent && (
              <div
                data-testid="direct-chat-sent-banner"
                className="mt-3 rounded-none border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-300"
              >
                {messageSent}
              </div>
            )}

            {/* Message Thread */}
            <div
              data-testid="direct-chat-messages"
              className="mt-3 flex-1 space-y-3 overflow-y-auto rounded-none border border-border bg-background/60 p-3 max-h-[260px]"
            >
              {activeChatMessages.map((msg) => (
                <div
                  key={msg.id}
                  data-testid={`direct-chat-message-${msg.sender}`}
                  className={`flex flex-col ${
                    msg.sender === 'you' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-none border p-3 text-xs leading-relaxed ${
                      msg.sender === 'you'
                        ? 'border-primary/40 bg-primary text-primary-foreground'
                        : 'border-border bg-card text-card-foreground'
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <span className="font-bold text-[11px]">{msg.senderName}</span>
                      <span className="font-mono text-[10px] opacity-75">{msg.timestamp}</span>
                    </div>
                    <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Direct Message Input Form */}
            <form
              onSubmit={handleSendDirectMessage}
              className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
            >
              <input
                ref={chatInputRef}
                type="text"
                data-testid="direct-chat-input"
                value={draftMessage}
                onChange={(e) => setDraftMessage(e.target.value)}
                placeholder={`Write a message to ${selectedFollower.name}...`}
                aria-label={`Message ${selectedFollower.name}`}
                className="flex-1 min-h-[44px] rounded-none border border-border bg-background px-3 py-2 text-base text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none sm:text-xs"
              />
              <button
                type="submit"
                data-testid="direct-chat-send-btn"
                disabled={sendingMessage || !draftMessage.trim()}
                className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 rounded-none bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition touch-target"
              >
                <PaperPlaneRight className="h-4 w-4" />
                <span>{sendingMessage ? 'Sending...' : 'Send Message'}</span>
              </button>
            </form>
          </div>
        ) : (
          <>
            {/* Tab & Search Controls */}
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="tab-followers"
                  onClick={() => setActiveTab('followers')}
                  className={`inline-flex min-h-[44px] items-center rounded-none px-3.5 py-1.5 text-xs font-semibold transition touch-target ${
                    activeTab === 'followers'
                      ? 'bg-primary text-primary-foreground font-bold'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  Followers ({countDisplay})
                </button>
                <button
                  type="button"
                  data-testid="tab-following"
                  onClick={() => setActiveTab('following')}
                  className={`inline-flex min-h-[44px] items-center rounded-none px-3.5 py-1.5 text-xs font-semibold transition touch-target ${
                    activeTab === 'following'
                      ? 'bg-primary text-primary-foreground font-bold'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  Following (8)
                </button>
              </div>

              {/* Search box */}
              <div className="relative flex-1 sm:max-w-xs">
                <MagnifyingGlass className="absolute left-2.5 top-3.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  data-testid="followers-search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search investors or deals..."
                  className="w-full min-h-[44px] rounded-none border border-border bg-background py-1.5 pl-8 pr-3 text-base text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none sm:text-xs"
                />
              </div>
            </div>

            {messageSent && (
              <div className="mt-3 rounded-none border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-300">
                {messageSent}
              </div>
            )}

            {/* List of Followers */}
            <div className="mt-4 flex-1 space-y-2.5 overflow-y-auto overscroll-contain pr-1">
              {filteredFollowers.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No followers found matching &ldquo;{searchQuery}&rdquo;.
                </div>
              ) : (
                filteredFollowers.map((follower) => (
                  <div
                    key={follower.id}
                    data-testid={`follower-row-${follower.id}`}
                    className="flex items-center justify-between rounded-none border border-border bg-card p-3 text-xs hover:bg-muted/30 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-none border border-border bg-muted font-bold text-foreground uppercase text-xs">
                        {follower.name.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">{follower.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {follower.role || 'Investor'} {follower.firm ? `· ${follower.firm}` : ''}
                        </p>
                        {follower.dealName && (
                          <p className="text-[10px] text-emerald-400 font-medium truncate mt-0.5">
                            Tracking: {follower.dealName}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        data-testid={`message-follower-btn-${follower.id}`}
                        onClick={() => openChatWithFollower(follower)}
                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-none border border-border bg-card px-3 py-1.5 text-xs font-semibold text-card-foreground hover:bg-muted transition touch-target"
                      >
                        <EnvelopeSimple className="h-4 w-4" />
                        <span>Message</span>
                      </button>
                      <Button
                        size="sm"
                        variant="tertiary"
                        href="/dashboard/deals"
                        className="text-[11px]"
                      >
                        Deals
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <span className="text-[11px] text-muted-foreground">
            {selectedFollower
              ? `Direct channel · ${selectedFollower.name}`
              : `${filteredFollowers.length} active connection${
                  filteredFollowers.length === 1 ? '' : 's'
                }`}
          </span>
          <Button variant="secondary" size="md" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
