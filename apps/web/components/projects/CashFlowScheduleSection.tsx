'use client';

import { useMemo, useState } from 'react';
import type { StoredCashFlowEvent } from '@paperworking/financial-engine';
import {
  sortCashFlowEventsByDate,
  validateCashFlowEvent,
} from '@paperworking/financial-engine';

type DraftCashFlowEvent = {
  id?: string;
  date: string;
  amount: string;
  type: 'investment' | 'return' | '';
  description: string;
};

function emptyDraft(): DraftCashFlowEvent {
  return { date: '', amount: '', type: '', description: '' };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function draftToStored(draft: DraftCashFlowEvent, id: string): StoredCashFlowEvent | null {
  const amount = Number(draft.amount);
  if (!draft.date || !draft.type || !Number.isFinite(amount) || amount <= 0) return null;
  return {
    id,
    date: draft.date,
    amount,
    type: draft.type,
    description: draft.description.trim() || undefined,
  };
}

export default function CashFlowScheduleSection({
  events,
  onChange,
  fieldErrors,
}: {
  events: StoredCashFlowEvent[];
  onChange: (events: StoredCashFlowEvent[]) => void;
  fieldErrors?: string | null;
}) {
  const [draft, setDraft] = useState<DraftCashFlowEvent>(emptyDraft);
  const [draftErrors, setDraftErrors] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DraftCashFlowEvent>(emptyDraft);
  const [editErrors, setEditErrors] = useState<string[]>([]);

  const sortedEvents = useMemo(() => sortCashFlowEventsByDate(events), [events]);

  function validateDraft(input: DraftCashFlowEvent, id: string): string[] {
    const amount = Number(input.amount);
    const errors = validateCashFlowEvent({
      id,
      date: input.date,
      amount: Number.isFinite(amount) ? amount : NaN,
      type: input.type || undefined,
      description: input.description.trim() || undefined,
    });
    return errors.map((e) => e.message);
  }

  function handleAddEvent() {
    const id = crypto.randomUUID();
    const errors = validateDraft(draft, id);
    if (errors.length > 0) {
      setDraftErrors(errors);
      return;
    }
    const stored = draftToStored(draft, id);
    if (!stored) {
      setDraftErrors(['Complete all required fields before adding an event.']);
      return;
    }
    onChange(sortCashFlowEventsByDate([...events, stored]));
    setDraft(emptyDraft());
    setDraftErrors([]);
  }

  function startEdit(event: StoredCashFlowEvent) {
    setEditingId(event.id);
    setEditDraft({
      id: event.id,
      date: event.date,
      amount: String(event.amount),
      type: event.type,
      description: event.description ?? '',
    });
    setEditErrors([]);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft(emptyDraft());
    setEditErrors([]);
  }

  function saveEdit() {
    if (!editingId) return;
    const errors = validateDraft(editDraft, editingId);
    if (errors.length > 0) {
      setEditErrors(errors);
      return;
    }
    const stored = draftToStored(editDraft, editingId);
    if (!stored) {
      setEditErrors(['Complete all required fields before saving.']);
      return;
    }
    onChange(sortCashFlowEventsByDate(events.map((e) => (e.id === editingId ? stored : e))));
    cancelEdit();
  }

  function deleteEvent(id: string) {
    onChange(events.filter((event) => event.id !== id));
    if (editingId === id) cancelEdit();
  }

  return (
    <section
      data-testid="cash-flow-schedule"
      className="md:col-span-2 mt-2 rounded-xl border border-white/10 bg-white/[0.02] p-4"
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-white">Cash flow schedule</h3>
        <p className="mt-1 text-xs text-white/55">
          Cash outflows represent money invested into the project. Cash inflows represent money
          received from the project. These events calculate IRR and Equity Multiple.
        </p>
      </div>

      {sortedEvents.length === 0 ? (
        <p className="mb-4 rounded-lg border border-dashed border-white/10 px-4 py-3 text-xs text-white/50">
          Add your investment and return events to calculate IRR and Equity Multiple.
        </p>
      ) : (
        <div className="mb-4 overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="text-white/45">
              <tr>
                <th className="px-2 py-2 font-medium">Date</th>
                <th className="px-2 py-2 font-medium">Type</th>
                <th className="px-2 py-2 font-medium">Amount</th>
                <th className="px-2 py-2 font-medium">Description</th>
                <th className="px-2 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedEvents.map((event) =>
                editingId === event.id ? (
                  <tr key={event.id} className="border-t border-white/8 align-top">
                    <td className="px-2 py-2">
                      <input
                        type="date"
                        value={editDraft.date}
                        onChange={(e) => setEditDraft((prev) => ({ ...prev, date: e.target.value }))}
                        className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-white"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <select
                        value={editDraft.type}
                        onChange={(e) =>
                          setEditDraft((prev) => ({
                            ...prev,
                            type: e.target.value as DraftCashFlowEvent['type'],
                          }))
                        }
                        className="w-full rounded-lg border border-white/10 bg-[#16141a] px-2 py-1.5 text-white"
                      >
                        <option value="">Select…</option>
                        <option value="investment">Investment / Outflow</option>
                        <option value="return">Return / Inflow</option>
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editDraft.amount}
                        onChange={(e) =>
                          setEditDraft((prev) => ({ ...prev, amount: e.target.value }))
                        }
                        className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-white"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={editDraft.description}
                        onChange={(e) =>
                          setEditDraft((prev) => ({ ...prev, description: e.target.value }))
                        }
                        className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-white"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={saveEdit}
                          className="rounded-lg bg-[#00DD94] px-2 py-1 text-[11px] font-semibold text-[#0a0a0f]"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="rounded-lg border border-white/15 px-2 py-1 text-[11px] text-white/70"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={event.id} className="border-t border-white/8">
                    <td className="px-2 py-2 text-white/80">{event.date}</td>
                    <td className="px-2 py-2 text-white/80">
                      {event.type === 'investment' ? 'Investment / Outflow' : 'Return / Inflow'}
                    </td>
                    <td className="px-2 py-2 text-white/80">{formatCurrency(event.amount)}</td>
                    <td className="px-2 py-2 text-white/60">{event.description ?? '—'}</td>
                    <td className="px-2 py-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(event)}
                          className="rounded-lg border border-white/15 px-2 py-1 text-[11px] text-white/70 hover:text-white"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteEvent(event.id)}
                          className="rounded-lg border border-red-400/20 px-2 py-1 text-[11px] text-red-200/80 hover:text-red-100"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
          {editErrors.length > 0 ? (
            <p className="mt-2 text-xs text-red-300">{editErrors.join(' ')}</p>
          ) : null}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-xs">
          <span className="mb-1 block text-white/55">Event date</span>
          <input
            type="date"
            data-testid="cash-flow-draft-date"
            value={draft.date}
            onChange={(e) => setDraft((prev) => ({ ...prev, date: e.target.value }))}
            className="w-full min-w-0 max-w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="text-xs">
          <span className="mb-1 block text-white/55">Event type</span>
          <select
            data-testid="cash-flow-draft-type"
            value={draft.type}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, type: e.target.value as DraftCashFlowEvent['type'] }))
            }
            className="w-full rounded-xl border border-white/10 bg-[#16141a] px-3 py-2 text-sm text-white"
          >
            <option value="">Select type…</option>
            <option value="investment">Investment / Outflow</option>
            <option value="return">Return / Inflow</option>
          </select>
        </label>
        <label className="text-xs">
          <span className="mb-1 block text-white/55">Amount ($)</span>
          <input
            type="number"
            data-testid="cash-flow-draft-amount"
            min="0"
            step="0.01"
            value={draft.amount}
            onChange={(e) => setDraft((prev) => ({ ...prev, amount: e.target.value }))}
            className="w-full min-w-0 max-w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="text-xs md:col-span-2">
          <span className="mb-1 block text-white/55">Description (optional)</span>
          <input
            type="text"
            data-testid="cash-flow-draft-description"
            value={draft.description}
            onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Initial equity investment, sale proceeds, distribution…"
            className="w-full min-w-0 max-w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
          />
        </label>
      </div>

      {draftErrors.length > 0 ? (
        <p className="mt-2 text-xs text-red-300">{draftErrors.join(' ')}</p>
      ) : null}
      {fieldErrors ? <p className="mt-2 text-xs text-red-300">{fieldErrors}</p> : null}

      <div className="mt-3">
        <button
          type="button"
          data-testid="cash-flow-add-button"
          onClick={handleAddEvent}
          className="rounded-xl border border-[#00DD94]/40 px-4 py-2 text-xs font-semibold text-[#00DD94] hover:bg-[#00DD94]/10"
        >
          Add cash flow
        </button>
      </div>
    </section>
  );
}
