"use client";

/**
 * PhaseTodoList — Conversational checklist for each REIL phase.
 *
 * Each phase has a curated list of questions/tasks that guide the
 * investor through the lifecycle. Items can be:
 *  - answered inline (date, dollar, yes/no, text)
 *  - marked done with a checkbox
 *  - assigned to a team member or vendor
 *  - flagged as "file upload required"
 */

import { useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type TodoKind = "question" | "checkbox" | "upload" | "assign" | "date" | "dollar";

interface TodoItem {
  id:          string;
  kind:        TodoKind;
  question:    string;
  hint?:       string;
  assignable?: boolean;
  required?:   boolean;
}

interface TodoState {
  done:      boolean;
  value?:    string;
  assignee?: string;
}

// ─── Phase todo definitions ───────────────────────────────────────────────────

const PHASE_TODOS: Record<number, { heading: string; todos: TodoItem[] }> = {
  1: {
    heading: "Acquisition — Find & Contract the Deal",
    todos: [
      { id: "acq-address",   kind: "checkbox",  question: "Property address confirmed and saved as the deal name",   required: true },
      { id: "acq-status",    kind: "question",  question: "What is your current status with this deal?",             hint: "Prospecting, Under Contract, Due Diligence, Pre-Closing, etc.", required: true },
      { id: "acq-mls",       kind: "checkbox",  question: "MLS property data and photos pulled from Bridge API" },
      { id: "acq-comps",     kind: "checkbox",  question: "Comparable sales reviewed and saved" },
      { id: "acq-ownership", kind: "question",  question: "How will title be held?",                                  hint: "Sole, Joint Tenancy, LLC, Trust, etc." },
      { id: "acq-offer",     kind: "dollar",    question: "What price are you offering (or did you pay)?",            required: true },
      { id: "acq-saledate",  kind: "date",      question: "Date of sale or projected closing date",                   hint: "Can be up to 1 year in the past for retrospective deals" },
      { id: "acq-response",  kind: "question",  question: "What was the seller's response?",                          hint: "Accepted, Countered at $X, Rejected, Pending" },
      { id: "acq-crowdfund", kind: "checkbox",  question: "Crowdfunding or investor invites sent",                    assignable: true },
      { id: "acq-offerltr",  kind: "upload",    question: "Offer letter uploaded or generated",                       assignable: true },
      { id: "acq-attorney",  kind: "assign",    question: "Real estate attorney identified",                           hint: "Assign to a team member or vendor", assignable: true },
    ],
  },
  2: {
    heading: "Purchase — Close the Transaction",
    todos: [
      { id: "pur-attorney",  kind: "assign",    question: "Real estate attorney engaged",                             hint: "Assign or invite a vendor account", assignable: true, required: true },
      { id: "pur-loanproc",  kind: "assign",    question: "Loan processor / mortgage broker identified",              hint: "Assign or invite a vendor account", assignable: true, required: true },
      { id: "pur-contract",  kind: "upload",    question: "Signed purchase contract uploaded",                        required: true },
      { id: "pur-loanapp",   kind: "checkbox",  question: "Loan application submitted to lender" },
      { id: "pur-appraisal", kind: "assign",    question: "Property appraisal ordered",                               assignable: true },
      { id: "pur-inspect",   kind: "assign",    question: "Home inspection scheduled",                                 assignable: true },
      { id: "pur-title",     kind: "assign",    question: "Title search initiated",                                    assignable: true },
      { id: "pur-emd",       kind: "dollar",    question: "Earnest money deposit amount" },
      { id: "pur-cdisc",     kind: "upload",    question: "Closing disclosure reviewed and signed" },
      { id: "pur-walkthru",  kind: "checkbox",  question: "Final walkthrough completed" },
      { id: "pur-closing",   kind: "date",      question: "Actual closing date (deed recorded)",                      required: true },
      { id: "pur-closecost", kind: "dollar",    question: "Total closing costs paid" },
    ],
  },
  3: {
    heading: "Hold — Manage & Operate the Asset",
    todos: [
      { id: "hld-strategy",  kind: "question",  question: "What is the hold strategy?",                               hint: "Rehab & Flip, Long-term Rental, Short-term Rental (Airbnb), BRRRR", required: true },
      { id: "hld-rehabbudg", kind: "dollar",    question: "Total rehab budget" },
      { id: "hld-contractor",kind: "assign",    question: "General contractor engaged",                               assignable: true },
      { id: "hld-rehabdone", kind: "date",      question: "Rehab completion date (or estimated)" },
      { id: "hld-taxes",     kind: "dollar",    question: "Monthly property tax holding cost" },
      { id: "hld-insurance", kind: "dollar",    question: "Monthly insurance cost" },
      { id: "hld-utilities", kind: "dollar",    question: "Monthly utilities cost" },
      { id: "hld-mortgage",  kind: "dollar",    question: "Monthly mortgage / debt service payment" },
      { id: "hld-mgmt",      kind: "assign",    question: "Property manager assigned",                                hint: "Name + contact; set management fee %", assignable: true },
      { id: "hld-rent",      kind: "dollar",    question: "Monthly gross rent collected" },
      { id: "hld-vacancy",   kind: "question",  question: "Vacancy rate assumption or actual",                        hint: "Default is 7% economic vacancy" },
      { id: "hld-tenant",    kind: "checkbox",  question: "Lease signed with tenant(s)",                              assignable: true },
      { id: "hld-cashflow",  kind: "checkbox",  question: "Monthly cash flow tracking active" },
    ],
  },
  4: {
    heading: "Exit — Sell, Settle, and Report",
    todos: [
      { id: "ext-list",      kind: "date",      question: "Property listed for sale — listing date" },
      { id: "ext-ask",       kind: "dollar",    question: "Asking / listing price" },
      { id: "ext-mktcost",   kind: "dollar",    question: "Total marketing and staging costs" },
      { id: "ext-showings",  kind: "question",  question: "Number of showings to date" },
      { id: "ext-offer",     kind: "dollar",    question: "Accepted sale offer price",                                required: true },
      { id: "ext-saledate",  kind: "date",      question: "Final sale / closing date",                               required: true },
      { id: "ext-closecost", kind: "dollar",    question: "Seller closing costs and commissions" },
      { id: "ext-roi",       kind: "checkbox",  question: "Realized ROI calculated and saved to Insights" },
      { id: "ext-quarterly", kind: "upload",    question: "Quarterly tax document generated",                         assignable: true },
      { id: "ext-annual",    kind: "upload",    question: "Annual tax report generated (Schedule E / K-1)",           assignable: true },
      { id: "ext-close",     kind: "checkbox",  question: "Project archived / marked Closed",                        required: true },
    ],
  },
};

// ─── Kind icon ────────────────────────────────────────────────────────────────

function kindIcon(kind: TodoKind, color: string) {
  const map: Record<TodoKind, string> = {
    question: "chat_bubble",
    checkbox: "check_circle",
    upload:   "upload_file",
    assign:   "person_add",
    date:     "calendar_today",
    dollar:   "attach_money",
  };
  return (
    <span
      className="material-symbols-outlined text-[16px] flex-shrink-0 mt-0.5"
      style={{ color, fontVariationSettings: "'FILL' 0" }}
    >
      {map[kind]}
    </span>
  );
}

// ─── Single todo row ──────────────────────────────────────────────────────────

function TodoRow({
  item,
  state,
  phaseColor,
  onChange,
}: {
  item:       TodoItem;
  state:      TodoState;
  phaseColor: string;
  onChange:   (s: Partial<TodoState>) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const toggleDone = useCallback(() => onChange({ done: !state.done }), [state.done, onChange]);

  const rowBg = state.done
    ? "rgba(255,255,255,0.01)"
    : "rgba(255,255,255,0.025)";

  return (
    <div
      className="rounded-xl overflow-hidden transition-all duration-150"
      style={{ background: rowBg, border: "1px solid rgba(255,255,255,0.06)" }}
    >
      {/* Main row */}
      <div className="flex items-start gap-3 px-4 py-3">
        {/* Checkbox */}
        <button
          onClick={toggleDone}
          className="mt-0.5 w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center transition-all duration-150"
          style={{
            background:  state.done ? `${phaseColor}22` : "rgba(255,255,255,0.06)",
            border:      `1.5px solid ${state.done ? phaseColor : "rgba(255,255,255,0.15)"}`,
          }}
          aria-checked={state.done}
          role="checkbox"
        >
          {state.done && (
            <span className="material-symbols-outlined text-[12px]" style={{ color: phaseColor, fontVariationSettings: "'FILL' 1" }}>
              check
            </span>
          )}
        </button>

        {/* Kind icon */}
        {kindIcon(item.kind, state.done ? "rgba(253,255,252,0.25)" : phaseColor)}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p
            className="text-[13px] leading-snug"
            style={{
              color:          state.done ? "rgba(253,255,252,0.35)" : "rgba(253,255,252,0.85)",
              textDecoration: state.done ? "line-through" : "none",
            }}
          >
            {item.question}
            {item.required && !state.done && (
              <span className="ml-1.5 text-[10px] font-bold" style={{ color: phaseColor }}>*</span>
            )}
          </p>
          {item.hint && !state.done && (
            <p className="text-[11px] mt-0.5" style={{ color: "rgba(253,255,252,0.30)" }}>
              {item.hint}
            </p>
          )}
        </div>

        {/* Expand / assign button */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {item.assignable && !state.done && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="text-[10px] font-semibold px-2 py-1 rounded-lg transition-opacity hover:opacity-70"
              style={{
                background: `${phaseColor}12`,
                color:      phaseColor,
                border:     `1px solid ${phaseColor}25`,
              }}
            >
              Assign
            </button>
          )}
          {(item.kind === "question" || item.kind === "dollar" || item.kind === "date") && !state.done && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="flex items-center"
              aria-label="Enter answer"
            >
              <span
                className="material-symbols-outlined text-[16px] transition-transform duration-150"
                style={{
                  color: "rgba(253,255,252,0.25)",
                  transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                }}
              >
                expand_more
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Expanded panel */}
      {expanded && !state.done && (
        <div
          className="px-4 pb-4 pt-1 space-y-2"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          {/* Assignee field */}
          {item.assignable && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(253,255,252,0.35)" }}>
                Assign to (email or team member)
              </label>
              <input
                className="w-full rounded-lg px-3 py-2 text-[13px] outline-none bg-transparent"
                style={{
                  background: "rgba(14,22,28,0.8)",
                  border:     "1px solid rgba(255,255,255,0.09)",
                  color:      "rgba(253,255,252,0.85)",
                }}
                placeholder="name@example.com or @teammate"
                value={state.assignee ?? ""}
                onChange={e => onChange({ assignee: e.target.value })}
              />
              <p className="text-[10px]" style={{ color: "rgba(253,255,252,0.25)" }}>
                Invitees need a Standard PaperWorking account to access this project.
              </p>
            </div>
          )}

          {/* Answer field */}
          {(item.kind === "question" || item.kind === "dollar" || item.kind === "date") && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(253,255,252,0.35)" }}>
                {item.kind === "dollar" ? "Amount ($)" : item.kind === "date" ? "Date" : "Your answer"}
              </label>
              <input
                className="w-full rounded-lg px-3 py-2 text-[13px] outline-none bg-transparent"
                type={item.kind === "date" ? "date" : "text"}
                inputMode={item.kind === "dollar" ? "decimal" : "text"}
                style={{
                  background: "rgba(14,22,28,0.8)",
                  border:     "1px solid rgba(255,255,255,0.09)",
                  color:      "rgba(253,255,252,0.85)",
                }}
                placeholder={item.kind === "dollar" ? "0.00" : item.kind === "date" ? "" : item.hint ?? "Type your answer…"}
                value={state.value ?? ""}
                onChange={e => onChange({ value: e.target.value })}
              />
            </div>
          )}

          {/* Upload cue */}
          {item.kind === "upload" && (
            <div
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 cursor-pointer transition-opacity hover:opacity-70"
              style={{ background: `${phaseColor}10`, border: `1px dashed ${phaseColor}30` }}
            >
              <span className="material-symbols-outlined text-[18px]" style={{ color: phaseColor }}>upload</span>
              <span className="text-[12px] font-medium" style={{ color: phaseColor }}>
                Click to upload or drag a file
              </span>
            </div>
          )}

          <button
            onClick={() => { setExpanded(false); onChange({ done: true }); }}
            className="text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
            style={{ background: `${phaseColor}18`, color: phaseColor }}
          >
            Mark complete
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main export ───────────────────────────────────────────────────────────────

interface PhaseTodoListProps {
  phase:      number;  // 1–4
  phaseColor: string;
  projectId?: string;
}

export function PhaseTodoList({ phase, phaseColor }: PhaseTodoListProps) {
  const def = PHASE_TODOS[phase];
  const [states, setStates] = useState<Record<string, TodoState>>(() => {
    const init: Record<string, TodoState> = {};
    def?.todos.forEach(t => { init[t.id] = { done: false }; });
    return init;
  });

  if (!def) return null;

  const doneCount = Object.values(states).filter(s => s.done).length;
  const totalCount = def.todos.length;
  const pct = Math.round((doneCount / totalCount) * 100);

  const handleChange = useCallback(
    (id: string, patch: Partial<TodoState>) =>
      setStates(prev => ({ ...prev, [id]: { ...prev[id], ...patch } })),
    [],
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[14px] font-bold" style={{ color: "rgba(253,255,252,0.90)", letterSpacing: "-0.01em" }}>
            {def.heading}
          </h3>
          <p className="text-[11px] mt-0.5" style={{ color: "rgba(253,255,252,0.38)" }}>
            {doneCount} of {totalCount} tasks complete
          </p>
        </div>
        <span
          className="text-[12px] font-bold tabular-nums px-2.5 py-1 rounded-full"
          style={{ background: `${phaseColor}18`, color: phaseColor }}
        >
          {pct}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: phaseColor }}
        />
      </div>

      {/* Todo items */}
      <div className="space-y-2">
        {def.todos.map(item => (
          <TodoRow
            key={item.id}
            item={item}
            state={states[item.id] ?? { done: false }}
            phaseColor={phaseColor}
            onChange={patch => handleChange(item.id, patch)}
          />
        ))}
      </div>
    </div>
  );
}
