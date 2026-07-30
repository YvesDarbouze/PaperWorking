'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import toast from 'react-hot-toast';
import { HOLD_CARD_REGISTRY, HoldCardDefinition, DispositionType, ScopeTier } from '@/lib/project/holdCardRegistry';
import { HoldWelcomeBanner } from './HoldWelcomeBanner';
import { RehabExpenseTracker } from '@/components/project/RehabExpenseTracker';
import TransactionLedger from '@/components/projects/TransactionLedger';

export interface HoldWorkspaceShellProps {
  projectId: string;
  address?: string;
  dispositionType?: DispositionType;
  scopeTier?: ScopeTier;
  userId?: string;
}

export function HoldWorkspaceShell({
  projectId,
  address = 'Demo Property',
  dispositionType = 'RENT',
  scopeTier = 'RENOVATE',
  userId = 'user_1',
}: HoldWorkspaceShellProps) {
  const router = useRouter();
  const [selectedCard, setSelectedCard] = useState<HoldCardDefinition | null>(null);
  const [cardDraftInput, setCardDraftInput] = useState<string>('');
  const [savedData, setSavedData] = useState<Record<string, string>>({});
  const [rehabExpenses, setRehabExpenses] = useState<any[]>([]);

  const handleSkipToExit = async () => {
    try {
      const projectRef = doc(db, 'projects', projectId);
      await updateDoc(projectRef, {
        currentPhase: 4,
        phaseStatus: 'Phase 4: Exit',
        status: 'exit',
        updatedAt: new Date().toISOString(),
      });
      toast.success('Skipped to Exit Phase!');
      router.push(`/dashboard/projects/${projectId}/phase-4`);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to skip to Exit.');
    }
  };

  // Restore saved draft state from localStorage for save/resume testing
  useEffect(() => {
    const key = `pw_hold_drafts_${projectId}_${userId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        setSavedData(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse draft state', e);
      }
    }
  }, [projectId, userId]);

  const handleOpenCard = (card: HoldCardDefinition) => {
    setSelectedCard(card);
    setCardDraftInput(savedData[card.id] || '');
  };

  const handleSaveCard = () => {
    if (!selectedCard) return;
    const updated = { ...savedData, [selectedCard.id]: cardDraftInput };
    setSavedData(updated);
    localStorage.setItem(`pw_hold_drafts_${projectId}_${userId}`, JSON.stringify(updated));
    setSelectedCard(null);
  };

  const columns = [
    { id: 'H1', title: 'H1 · RENOVATION PLAN' },
    { id: 'H2', title: 'H2 · RENOVATION TRACKING' },
    { id: 'H3', title: 'H3 · HOLDING COSTS' },
    { id: 'H4', title: 'H4 · MARKET & VALUE' },
    { id: 'H5', title: 'H5 · GO TO MARKET' },
  ];

  return (
    <div
      className="w-full min-h-screen p-8 font-sans"
      style={{
        background: 'var(--color-surface)',
        color: 'var(--color-on-surface)',
      }}
    >
      {/* ── Project Header & Shell ── */}
      <div
        className="flex flex-col space-y-4 mb-8 pb-6 border-b"
        style={{ borderColor: 'var(--color-outline-variant)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold">{address}</h1>
            
            {/* Phase Chip — Canon: Hold */}
            <span
              className="px-3 py-1 text-xs font-semibold rounded-full border"
              style={{
                background: 'var(--color-primary-container)',
                color: 'var(--color-primary)',
                borderColor: 'var(--color-primary-container)',
              }}
            >
              Hold
            </span>

            {/* Read-Only Strategy Chip (Decision H-1 Law) */}
            <span
              className="px-3 py-1 text-xs font-semibold rounded-full border"
              style={{
                background: 'var(--color-surface-container)',
                color: 'var(--color-on-surface-variant)',
                borderColor: 'var(--color-outline-variant)',
              }}
              title="Strategy is read-only in Hold (Decision H-1)"
            >
              Strategy: {dispositionType}
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <div
              className="text-xs flex items-center space-x-2 border-r pr-4 border-white/10"
              style={{ color: 'var(--color-on-surface-variant)' }}
            >
              <span>Scope Tier:</span>
              <span className="font-semibold" style={{ color: 'var(--color-on-surface)' }}>
                {scopeTier}
              </span>
            </div>

            {/* Launch Hold Wizard */}
            <button
              onClick={() => router.push(`/dashboard/projects/${projectId}/phase-3/wizard?strategy=${dispositionType}`)}
              className="px-4 py-2 bg-[#7A9EAA] hover:opacity-90 text-[#0d0a0b] font-bold uppercase tracking-wider text-[10px] rounded-lg transition-all shadow-[0_0_12px_rgba(122,158,170,0.15)]"
            >
              Launch Hold Wizard
            </button>

            {/* Skip to Exit for flips */}
            {dispositionType === 'SALE' && (
              <button
                onClick={handleSkipToExit}
                className="px-4 py-2 border border-[#7A9EAA]/30 hover:bg-[#7A9EAA]/5 text-white font-bold uppercase tracking-wider text-[10px] rounded-lg transition-all"
              >
                Skip to Exit
              </button>
            )}
          </div>
        </div>

        {/* Phase Progress Strip */}
        <div
          className="w-full h-2 rounded-full overflow-hidden flex"
          style={{ background: 'var(--color-surface-container)' }}
        >
          <div
            className="h-full w-3/5 transition-all duration-300"
            style={{ background: 'var(--color-primary)' }}
          />
        </div>
      </div>

      {/* ── Welcome Banner ── */}
      <HoldWelcomeBanner
        userId={userId}
        onSelectCard={(cardId) => {
          const target = HOLD_CARD_REGISTRY.find((c) => c.id === cardId);
          if (target) handleOpenCard(target);
        }}
      />

      {/* ── 5-Column Kanban Board ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {columns.map((col) => {
          const colCards = HOLD_CARD_REGISTRY.filter(
            (c) => c.columnId === col.id && c.revealCondition({ dispositionType, scopeTier })
          );

          return (
            <div
              key={col.id}
              className="flex flex-col border rounded-xl p-4 min-h-[500px]"
              style={{
                background: 'var(--color-surface-container-low)',
                borderColor: 'var(--color-outline-variant)',
              }}
            >
              <h2
                className="text-xs font-semibold tracking-wider uppercase mb-4"
                style={{ color: 'var(--color-on-surface-variant)' }}
              >
                {col.title}
              </h2>

              <div className="flex flex-col space-y-3">
                {colCards.map((card) => {
                  const hasSavedValue = !!savedData[card.id];

                  return (
                    <div
                      key={card.id}
                      onClick={() => handleOpenCard(card)}
                      className="border rounded-lg p-4 cursor-pointer transition-all duration-200 shadow-sm group"
                      style={{
                        background: 'var(--color-surface-dim)',
                        borderColor: 'var(--color-outline-variant)',
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>
                          {card.cardName}
                        </span>
                        {hasSavedValue ? (
                          <span
                            className="text-[10px] px-2 py-0.5 rounded font-medium"
                            style={{
                              background: 'var(--color-status-success-container)',
                              color: 'var(--color-status-success)',
                            }}
                          >
                            Saved
                          </span>
                        ) : (
                          <span
                            className="text-[10px] px-2 py-0.5 rounded font-medium"
                            style={{
                              background: 'var(--color-surface-container)',
                              color: 'var(--color-on-surface-variant)',
                            }}
                          >
                            Empty
                          </span>
                        )}
                      </div>

                      <p className="text-sm font-medium mb-2 transition-colors" style={{ color: 'var(--color-on-surface)' }}>
                        {card.questionText}
                      </p>

                      <p
                        className="text-xs line-clamp-2 italic"
                        style={{ color: 'var(--color-on-surface-variant)' }}
                      >
                        "{card.whyWeAsk}"
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Rehab Expense Tracker ── */}
      <div className="mt-12 max-w-5xl">
        <RehabExpenseTracker expenses={rehabExpenses} onChange={setRehabExpenses} />
      </div>

      {/* ── Bank Transaction Ledger (Plaid) ── */}
      <div className="mt-10 max-w-5xl">
        <TransactionLedger projectId={projectId} />
      </div>

      {/* ── Card Save/Resume Modal ── */}
      {selectedCard && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            className="border rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-6"
            style={{
              background: 'var(--color-surface)',
              borderColor: 'var(--color-outline-variant)',
            }}
          >
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-primary)' }}>
                {selectedCard.cardName}
              </span>
              <h3 className="text-lg font-bold mt-1" style={{ color: 'var(--color-on-surface)' }}>
                {selectedCard.questionText}
              </h3>
              <p
                className="text-xs mt-1 italic"
                style={{ color: 'var(--color-on-surface-variant)' }}
              >
                "{selectedCard.whyWeAsk}"
              </p>
            </div>

            <div className="space-y-2">
              <label
                className="text-xs font-medium"
                style={{ color: 'var(--color-on-surface-variant)' }}
              >
                Entry / Draft Value
              </label>
              <textarea
                value={cardDraftInput}
                onChange={(e) => setCardDraftInput(e.target.value)}
                placeholder="Type entry or notes..."
                className="w-full rounded-lg p-3 text-sm outline-none transition-colors h-28 resize-none border"
                style={{
                  background: 'var(--color-surface-container)',
                  borderColor: 'var(--color-outline-variant)',
                  color: 'var(--color-on-surface)',
                }}
              />
            </div>

            <div
              className="flex items-center justify-end space-x-3 pt-2 border-t"
              style={{ borderColor: 'var(--color-outline-variant)' }}
            >
              <button
                onClick={() => setSelectedCard(null)}
                className="px-4 py-2 text-xs font-medium transition-colors"
                style={{ color: 'var(--color-on-surface-variant)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCard}
                className="px-5 py-2 text-xs font-semibold rounded-lg transition-colors shadow-md"
                style={{
                  background: 'var(--color-primary)',
                  color: 'var(--color-on-surface)',
                }}
              >
                Save & Resume Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
