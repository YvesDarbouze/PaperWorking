'use client';

import { useState } from 'react';
import {
  CalendarCheck,
  Plus,
  DownloadSimple,
  Warning,
} from '@phosphor-icons/react';
import type { ProjectScheduleEvent } from '@/lib/projects/types';
import BasecampMiniCalendar from './BasecampMiniCalendar';

export default function ProjectScheduleView({
  projectId,
  events,
  onRefresh,
}: {
  projectId: string;
  events: ProjectScheduleEvent[];
  onRefresh: () => void;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [showSyncGuide, setShowSyncGuide] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState<'contingency' | 'closing' | 'milestone' | 'meeting' | 'inspection'>('milestone');
  const [isHardDate, setIsHardDate] = useState(false);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !date || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          date,
          category,
          isHardDate,
          notes: notes.trim() || undefined,
        }),
      });
      if (res.ok) {
        setTitle('');
        setDate('');
        setNotes('');
        setIsAdding(false);
        onRefresh();
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Sort events chronologically
  const sortedEvents = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <CalendarCheck size={20} className="text-foreground shrink-0" />
            <h3 className="text-base font-semibold text-foreground tracking-tight">Schedule & Deadlines</h3>
            <span className="text-xs font-mono rounded-none border border-border bg-muted/40 px-2 py-0.5 text-foreground">
              {events.length} Milestones
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Key REIL dates: earnest money deadlines, loan commitments, inspections, and closing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSyncGuide(!showSyncGuide)}
            className="inline-flex items-center gap-1.5 rounded-none border border-border bg-card px-3.5 py-2 text-xs font-medium text-foreground hover:bg-muted transition min-h-[44px]"
          >
            <DownloadSimple size={16} />
            <span>{showSyncGuide ? 'Hide Sync Guide' : 'Calendar Sync'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAdding(!isAdding)}
            className="inline-flex items-center gap-1.5 rounded-none border border-border bg-card px-3.5 py-2 text-xs font-medium text-foreground hover:bg-muted transition min-h-[44px]"
          >
            <Plus size={16} />
            <span>{isAdding ? 'Cancel' : 'Add Milestone'}</span>
          </button>
        </div>
      </div>

      {/* Calendar Sync Instructions Box */}
      {showSyncGuide && (
        <div className="rounded-none border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Subscribe or Import Calendar (.ics)
            </h4>
            <a
              href={`/api/projects/${projectId}/schedule/export`}
              download
              className="text-xs font-medium text-foreground underline hover:no-underline"
            >
              Download project-schedule.ics
            </a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-muted-foreground">
            <div className="border border-border/60 bg-muted/20 p-2.5 space-y-1">
              <strong className="text-foreground block">Google Calendar</strong>
              <p className="text-[11px] leading-relaxed">
                Go to Settings &gt; Import &amp; Export &gt; Select the downloaded .ics file and assign to your investment calendar.
              </p>
            </div>
            <div className="border border-border/60 bg-muted/20 p-2.5 space-y-1">
              <strong className="text-foreground block">Microsoft Outlook</strong>
              <p className="text-[11px] leading-relaxed">
                Open Outlook &gt; Add Calendar &gt; Upload from file &gt; Browse to the downloaded schedule file.
              </p>
            </div>
            <div className="border border-border/60 bg-muted/20 p-2.5 space-y-1">
              <strong className="text-foreground block">HEY Calendar</strong>
              <p className="text-[11px] leading-relaxed">
                In HEY Calendar settings, select Import and drop the .ics file. Milestones and hard dates appear on your timeline.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Add Event Form */}
      {isAdding && (
        <form onSubmit={handleCreateEvent} className="rounded-none border border-border bg-card p-4 space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Add a Milestone or Deadline</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-foreground font-medium mb-1">Milestone Name</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Loan Commitment Hard Deadline"
                className="w-full rounded-none border border-input bg-background px-3 py-2 text-base sm:text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring min-h-[44px]"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-foreground font-medium mb-1">Target Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-none border border-input bg-background px-3 py-2 text-base sm:text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring min-h-[44px]"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-foreground font-medium mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full rounded-none border border-input bg-background px-3 py-2 text-base sm:text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring min-h-[44px]"
              >
                <option value="contingency">Contingency Deadline</option>
                <option value="closing">Escrow / Closing</option>
                <option value="inspection">Inspection / Contractor</option>
                <option value="milestone">General Milestone</option>
                <option value="meeting">Partner Meeting</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pt-2 sm:pt-6">
              <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer min-h-[44px]">
                <input
                  type="checkbox"
                  checked={isHardDate}
                  onChange={(e) => setIsHardDate(e.target.checked)}
                  className="rounded-none border-input text-destructive focus:ring-ring"
                />
                <span className="font-medium text-foreground">Critical Hard Date (Contract Deadline)</span>
              </label>
            </div>
          </div>
          <div>
            <label className="block text-xs text-foreground font-medium mb-1">Notes / Instructions</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Deposit goes non-refundable after 5:00 PM CST."
              className="w-full rounded-none border border-input bg-background px-3 py-2 text-base sm:text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring min-h-[44px]"
            />
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
              Save Milestone
            </button>
          </div>
        </form>
      )}

      {/* Calendar Grid & Events Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <BasecampMiniCalendar events={sortedEvents} />
        </div>

        {/* Events List */}
        <div className="md:col-span-2 space-y-2.5">
          {sortedEvents.length === 0 ? (
            <div className="rounded-none border border-border bg-card p-8 text-center text-muted-foreground text-xs">
              No milestones or dates recorded.
            </div>
          ) : (
          sortedEvents.map((evt) => (
            <div
              key={evt.id}
              className={`rounded-none border p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition ${
                evt.isHardDate
                  ? 'border-destructive/40 bg-destructive/5'
                  : 'border-border bg-card hover:bg-muted/30'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono uppercase rounded-none border border-border px-2 py-0.5 bg-muted/40 text-foreground">
                    {evt.category}
                  </span>
                  {evt.isHardDate && (
                    <span className="text-[10px] font-mono uppercase rounded-none px-2 py-0.5 bg-destructive/15 text-destructive border border-destructive/30 flex items-center gap-1 font-semibold">
                      <Warning size={12} weight="bold" /> Hard Date
                    </span>
                  )}
                  <h4 className="text-sm font-semibold text-foreground tracking-tight">{evt.title}</h4>
                </div>
                {evt.notes && <p className="text-muted-foreground text-[11px]">{evt.notes}</p>}
              </div>

              <div className="shrink-0 text-left sm:text-right font-mono">
                <span className="text-xs font-medium text-foreground block">{evt.date}</span>
                <span className="text-[10px] text-muted-foreground uppercase">Phase: {evt.phase}</span>
              </div>
            </div>
          ))
        )}
        </div>
      </div>
    </div>
  );
}
