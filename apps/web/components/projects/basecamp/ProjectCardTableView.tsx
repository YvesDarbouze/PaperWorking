'use client';

import { useState } from 'react';
import {
  Kanban,
  Plus,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeSlash,
} from '@phosphor-icons/react';
import type { ProjectCardColumn } from '@/lib/projects/types';

export default function ProjectCardTableView({
  projectId,
  cardColumns,
  onRefresh,
  vendorMode,
}: {
  projectId: string;
  cardColumns: ProjectCardColumn[];
  onRefresh: () => void;
  vendorMode: boolean;
}) {
  const [activeColId, setActiveColId] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardDesc, setNewCardDesc] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newVendorVisible, setNewVendorVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Filter cards for vendorMode
  const visibleColumns = cardColumns.map((col) => ({
    ...col,
    cards: vendorMode ? col.cards.filter((c) => c.vendorVisible) : col.cards,
  }));

  async function handleAddCard(columnId: string, e: React.FormEvent) {
    e.preventDefault();
    if (!newCardTitle.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/card-tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_card',
          columnId,
          title: newCardTitle.trim(),
          description: newCardDesc.trim() || undefined,
          priority: newPriority,
          vendorVisible: newVendorVisible,
        }),
      });
      if (res.ok) {
        setNewCardTitle('');
        setNewCardDesc('');
        setActiveColId(null);
        onRefresh();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMoveCard(cardId: string, targetColumnId: string) {
    try {
      const res = await fetch(`/api/projects/${projectId}/card-tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'move_card',
          cardId,
          targetColumnId,
        }),
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Kanban size={20} className="text-foreground shrink-0" />
            <h3 className="text-base font-semibold text-foreground tracking-tight">The REIL</h3>
            <span className="text-xs font-mono rounded-none border border-border bg-muted/40 px-2 py-0.5 text-foreground">
              {visibleColumns.reduce((acc, c) => acc + c.cards.length, 0)} Total Cards
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            4-phase lifecycle workflow: Deal Calculator & Acquisition → Fund → Hold → Exit.
          </p>
        </div>
      </div>

      {/* Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {visibleColumns.map((column, colIdx) => (
          <div
            key={column.id}
            className="rounded-none border border-border bg-card p-4 flex flex-col min-h-[480px]"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between border-b border-border pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">{column.title}</h4>
                <span className="text-[11px] font-mono rounded-none border border-border bg-muted/40 px-2 py-0.5 text-foreground">
                  {column.cards.length}
                </span>
              </div>
              {!vendorMode && (
                <button
                  type="button"
                  onClick={() => setActiveColId(activeColId === column.id ? null : column.id)}
                  className="text-xs font-medium text-foreground hover:text-foreground/80 flex items-center gap-1 min-h-[44px] px-2"
                >
                  <Plus size={14} />
                  <span>Add card</span>
                </button>
              )}
            </div>

            {/* Add Card Form inline */}
            {activeColId === column.id && !vendorMode && (
              <form
                onSubmit={(e) => handleAddCard(column.id, e)}
                className="rounded-none border border-border bg-muted/30 p-3 mb-3 space-y-2.5 text-xs"
              >
                <input
                  type="text"
                  value={newCardTitle}
                  onChange={(e) => setNewCardTitle(e.target.value)}
                  placeholder="Card title..."
                  className="w-full rounded-none border border-input bg-background px-3 py-2 text-base sm:text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring min-h-[44px]"
                  required
                />
                <textarea
                  rows={2}
                  value={newCardDesc}
                  onChange={(e) => setNewCardDesc(e.target.value)}
                  placeholder="Add details, instructions..."
                  className="w-full rounded-none border border-input bg-background px-3 py-2 text-base sm:text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring min-h-[44px]"
                />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="rounded-none border border-input bg-background px-3 py-2 text-base sm:text-xs text-foreground min-h-[44px]"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                  <label className="flex items-center gap-1.5 text-xs text-foreground cursor-pointer min-h-[44px]">
                    <input
                      type="checkbox"
                      checked={newVendorVisible}
                      onChange={(e) => setNewVendorVisible(e.target.checked)}
                      className="rounded-none border-input text-primary focus:ring-ring"
                    />
                    <span>Vendor Visible</span>
                  </label>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setActiveColId(null)}
                    className="px-3 py-1 text-xs text-muted-foreground hover:text-foreground min-h-[44px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-none bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 min-h-[44px]"
                  >
                    Save
                  </button>
                </div>
              </form>
            )}

            {/* Cards Stack */}
            <div className="flex-1 space-y-2.5 overflow-y-auto">
              {column.cards.length === 0 ? (
                <div className="h-32 border border-dashed border-border rounded-none flex items-center justify-center text-xs text-muted-foreground">
                  No cards in this column
                </div>
              ) : (
                column.cards.map((card) => (
                  <div
                    key={card.id}
                    className="rounded-none border border-border/80 bg-background p-3 text-xs space-y-2 transition hover:border-foreground/30 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-foreground leading-snug">{card.title}</span>
                      <span
                        className={`text-[9px] font-mono uppercase rounded-none px-1.5 py-0.5 border ${
                          card.priority === 'high'
                            ? 'border-destructive/40 text-destructive bg-destructive/10'
                            : card.priority === 'low'
                            ? 'border-border text-muted-foreground bg-muted/30'
                            : 'border-border text-foreground bg-muted/50'
                        }`}
                      >
                        {card.priority}
                      </span>
                    </div>

                    {card.description && (
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{card.description}</p>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[10px] text-muted-foreground font-mono">
                      <div>
                        {card.vendorVisible ? (
                          <span className="text-foreground flex items-center gap-1">
                            <Eye size={11} /> Vendor
                          </span>
                        ) : (
                          <span className="text-muted-foreground flex items-center gap-1">
                            <EyeSlash size={11} /> Team Only
                          </span>
                        )}
                      </div>

                      {/* Card Move Actions */}
                      {!vendorMode && (
                        <div className="flex items-center gap-1">
                          {colIdx > 0 && (
                            <button
                              type="button"
                              onClick={() => handleMoveCard(card.id, visibleColumns[colIdx - 1]!.id)}
                              className="p-2 rounded-none hover:bg-muted text-muted-foreground hover:text-foreground transition min-h-[32px] min-w-[32px] flex items-center justify-center"
                              title={`Move to ${visibleColumns[colIdx - 1]!.title}`}
                              aria-label={`Move card left to ${visibleColumns[colIdx - 1]!.title}`}
                            >
                              <ArrowLeft size={14} />
                            </button>
                          )}
                          {colIdx < visibleColumns.length - 1 && (
                            <button
                              type="button"
                              onClick={() => handleMoveCard(card.id, visibleColumns[colIdx + 1]!.id)}
                              className="p-2 rounded-none hover:bg-muted text-muted-foreground hover:text-foreground transition min-h-[32px] min-w-[32px] flex items-center justify-center"
                              title={`Move to ${visibleColumns[colIdx + 1]!.title}`}
                              aria-label={`Move card right to ${visibleColumns[colIdx + 1]!.title}`}
                            >
                              <ArrowRight size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
