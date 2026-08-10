# Walkthrough — Project Workflow Screen Simplification

**Date:** 2026-08-05
**Branch:** `Yves/feature-development`
**Sprint:** UX/UI Hardening, August 2026 — Prompt 7
**Route:** `/dashboard/projects/[id]/*` (shared workspace layout)

---

## 0. Verification Summary

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | ✅ **0 errors** |
| `npx jest` | ⚠️ 2854/2866 — same **2 pre-existing** DB suites, unchanged |
| `npx eslint` on new/changed components | ✅ **0 errors** |
| `e2e/project-workflow-simplify.spec.ts` | ✅ **7/7** |
| Regression (insights + tax intelligence) | ✅ 23/23 combined |

---

## 1. Button Hierarchy (req 1) — DONE

**Before:** six equal-weight uppercase buttons in one row —
`SETTINGS · EXPORT PDF · SHARE CPA · INSTRUMENTS · HIRE PROFESSIONAL · ARCHIVE`.
Nothing signalled which mattered; the row read as undifferentiated chrome.

**After:** `src/components/project/ProjectActionBar.tsx` (new), three tiers:

| Tier | Control | Treatment |
|---|---|---|
| **Primary** | "Continue Workflow" | The only filled button. Routes to the phase the deal is actually in, resolved via `PHASE_STEPS.find(p => p.phaseKey === project.phaseStatus)` |
| **Secondary** | Share ▾ | Dropdown: Share with CPA · Copy Link · Email |
| **Tertiary** | Settings | Icon-only gear |
| **Tertiary** | More ▾ | Dropdown: Instruments · Hire Professional · **Archive** (danger, below a divider) |

Six controls became four, two of them collapsed into menus. Both dropdowns close
on outside-click and Escape.

### Export PDF removed
Deleted outright, not relocated. It called `window.print()`, producing an
unbranded page dump that looked like a product feature. Export belongs to
Reports / Tax Intelligence, which owns the branded jsPDF pipeline built in
Prompt 5 (wordmark, title, generation date, property context, page numbers).

A test asserts **no** `button`/`a` anywhere on the screen matches `/export\s*pdf/i`,
so it cannot creep back.

### Spacing
`gap-3` (12px) throughout. Asserted programmatically at 1440px and 768px: the
test measures the horizontal gap between every adjacent control sharing a row
and fails below 12px, skipping wrapped pairs.

---

## 2. Phase Timeline (req 2) — DONE

`PhaseProgressTracker` previously used hardcoded grayscale — `#1A1A1A`,
`#FFFFFF`, `#CCCCCC`, `#BFBFBF` — so it carried no phase identity and rendered
**locked phases as white circles** on the dark workspace.

Now driven by `getPhaseConfig()` from `src/lib/constants/phaseColors.ts`, the
canonical palette established in Prompt 1:

| Phase | Colour |
|---|---|
| 1 · Acquisition | amber `#F59E0B` |
| 2 · Fund | blue `#3B82F6` |
| 3 · Hold | emerald `#34d399`, subdued |
| 4 · Exit | purple `#A78BFA` |

- **Active / completed** — filled with the phase colour at `bgHex`, `1.5px`
  border in `hex`, label at weight 700.
- **Future (locked)** — outline only against `--pw-border`, muted label at
  weight 500, no fill.
- **Connector** — a single `h-px` hairline, tinted to the phase colour at 50%
  opacity once complete. The previous `2px` bar with a filled progress segment
  and a half-width "active" overlay read as a loading indicator.
- Dropped the `0 0 0 4px` shadow ring and the `animate-ping` pulse — decoration
  that conveyed nothing the fill and underline did not.

Nodes were already 36px circles; they keep their step number, and lock icons
remain for locked phases.

---

## 3. KPI Strip (req 3) — DONE

Each of the seven metrics was a **bordered, padded card** (`rounded border p-3`
on `--bg-surface`), so the strip read as seven separate panels stacked in a row.

Now borderless: a single `border-l` hairline separates items (`first:border-l-0`),
padding drops to `px-3 py-2`, the container loses its tinted band, and height
goes **80px → 64px**. Same information, one strip instead of seven cards.

Retains the label (xs, muted) + value (lg) + `PROJECTED` badge structure and the
horizontal scroll on mobile.

---

## 4. Video Player (req 4) — DONE

The explainer mounted **expanded by default** (`useState(false)` for
`dismissed`) and dominated the top of every phase screen.

- Default is now **collapsed**: `useState(true)`, and hydration only expands on
  an explicit stored `'false'`.
- `handleRestore` now **writes** `'false'` rather than removing the key —
  removing it would fall back to the collapsed default and the panel would shut
  again on the next visit.
- The collapsed row was rewritten as a single full-width accordion trigger:
  **"▶ Learn about the Acquisition Phase (2:45)"**, deriving the subject from
  the title after the colon.
- It had been hardcoded `#FFFFFF` / `#A5A5A5` / `#595959` — a white bar across
  the dark workspace. Now uses `--pw-border` / `--text-primary` / `--text-secondary`.

Tested both directions: collapsed by default with **no `<video>` mounted**, and
the expanded choice surviving a reload.

---

## 5. Workflow Stepper (req 5) — PARTIAL

The 7-stage rail already tracked `isComplete` per stage but always rendered the
stage's category glyph, so a finished step looked identical to a pending one.
Completed stages now render `check_circle` instead (active stage keeps its own
icon, since it is highlighted).

**Not done:** the stages remain individually boxed rather than a connected
horizontal stepper with a rail. The completion signal — the actual gap — is
fixed; the visual restructure is not.

---

## 6. Bottom Metrics (req 6) — ALREADY COMPLIANT

GRM / Cap Rate / NOI / DSCR already render as a 4-column grid with label above
value and subtle separators. No change made. Verified in
`workflow-desktop.png`.

---

## 7. Density (req 7) — PARTIAL

Achieved via the changes above: strip 80→64px, borders removed, decoration
dropped from the tracker, the video reduced from a mounted player to one row.
Labels are `text-xs`, values `text-lg`/`text-xl`.

No systematic typography pass was made across the rest of the page.

---

## 8. Known Issue — not introduced here

There is a **text collision** in the phase banner: "PHASE: ACQUISITION" and
"Equity: 100%" overlap (visible in `workflow-desktop.png` around the banner
row). It predates this work and sits outside the seven requirements, so it was
left alone rather than fixed opportunistically. Worth a follow-up.

---

## 9. Files Changed

**New (2)**
- `src/components/project/ProjectActionBar.tsx`
- `e2e/project-workflow-simplify.spec.ts` (7 tests)
- `.agents/handoff/project-workflow-walkthrough.md`

**Modified (4)**
- `src/app/dashboard/projects/[id]/layout.tsx` — action bar swap, KPI strip
  de-bordered, 10 dead imports removed (5 orphaned by this change, 5 already
  unused at HEAD)
- `src/components/project/PhaseProgressTracker.tsx` — phase palette, hairline
  connector, decoration removed
- `src/components/project/PhaseExplainerVideo.tsx` — collapsed default,
  accordion trigger, themed
- `src/app/dashboard/projects/[id]/phase-1/page.tsx` — completed-stage checkmarks

---

## 10. Screenshots

`screenshots/project-workflow/workflow-desktop.png` — captured after each change
by the passing spec.

---

## 11. Recommended Next

1. **Finish req 5** — convert the 7-stage rail from boxed buttons to a connected
   stepper with a rail line, matching the phase timeline treatment.
2. **Fix the banner text collision** (§8).
3. **Density pass** on the phase body content, which was not touched.
