'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Search, Send, Sparkles, Filter, X } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import PhaseBadge from '../ui/PhaseBadge';
import { communicationService } from '@/lib/services/communicationService';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import toast from 'react-hot-toast';
import DraftAssistant, { DraftContext } from './DraftAssistant';

/* ─────────────────────────────────────────────────────────────────────────
   Types
   ───────────────────────────────────────────────────────────────────────── */
interface Message {
  id: string;
  senderEmail: string;
  senderName: string;
  body: string;
  createdAt: any;
  type: string;
}

/** Filter dimension: which message types are visible */
type FilterType = 'all' | 'email' | 'internal';

const FILTER_LABELS: Record<FilterType, string> = {
  all: 'ALL',
  email: 'EMAIL',
  internal: 'INTERNAL',
};

/* ─────────────────────────────────────────────────────────────────────────
   FilterPopover
   Renders a small anchored chip-strip below the Filter button.
   Closes on outside click.
   ───────────────────────────────────────────────────────────────────────── */
interface FilterPopoverProps {
  active: FilterType;
  onChange: (f: FilterType) => void;
  onClose: () => void;
}

function FilterPopover({ active, onChange, onClose }: FilterPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const options: FilterType[] = ['all', 'email', 'internal'];

  return (
    <div
      ref={ref}
      id="global-inbox-filter-popover"
      role="menu"
      className="absolute right-0 top-full mt-2 w-56 z-50 border border-border-accent bg-bg-primary shadow-xl py-2"
    >
      <p className="px-6 py-2 text-xs font-black text-text-secondary uppercase tracking-[0.3em]">
        FILTER BY TYPE
      </p>
      {options.map((opt) => (
        <button
          key={opt}
          id={`filter-option-${opt}`}
          role="menuitem"
          onClick={() => { onChange(opt); onClose(); }}
          className={`w-full flex items-center justify-between px-6 py-3 text-xs font-black uppercase tracking-widest transition-all text-left ${
            active === opt
              ? 'bg-pw-black text-pw-white'
              : 'text-text-primary hover:bg-bg-surface'
          }`}
        >
          {FILTER_LABELS[opt]}
          {active === opt && <span className="w-2 h-2 rounded-full bg-pw-accent" />}
        </button>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Default draft context (per-deal; reset on deal switch)
   ───────────────────────────────────────────────────────────────────────── */
const DEFAULT_DRAFT_CONTEXT: DraftContext = {
  audience: 'investors',
  draft: '',
};

/* ─────────────────────────────────────────────────────────────────────────
   GlobalInbox
   ───────────────────────────────────────────────────────────────────────── */
export default function GlobalInbox() {
  const projects = useProjectStore((state) => state.projects);

  const [selectedDealId, setSelectedDealId] = useState<string | null>(
    projects[0]?.id || null,
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyText, setReplyText] = useState('');
  const [isDrafting, setIsDrafting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // ── Filter state ────────────────────────────────────────────────────────
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterOpen, setFilterOpen] = useState(false);

  // ── Draft context — lifted so it survives open/close cycles ────────────
  // Stored in a ref so it doesn't cause re-renders; mirrored to state only
  // when we need the UI to react (the DraftAssistant reads from state).
  const [draftContext, setDraftContext] = useState<DraftContext>(DEFAULT_DRAFT_CONTEXT);

  const selectedDeal = projects.find((d) => d.id === selectedDealId);

  // Reset draft context and filter when switching deals
  const handleSelectDeal = useCallback((id: string) => {
    if (id !== selectedDealId) {
      setDraftContext(DEFAULT_DRAFT_CONTEXT);
      setFilterType('all');
      setIsDrafting(false);
    }
    setSelectedDealId(id);
  }, [selectedDealId]);

  // Subscribe to messages for the selected deal
  useEffect(() => {
    if (!selectedDealId) return;

    const q = query(
      collection(db, 'projects', selectedDealId, 'messages'),
      orderBy('createdAt', 'asc'),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [selectedDealId]);

  // ── Derived: filtered messages ──────────────────────────────────────────
  // Filter dimensions:
  //   all      → no filter applied
  //   email    → EMAIL_INBOUND | EMAIL_OUTBOUND
  //   internal → INTERNAL_COMMENT | SYSTEM
  const filteredMessages = messages.filter((msg) => {
    if (filterType === 'all') return true;
    if (filterType === 'email')
      return msg.type === 'EMAIL_INBOUND' || msg.type === 'EMAIL_OUTBOUND';
    if (filterType === 'internal')
      return msg.type === 'INTERNAL_COMMENT' || msg.type === 'SYSTEM';
    return true;
  });

  // ── COMMIT — validated send ─────────────────────────────────────────────
  const handleSend = async () => {
    // Precondition 1: a deal must be selected
    if (!selectedDealId) {
      toast.error('Select a project before committing a message.', {
        id: 'commit-no-deal',
        icon: '⚠️',
        style: { background: '#0d0d0d', color: '#fff' },
      });
      return;
    }
    // Precondition 2: reply text must not be empty
    if (!replyText.trim()) {
      toast.error('Write a message before committing.', {
        id: 'commit-no-text',
        icon: '⚠️',
        style: { background: '#0d0d0d', color: '#fff' },
      });
      return;
    }

    try {
      await communicationService.logMessage(
        selectedDealId,
        selectedDeal?.organizationId || 'primary-org',
        {
          senderEmail: 'you@paperworking.co',
          senderName: 'You',
          body: replyText,
          type: 'INTERNAL_COMMENT',
        },
      );
      setReplyText('');
      toast.success('Message committed.', {
        icon: '✓',
        style: { background: '#0d0d0d', color: '#fff' },
      });
    } catch {
      toast.error('Failed to commit message. Please retry.', {
        style: { background: '#0d0d0d', color: '#fff' },
      });
    }
  };

  // Insert draft from DraftAssistant → reply textarea
  const insertDraft = (draft: string) => {
    setReplyText(draft);
    setIsDrafting(false);
    // Draft context is preserved — reopening the panel will still show it
  };

  const isFilterActive = filterType !== 'all';

  return (
    <div className="flex bg-bg-surface h-full border border-border-accent overflow-hidden">

      {/* ── Thread List ── */}
      <div className="w-96 border-r border-border-accent flex flex-col bg-bg-primary">
        <div className="p-10 border-b border-border-accent space-y-8 bg-pw-black">
          <h2 className="text-sm font-black text-pw-white uppercase tracking-[0.4em] flex items-center">
            <Mail className="w-4 h-4 mr-4 text-pw-accent" />
            COMMUNICATION LEDGER
          </h2>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-pw-white/30" />
            <input
              id="global-inbox-search"
              type="text"
              placeholder="SCAN ASSET INDEX..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-pw-border/20 border border-pw-white/10 text-pw-white text-xs font-black tracking-widest focus:outline-none focus:border-pw-accent transition-all placeholder:text-pw-white/20"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {projects
            .filter((d) =>
              d.propertyName.toLowerCase().includes(searchQuery.toLowerCase()),
            )
            .map((deal) => (
              <button
                key={deal.id}
                id={`deal-item-${deal.id}`}
                onClick={() => handleSelectDeal(deal.id)}
                className={`w-full p-10 text-left border-b border-border-accent transition-all flex items-start gap-6 hover:bg-bg-surface ${
                  selectedDealId === deal.id
                    ? 'bg-bg-surface border-l-4 border-l-pw-accent'
                    : ''
                }`}
              >
                <div
                  className={`w-12 h-12 flex-shrink-0 flex items-center justify-center border ${
                    selectedDealId === deal.id
                      ? 'bg-pw-black text-pw-white border-pw-border'
                      : 'bg-bg-primary text-text-secondary border-border-accent'
                  }`}
                >
                  <span className="text-sm font-black">{deal.propertyName[0]}</span>
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="text-sm font-black text-text-primary truncate uppercase tracking-tighter">
                      {deal.propertyName}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary font-bold truncate uppercase tracking-widest mb-4">
                    {deal.address}
                  </p>
                  <div className="mt-2">
                    <PhaseBadge status={deal.status} />
                  </div>
                </div>
              </button>
            ))}
        </div>
      </div>

      {/* ── Communication Stream ── */}
      <div className="flex-1 flex flex-col bg-bg-surface">
        {selectedDeal ? (
          <>
            {/* Header */}
            <header className="p-10 border-b border-border-accent flex justify-between items-center bg-bg-surface sticky top-0 z-10">
              <div className="flex items-center gap-8">
                <div className="w-16 h-16 border border-pw-border flex items-center justify-center text-text-primary font-black text-2xl">
                  {selectedDeal.propertyName[0]}
                </div>
                <div>
                  <h3 className="text-3xl font-black text-text-primary uppercase tracking-tighter leading-none mb-2">
                    {selectedDeal.propertyName}
                  </h3>
                  <p className="text-xs text-pw-accent font-black uppercase tracking-[0.4em]">
                    {selectedDeal.address}
                  </p>
                </div>
              </div>
              <div className="flex gap-4 items-center">
                {/* Active filter badge */}
                {isFilterActive && (
                  <span className="text-xs font-black text-pw-accent uppercase tracking-widest border border-pw-accent/40 px-3 py-1">
                    {FILTER_LABELS[filterType]}
                    <button
                      id="filter-clear-active"
                      onClick={() => setFilterType('all')}
                      className="ml-2 opacity-60 hover:opacity-100"
                      aria-label="Clear filter"
                    >
                      <X className="w-3 h-3 inline" />
                    </button>
                  </span>
                )}

                {/* Filter button with popover */}
                <div className="relative">
                  <button
                    id="global-inbox-filter-btn"
                    onClick={() => setFilterOpen((v) => !v)}
                    aria-label="Filter messages"
                    aria-expanded={filterOpen}
                    aria-haspopup="true"
                    className={`p-4 border transition-all ${
                      isFilterActive
                        ? 'border-pw-accent text-pw-accent'
                        : 'border-border-accent text-text-primary hover:bg-pw-black hover:text-pw-white'
                    }`}
                  >
                    <Filter className="w-5 h-5" />
                    {isFilterActive && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-pw-accent" />
                    )}
                  </button>

                  <AnimatePresence>
                    {filterOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                      >
                        <FilterPopover
                          active={filterType}
                          onChange={setFilterType}
                          onClose={() => setFilterOpen(false)}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <button
                  id="global-inbox-draft-btn"
                  onClick={() => setIsDrafting(true)}
                  className="p-4 bg-pw-black text-pw-white border border-pw-border hover:bg-pw-accent hover:border-pw-accent transition-all"
                  aria-label="Open AI draft assistant"
                >
                  <Sparkles className="w-5 h-5" />
                </button>
              </div>
            </header>

            {/* Message stream */}
            <div className="flex-1 overflow-y-auto p-12 space-y-12 bg-bg-primary/50">
              {filteredMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-text-secondary grayscale opacity-40">
                  <Mail className="w-20 h-20 mb-8" />
                  <p className="text-sm font-black uppercase tracking-[0.4em]">
                    {isFilterActive
                      ? `NO ${FILTER_LABELS[filterType]} MESSAGES IN THIS THREAD`
                      : 'SYSTEM STANDBY — NO OPERATIONAL LOGS'}
                  </p>
                </div>
              ) : (
                filteredMessages.map((msg, i) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className={`flex ${msg.senderEmail.includes('you') ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] flex flex-col ${
                        msg.senderEmail.includes('you') ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div className="flex items-center gap-4 mb-4 px-1">
                        <span className="text-xs font-black text-text-primary uppercase tracking-[0.2em]">
                          {msg.senderName}
                        </span>
                        <span className="text-xs font-black text-text-secondary uppercase tracking-[0.2em] font-mono">
                          {msg.createdAt?.seconds
                            ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })
                            : '--:--'}
                        </span>
                        {/* Type badge for non-internal messages */}
                        {msg.type !== 'INTERNAL_COMMENT' && (
                          <span className="text-xs font-black text-pw-accent/60 uppercase tracking-widest border border-pw-accent/20 px-2 py-0.5">
                            {msg.type.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                      <div
                        className={`p-10 border text-sm leading-loose font-medium uppercase tracking-tight transition-all shadow-sm ${
                          msg.senderEmail.includes('you')
                            ? 'bg-pw-black text-pw-white border-pw-border'
                            : 'bg-bg-surface text-text-primary border-border-accent'
                        }`}
                      >
                        {msg.body}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Compose footer */}
            <footer className="p-12 border-t border-border-accent bg-bg-surface shadow-2xl">
              <div className="relative">
                <textarea
                  id="global-inbox-compose"
                  placeholder="ENTER OPERATIONAL LOG OR RESPONSE DATA..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full h-48 p-10 border border-border-accent text-sm font-black uppercase tracking-widest focus:outline-none focus:border-pw-accent transition-all resize-none bg-bg-primary/30 text-text-primary placeholder:text-text-secondary"
                />
                <div className="absolute top-0 right-0 p-6 flex gap-6">
                  <button
                    id="global-inbox-compile-btn"
                    onClick={() => setIsDrafting(true)}
                    className="flex items-center gap-4 px-8 py-4 bg-bg-surface border border-pw-border text-text-primary text-xs font-black uppercase tracking-[0.3em] hover:bg-pw-black hover:text-pw-white transition-all shadow-2xl"
                  >
                    <Sparkles className="w-4 h-4 text-pw-accent" />
                    <span>COMPILE AI DRAFT</span>
                  </button>
                  <button
                    id="global-inbox-commit-btn"
                    onClick={handleSend}
                    title={
                      !selectedDealId
                        ? 'Select a project first'
                        : !replyText.trim()
                        ? 'Write a message first'
                        : 'Commit message to ledger'
                    }
                    aria-disabled={!selectedDealId || !replyText.trim()}
                    className="flex items-center gap-4 px-10 py-4 bg-pw-black text-pw-white text-xs font-black uppercase tracking-[0.3em] border border-pw-border hover:bg-pw-accent hover:border-pw-accent transition-all shadow-2xl"
                  >
                    <Send className="w-4 h-4 ml-1" />
                    <span>COMMIT</span>
                  </button>
                </div>
              </div>
            </footer>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-text-secondary grayscale">
            <Mail className="w-24 h-24 mb-10 opacity-20" />
            <p className="text-sm font-black uppercase tracking-[0.5em]">
              SELECT ASSET FOR COMMUNICATION AUDIT
            </p>
          </div>
        )}
      </div>

      {/* ── Draft Assistant panel ── */}
      <AnimatePresence>
        {isDrafting && selectedDeal && (
          <DraftAssistant
            deal={selectedDeal}
            draftContext={draftContext}
            onDraftContextChange={setDraftContext}
            onClose={() => setIsDrafting(false)}
            onInsert={insertDraft}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
