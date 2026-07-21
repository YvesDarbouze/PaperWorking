'use client';

import React, { useState, useEffect } from 'react';
import { HOLD_CARD_REGISTRY, HoldCardDefinition, DispositionType, ScopeTier } from '@/lib/project/holdCardRegistry';
import { HoldWelcomeBanner } from './HoldWelcomeBanner';

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
  const [selectedCard, setSelectedCard] = useState<HoldCardDefinition | null>(null);
  const [cardDraftInput, setCardDraftInput] = useState<string>('');
  const [savedData, setSavedData] = useState<Record<string, string>>({});

  // Restore saved draft state from localStorage for save/resume testing
  useEffect(() => {
    const key = `pw_hold_drafts_${projectId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        setSavedData(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse draft state', e);
      }
    }
  }, [projectId]);

  const handleOpenCard = (card: HoldCardDefinition) => {
    setSelectedCard(card);
    setCardDraftInput(savedData[card.id] || '');
  };

  const handleSaveCard = () => {
    if (!selectedCard) return;
    const updated = { ...savedData, [selectedCard.id]: cardDraftInput };
    setSavedData(updated);
    localStorage.setItem(`pw_hold_drafts_${projectId}`, JSON.stringify(updated));
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
    <div className="w-full min-h-screen bg-[#121014] text-[#FDFFFC] p-8 font-sans">
      {/* ── Project Header & Shell ── */}
      <div className="flex flex-col space-y-4 mb-8 border-b border-[rgba(253,255,252,0.07)] pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-[#FDFFFC]">{address}</h1>
            
            {/* Phase Chip — Canon: Hold */}
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-[rgba(234,88,12,0.15)] text-[#EA580C] border border-[rgba(234,88,12,0.30)]">
              Hold
            </span>

            {/* Read-Only Strategy Chip (Decision H-1 Law) */}
            <span
              className="px-3 py-1 text-xs font-semibold rounded-full bg-[rgba(253,255,252,0.08)] text-[rgba(253,255,252,0.80)] border border-[rgba(253,255,252,0.12)]"
              title="Strategy is read-only in Hold (Decision H-1)"
            >
              Strategy: {dispositionType}
            </span>
          </div>

          <div className="text-xs text-[rgba(253,255,252,0.50)] flex items-center space-x-2">
            <span>Scope Tier:</span>
            <span className="font-semibold text-[#FDFFFC]">{scopeTier}</span>
          </div>
        </div>

        {/* Phase Progress Strip */}
        <div className="w-full bg-[rgba(253,255,252,0.05)] h-2 rounded-full overflow-hidden flex">
          <div className="bg-[#EA580C] h-full w-3/5 transition-all duration-300" />
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
              className="flex flex-col bg-[rgba(253,255,252,0.02)] border border-[rgba(253,255,252,0.06)] rounded-xl p-4 min-h-[500px]"
            >
              <h2 className="text-xs font-semibold text-[rgba(253,255,252,0.50)] tracking-wider uppercase mb-4">
                {col.title}
              </h2>

              <div className="flex flex-col space-y-3">
                {colCards.map((card) => {
                  const hasSavedValue = !!savedData[card.id];

                  return (
                    <div
                      key={card.id}
                      onClick={() => handleOpenCard(card)}
                      className="bg-[rgba(18,16,20,0.98)] border border-[rgba(253,255,252,0.08)] hover:border-[rgba(234,88,12,0.40)] rounded-lg p-4 cursor-pointer transition-all duration-200 shadow-sm group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-[#EA580C]">
                          {card.cardName}
                        </span>
                        {hasSavedValue ? (
                          <span className="text-[10px] bg-[rgba(16,185,129,0.15)] text-[#10B981] px-2 py-0.5 rounded font-medium">
                            Saved
                          </span>
                        ) : (
                          <span className="text-[10px] bg-[rgba(253,255,252,0.06)] text-[rgba(253,255,252,0.40)] px-2 py-0.5 rounded font-medium">
                            Empty
                          </span>
                        )}
                      </div>

                      <p className="text-sm font-medium text-[#FDFFFC] mb-2 group-hover:text-[#EA580C] transition-colors">
                        {card.questionText}
                      </p>

                      <p className="text-xs text-[rgba(253,255,252,0.60)] line-clamp-2 italic">
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

      {/* ── Card Save/Resume Modal ── */}
      {selectedCard && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#121014] border border-[rgba(253,255,252,0.12)] rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-6">
            <div>
              <span className="text-xs font-semibold text-[#EA580C] uppercase tracking-wider">
                {selectedCard.cardName}
              </span>
              <h3 className="text-lg font-bold text-[#FDFFFC] mt-1">
                {selectedCard.questionText}
              </h3>
              <p className="text-xs text-[rgba(253,255,252,0.60)] mt-1 italic">
                "{selectedCard.whyWeAsk}"
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-[rgba(253,255,252,0.70)]">
                Entry / Draft Value
              </label>
              <textarea
                value={cardDraftInput}
                onChange={(e) => setCardDraftInput(e.target.value)}
                placeholder="Type entry or notes..."
                className="w-full bg-[rgba(253,255,252,0.04)] border border-[rgba(253,255,252,0.10)] focus:border-[#EA580C] rounded-lg p-3 text-sm text-[#FDFFFC] outline-none transition-colors h-28 resize-none"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2 border-t border-[rgba(253,255,252,0.08)]">
              <button
                onClick={() => setSelectedCard(null)}
                className="px-4 py-2 text-xs font-medium text-[rgba(253,255,252,0.70)] hover:text-[#FDFFFC] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCard}
                className="px-5 py-2 text-xs font-semibold text-[#FDFFFC] bg-[#EA580C] hover:bg-[#c2410c] rounded-lg transition-colors shadow-md"
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
