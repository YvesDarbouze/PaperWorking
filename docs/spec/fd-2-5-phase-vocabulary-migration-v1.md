# FD-2.5 — PHASE VOCABULARY MIGRATION (blocking dispatch, precedes FD-3)

**Status:** Locked (Canonical Reference)
**Updated:** 2026-07-18
**Owner:** Founder / Architecture Team

Supersedes the "Option A micro-migration" proposal. Option B (UI-only label mapping over legacy DB values) is VOID — it violates Global Rule 2 at the persistence layer and is never to be proposed again.

## 1. Context

The audit surfaced two legacy phase vocabularies live in the codebase — a six-status model (Sourcing, Under Contract, Rehab, Listed, Sold, Rented) in the state machines, and a seven-index model (findandfund, pipeline, evaluation, closing, rehab, engine, exit) in schema code. Both contradict the canonical four-phase REIL. Collapsing them into four phases is a semantic decision, so the mapping below is founder-approved spec. The agent executes the table; the agent never re-derives it.

## 2. Scope Law — Behavior-Preserving

This dispatch renames and collapses vocabulary. It does NOT redesign gate logic, transitions, or phase behavior — existing transition behavior is re-wired onto the four canonical keys exactly as it behaves today. Gate rebuilds belong to FD-5 (Acquisition→Fund), FD-34 (Fund→Hold), and the HD series (Hold→Exit event trigger). Any urge to "improve" a gate mid-migration is a STOP-and-report, not a change.

## 3. The Mapping Table

Canonical enum keys after migration, exhaustive: `acquisition` | `fund` | `hold` | `exit`.
UI labels: `Acquisition` · `Fund` · `Hold` · `Exit`.
No other phase key, index, label, or "deprecated" enum member survives anywhere.

### Legacy Six-Status Model Mapping

| Legacy Value | Canonical Phase | Rationale |
| :--- | :--- | :--- |
| Sourcing | acquisition | Sourcing / underwriting territory. |
| Under Contract | fund (default — see flag rule) | An executed contract means Acquisition's right-and-intent is secured; Fund is the phase that lives under contract. Migration writes a provenance note on each affected Project. |
| Rehab | hold | Renovation is Hold's work. |
| Listed | hold | Go-to-Market is Hold Column H5. |
| Sold | exit | Completed sale. |
| Rented | exit | Operations live in Exit — the event-triggered gate canon (skill rule 14). |

### Legacy Seven-Index Model Mapping

| Legacy Value | Canonical Phase | Rationale |
| :--- | :--- | :--- |
| findandfund | acquisition | Early-funnel targeting. |
| pipeline | acquisition | Early-funnel targeting. |
| evaluation | acquisition | Underwriting. |
| closing | fund | Closing is Fund's finish line. |
| rehab | hold | Renovation. |
| engine | exit (default) | "Engine" = the property operating/cash-flowing; operations live in Exit. |
| exit | exit | Direct. |

**Flag Rule:** Any Project mapped by an asterisked default (`Under Contract` or `engine` under default conditions) is added to a founder review list delivered with the dry run. Any stored value NOT in this table → STOP and report the value with its Project IDs; never improvise a mapping.
