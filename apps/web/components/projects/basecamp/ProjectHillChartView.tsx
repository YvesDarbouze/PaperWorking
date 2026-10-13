'use client';

import { useState } from 'react';
import { ChartLineUp, Plus, ArrowUpRight, ArrowDownRight } from '@phosphor-icons/react';
import type { ProjectHillChartItem } from '@/lib/projects/types';

export default function ProjectHillChartView({
  projectId,
  items,
  onRefresh,
}: {
  projectId: string;
  items: ProjectHillChartItem[];
  onRefresh: () => void;
}) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(items[0]?.id || null);
  const [isAdding, setIsAdding] = useState(false);
  const [newScope, setNewScope] = useState('');
  const [newPos, setNewPos] = useState(25);
  const [newNotes, setNewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedItem = items.find((i) => i.id === selectedItemId);

  async function handleUpdatePosition(itemId: string, newPosition: number) {
    try {
      const res = await fetch(`/api/projects/${projectId}/hill-chart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_position',
          itemId,
          position: newPosition,
        }),
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleCreateItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newScope.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/hill-chart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_item',
          scopeName: newScope.trim(),
          position: newPos,
          statusNotes: newNotes.trim() || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewScope('');
        setNewNotes('');
        setIsAdding(false);
        if (data.item) setSelectedItemId(data.item.id);
        onRefresh();
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Calculate SVG curve coordinates (0 to 100 on x-axis mapped to a bell curve)
  function getHillCoordinates(pct: number) {
    const x = 50 + (pct / 100) * 700;
    const y = 240 - 180 * Math.sin((pct * Math.PI) / 100);
    return { x, y };
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <ChartLineUp size={20} className="text-foreground shrink-0" />
            <h3 className="text-base font-semibold text-foreground tracking-tight">Hill Chart Trajectory</h3>
            <span className="text-xs font-mono rounded-none border border-border bg-muted/40 px-2 py-0.5 text-foreground">
              {items.length} Scopes
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track real progress: uphill represents figuring it out; downhill represents execution.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAdding(!isAdding)}
          className="inline-flex items-center gap-1.5 rounded-none border border-border bg-card px-3.5 py-2 text-xs font-medium text-foreground hover:bg-muted transition min-h-[44px]"
        >
          <Plus size={16} />
          <span>{isAdding ? 'Cancel' : 'Add Scope Item'}</span>
        </button>
      </div>

      {/* Add Scope Form */}
      {isAdding && (
        <form onSubmit={handleCreateItem} className="rounded-none border border-border bg-card p-4 space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Track a Project Milestone on the Hill Chart</h4>
          <div>
            <label className="block text-xs text-foreground font-medium mb-1">Scope or Workstream Name</label>
            <input
              type="text"
              value={newScope}
              onChange={(e) => setNewScope(e.target.value)}
              placeholder="e.g. Mezzanine Financing Term Sheet"
              className="w-full rounded-none border border-input bg-background px-3 py-2 text-base sm:text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring min-h-[44px]"
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-foreground font-medium mb-1">
                Starting Position: {newPos}% ({newPos <= 50 ? 'Uphill: Figuring it out' : 'Downhill: Executing'})
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={newPos}
                onChange={(e) => setNewPos(Number(e.target.value))}
                className="w-full min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-xs text-foreground font-medium mb-1">Status Notes</label>
              <input
                type="text"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Current state of discovery or execution..."
                className="w-full rounded-none border border-input bg-background px-3 py-2 text-base sm:text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring min-h-[44px]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-none bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition min-h-[44px]"
            >
              Add to Hill
            </button>
          </div>
        </form>
      )}

      {/* SVG Hill Chart Visual Canvas */}
      <div className="rounded-none border border-border bg-card p-4 sm:p-6 overflow-hidden">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2 border-b border-border pb-2">
          <div className="flex items-center gap-1.5 text-foreground font-medium">
            <ArrowUpRight size={16} />
            <span>Figuring It Out (Discovery / Problem Solving)</span>
          </div>
          <div className="flex items-center gap-1.5 text-foreground font-medium">
            <ArrowDownRight size={16} />
            <span>Executing (Getting It Done / Closing)</span>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <svg viewBox="0 0 800 280" className="w-full min-w-[600px] h-[220px]">
            {/* Center dividing dashed line */}
            <line x1="400" y1="20" x2="400" y2="250" stroke="currentColor" strokeOpacity="0.15" strokeDasharray="4 4" />
            <text x="400" y="270" textAnchor="middle" fill="currentColor" fillOpacity="0.5" fontSize="10" fontFamily="monospace">
              TOP OF THE HILL (50%)
            </text>

            {/* Hill Curve Path */}
            <path
              d="M 50 240 Q 400 -60 750 240"
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.3"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* Base Line */}
            <line x1="40" y1="240" x2="760" y2="240" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1" />

            {/* Render Hill Chart Items as draggable/clickable dots */}
            {items.map((item, idx) => {
              const { x, y } = getHillCoordinates(item.position);
              const isSelected = item.id === selectedItemId;

              return (
                <g
                  key={item.id}
                  onClick={() => setSelectedItemId(item.id)}
                  className="cursor-pointer transition-transform hover:scale-110"
                >
                  <circle
                    cx={x}
                    cy={y}
                    r={isSelected ? 8 : 6}
                    fill={isSelected ? 'currentColor' : 'currentColor'}
                    fillOpacity={isSelected ? 1 : 0.75}
                    stroke="var(--background)"
                    strokeWidth={isSelected ? 2.5 : 1.5}
                  />
                  <text
                    x={x}
                    y={y - 14}
                    textAnchor="middle"
                    fill="currentColor"
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight={isSelected ? 'bold' : 'normal'}
                  >
                    {idx + 1}. {item.scopeName.slice(0, 18)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Selected Scope Controller */}
      {selectedItem && (
        <div className="rounded-none border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-medium uppercase rounded-none border border-border px-2 py-0.5 bg-muted/40 text-foreground">
                {selectedItem.position <= 50 ? 'Figuring It Out' : 'Executing'}
              </span>
              <h4 className="text-sm font-semibold text-foreground tracking-tight">{selectedItem.scopeName}</h4>
            </div>
            <p className="text-xs text-muted-foreground">{selectedItem.statusNotes || 'No notes specified.'}</p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-xs font-mono text-muted-foreground shrink-0">Position: {selectedItem.position}%</span>
            <input
              type="range"
              min={0}
              max={100}
              value={selectedItem.position}
              onChange={(e) => handleUpdatePosition(selectedItem.id, Number(e.target.value))}
              className="w-full sm:w-48 min-h-[44px]"
            />
          </div>
        </div>
      )}
    </div>
  );
}
