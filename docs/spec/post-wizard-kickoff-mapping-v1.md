# Post-Wizard Kickoff Mapping — v1

**Committed path:** `docs/spec/post-wizard-kickoff-mapping-v1.md`
**Status:** Founder-committed canonical spec. Referenced by HD-5 (reading proof) and by any dispatch describing a phase kickoff screen.

---

## 0. Governance

- This document is **subordinate** to `.claude/skills/paperworking-reil/SKILL.md` and to `docs/spec/reil-complete-four-phase-questions-tasks.md` (the card-level authority). Where this document conflicts with either, they govern.
- **Phase-label scope fence:** the canonical REIL phase labels are `Acquisition` · `Fund` · `Hold` · `Exit`. No directive in or around this document renames them. Industry synonyms ("Purchase," "Closing," "Stabilization," "Disposition") appearing in any kickoff surface are defects on sight.
- **No math here.** This document defines navigation and first-input intent only. All metric derivation lives in `deriveAllProjectMetrics` per `docs/spec/reil-kpi-formulas.md` and the 33-metrics collection matrix. Nothing in this document defines, restates, or approximates a formula.
- **No new cards or variables here.** The questions doc and the variable registry own every card name, question, and atomic input. This mapping constrains *which existing inputs come first* and *which metrics light up* — it never invents a card.
- **Provenance:** extracted from the founder-reviewed Project Creation wizard specification (authored 2026-06-02 session, §6 "Post-wizard landing"), corrected to canonical phase labels at commit time. Every delta from the source text is recorded in §5 for the countersign record.

---

## 1. Scope — the first 30 seconds after the wizard closes

The wizard's job ends when the modal closes, but the *experience* of Project Creation continues for one more screen. The investor lands in the phase workspace for their chosen entry phase at that phase's **kickoff screen** — a screen purpose-built to convert the wizard's momentum into first inputs.

---

## 2. Kickoff screen anatomy (identical structure across all four phases)

| Region | Content |
|---|---|
| Project shell header | Property address · phase chip · strategy chip · ownership chip · phase progress strip |
| Welcome banner (dismissible, 80 px tall) | **Header:** "Welcome to the [Phase] workspace." **Body:** "Fill in these first to light up your [phase-relevant metric list]." **CTA:** `Show me around →` (optional 3-step product tour) |
| First-input screen | The phase's most important first screen, with empty-state guidance throughout |

---

## 3. Welcome banner behavior (normative)

1. **Dismissible, always.** Power users (an investor entering their tenth past deal) can clear it instantly.
2. **Dismissal persists per phase, per user.** Once dismissed in a given phase, subsequent Projects entering that phase skip the banner entirely.
3. **Honest empties.** Any metric the banner names renders as an honest empty state that deep-links to its collecting card — never a placeholder number, never a fake value (Honesty Rule, SKILL.md rule 4).
4. **Styling** comes exclusively from the UX-0 extracted token set and respects the typography readability floor (SKILL.md rule 12). The 80 px banner height is committed layout, not an ad-hoc value.
5. **UX law applies** (SKILL.md rule 11): the kickoff screen is one decision per screen with a why-line, save/resumes, and reopens for editing like every other surface.

---

## 4. Phase-by-phase kickoff rows

**Column-resolution rule:** each row constrains the atomic inputs collected first and the metrics lit — the collecting card and on-screen name resolve per the committed questions doc. Where the 2026-06-02 source named a screen ("Quick Screen," "Financing," "Operations"), that name is descriptive of intent, not a mandate to create a new surface.

| Phase | First-input intent | Metrics lit (banner body list) |
|---|---|---|
| Acquisition | Asking price + projected monthly rent | GRM |
| Fund | Loan amount, rate, term | Annual Debt Service, DSCR (preview) |
| **Hold** | **Rent roll + first itemized expense lines** | **NOI, Cash Flow, Expense Ratio** |
| Exit | Active disposition: exit assumptions (sale price, hold period, selling costs). Retroactive past deal: the Realized Summary single form (acquisition price + date, sale price + date, total cash invested, total rehab, total rental income, total operating expenses, debt service) | IRR (projected or realized) |

### 4a. The Hold kickoff row (HD-5 reading-proof target)

Landing in Hold surfaces the first-input screen that collects the rent roll and the first itemized expense lines, lighting **NOI, Cash Flow, and Expense Ratio**, with the dismissible welcome banner behavior of §3. Metrics without sufficient inputs show what's missing and deep-link to the collecting card. Expense lines use only the canonical category tag set (SKILL.md rule 8).

### 4b. Retroactive past-deal note (Exit only)

When the Project was created via the past-deal toggle, the kickoff screen is the Realized Summary form and the phase chip displays `Realized · Closed [date]` rather than `Exit`. An investor with their numbers handy completes a full past-deal record in 5–10 minutes.

---

## 5. Deltas from the 2026-06-02 source (countersign record)

| # | Delta | Reason |
|---|---|---|
| D-1 | Source phase row "Purchase" → `Fund` | SKILL.md rule 2 — "Purchase" is never a phase label |
| D-2 | Source phase row "Exit / Rent" → `Exit` | Exit encompasses SALE \| LEASE \| RENT via the single `disposition_type` field |
| D-3 | Column-resolution rule added (§4) | Source-era screen names predate the committed column/card sets; the questions doc owns card names |
| D-4 | Honest-empty + canonical-expense-category language added (§3.3, §4a) | Alignment with SKILL.md rules 4 and 8; no behavioral change intended |

**Founder ratification:** D-1, D-2, D-3, and D-4 ratified by the founder ("agreed"), 2026-07-21. This section is the countersign of record.

**OPEN-1 (founder-parked 2026-07-21; does not block HD-5):** the source assumed a sale when specifying the *active* Exit kickoff. The active-Exit kickoff variant for LEASE and RENT dispositions is unspecified. Founder direction: remains parked; resolve before authoring the Exit series. Agents do not resolve this.
