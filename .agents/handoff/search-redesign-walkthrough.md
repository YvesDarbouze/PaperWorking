# Walkthrough — Predictive Search Redesign

**Date:** 2026-08-04
**Branch:** `Yves/feature-development`
**Sprint:** UX/UI Hardening, August 2026 — Prompt 3

Surfaces: (a) dashboard header search, (b) project-creation address search.

---

## 0. Verification Summary

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | ✅ **0 errors** |
| `npx jest` | ⚠️ 2741/2753 — same **2 pre-existing** DB suites, +27 new tests |
| `e2e/search-redesign.spec.ts` | ✅ **7/7** |
| Type "42" → dropdown → ArrowDown → Enter → navigate | ✅ asserted end-to-end |
| Mobile: full width, no horizontal scroll | ✅ asserted at 375px |
| Zero bright green in any search dropdown | ✅ asserted on computed styles **and** class names |

Jest failures remain `src/marketplace/listings.test.ts` and
`src/scripts/seedAgentCrew.test.ts` — database-seeding assertions, proven
pre-existing at clean HEAD in the Prompt 1 walkthrough.

---

## 1. Shared Component API

**`src/components/search/SearchDropdown.tsx`** — owns the input, dropdown,
keyboard nav, grouping, highlighting, recents, empty states, and the mobile
overlay. The consumer owns **data fetching only**.

```ts
interface SearchDropdownProps {
  query: string;
  onQueryChange: (q: string) => void;
  /** Fires 150ms after typing stops, once past `minChars`. Fires '' below it. */
  onDebouncedQueryChange: (q: string) => void;

  items: SearchItem[];
  loading?: boolean;
  errorMessage?: string | null;
  onSelect: (item: SearchItem) => void;

  placeholder?: string;          // default "Search deals by name or address..."
  autoFocus?: boolean;           // requirement 2
  minChars?: number;             // default 3
  maxItems?: number;             // default 7
  recentKey?: string;            // localStorage key; omit to disable recents
  trendingCities?: readonly string[];
  onTrendingSelect?: (city: string) => void;
  mobileFullScreen?: boolean;    // default true
  onRequestClose?: () => void;   // for conditionally-mounted overlays
  className?: string;
  testId?: string;               // prefix for all data-testid hooks
  inputRef?: React.MutableRefObject<HTMLInputElement | null>;  // Cmd+K
}

interface SearchItem {
  id: string;                    // dedupe key
  label: string;                 // match highlighting runs against this
  sublabel?: string;
  group: 'properties' | 'projects' | 'vendors' | 'recent';
  href?: string;
  raw?: unknown;                 // passed back untouched on select
}
```

**`src/lib/search/searchDropdown.ts`** — pure, React-free, unit-tested:
`highlightMatch`, `groupItems`, `flattenGroups`, `readRecentSearches`,
`pushRecentSearch`, `editDistance`, `suggestCorrection`, plus the
`SEARCH_DEBOUNCE_MS` / `SEARCH_MIN_CHARS` / `SEARCH_MAX_ITEMS` / `RECENT_MAX`
constants.

### `vendors` is a fourth group, beyond the spec
The spec named Properties / Projects / Recent Searches. The header has a
Deals/Vendors scope toggle that predates this work; vendor results are neither
a property nor a project, and folding them into either would mislabel them.

---

## 2. Requirements

| # | Requirement | How |
|---|---|---|
| 1 | Dark `#0f0f0f`, 1px `#222`, rounded-xl, shadow-2xl; hover `#1a1a1a`; gray pin + text + right-arrow on hover | Hard-coded flat palette, deliberately **not** themed |
| 2 | Long input, magnifier left, autofocus, exact placeholder | `autoFocus` prop; placeholder is the default |
| 3 | 150ms debounce, 3-char trigger, "Searching…" spinner, cap 7, no scrollbar | Timing owned by the component; cap applied **across** groups |
| 4 | Bold exact typed characters | `highlightMatch` → `<strong className="font-bold text-white">`, rest `text-gray-400` |
| 5 | Group headers uppercase text-xs tracking-wider text-gray-500 py-1 px-3 | Exactly those classes |
| 6 | Arrow keys (`bg-gray-800`), Enter, Escape, Tab | Wraps at both ends; Escape closes + blurs; Tab collapses and lets focus move |
| 7 | Empty state, trending cities, "Did you mean" | Verbatim copy; `suggestCorrection` returns null unless confident |
| 8 | <640px full width, full-screen overlay, × top-right, no blur | `matchMedia('(max-width: 639px)')`; opaque panel, no backdrop-filter |
| 9 | Same component in project creation | `AddressStep` now renders `<SearchDropdown testId="address-search" />` |

On requirement 7: a wrong "did you mean" is worse than none, so
`suggestCorrection` returns null for queries under 4 chars, for prefixes the
user is still typing, and when nothing is within ~1 edit per 4 characters.

---

## 3. Integration Notes

### Dashboard header (`TopAppBar.tsx`)
- Replaced **307 lines** of bespoke input + dropdown with the shared component.
- The Deals/Vendors scope toggle moved **above** the field, so the dropdown is a
  pure result surface.
- The fetch effect now keys off `debouncedSearch` (fed by the component); its
  own 300ms `setTimeout` debounce was removed, and it gained a `cancelled` guard
  against out-of-order responses.
- Removed as orphaned by the replacement: `searchFocused` state, and the
  `PHASE_BADGE_COLORS` map.

### Project creation (`AddressStep.tsx`)
- Removed the local `useDebounce` hook (280ms) — timing is now centralised.
- Added a `requestSeq` ref so a slow autocomplete response cannot overwrite a
  newer one.
- Provider results map to the `properties` group; `raw` carries the original
  `AddressSuggestion` so `handleSelect` still receives the full object.

---

## 4. Bugs Found and Fixed Along the Way

### The mobile search button did nothing
The header's magnifier button (`md:hidden`) had **no `onClick` at all**. Below
768px the desktop field is `hidden md:block`, so there was no way to reach
search on mobile — requirement 8 had no entry point. It now opens the
full-screen overlay.

### Cmd+K silently broke during the refactor
`searchRef` was no longer attached to anything once the input moved inside the
component. Fixed by adding the `inputRef` passthrough rather than a DOM query.

### The error state was being dropped
`isError` was set by the fetch but no longer rendered. Added the `errorMessage`
prop so "Failed to retrieve search results." still surfaces.

### Two elements shared one testId
At mobile width the desktop instance stays mounted (hidden by CSS) alongside the
overlay, so `global-search-input` matched two nodes. The overlay instance now
uses `testId="mobile-search"`.

### The global button rule struck again
All four `<button>`s in the dropdown were picking up
`padding: 12px 28px` + background + border from
`globals.css:1275`, which boxed every suggestion row and displaced the ×. Fixed
with `pw-interactive-custom` — the same escape hatch documented in the Prompt 1
walkthrough. **The e2e tests passed while this was broken**; only the screenshot
revealed it.

### …and a global *input* rule, which has no escape hatch
`globals.css:1527` styles `input[type="text"]` with `padding: 10px 14px`.
Tailwind v4 emits utilities inside `@layer utilities`, and **unlayered rules beat
layered ones regardless of specificity** — so `pl-10` computed to `14px` and the
magnifying glass overlapped the text. Unlike the button rule there is no
`:not()` hook, so padding is set inline. Measured: `paddingLeft` was `14px`,
icon occupied x 24→48, text began at x 26.

> This is the third distinct bug this sprint traced to unlayered global rules in
> `globals.css`. Any component whose spacing or typography "doesn't take" should
> suspect this first.

---

## 5. Test Coverage

### Unit — `src/__tests__/searchDropdown.test.ts` (27 tests, jsdom)
Constants match spec · highlighting (case-insensitive, multi-occurrence, never
loses characters, empty label) · grouping (cap across groups, GROUP_ORDER with
all four groups shuffled on input, empty groups omitted, dedupe, custom cap) ·
recents (order, cap, case-insensitive dedupe, blank rejection, corrupt JSON,
non-array) · `editDistance` · `suggestCorrection` (typo, exact, prefix, too
short, nothing close).

### E2E — `e2e/search-redesign.spec.ts` (7 tests)
1. Field standards — placeholder, `role="combobox"`, `aria-autocomplete`
2. No trigger at 2 chars; dropdown appears at 3
3. **Type → ArrowDown → ArrowUp wrap → Enter → navigate**, plus bolded match
4. Escape closes and blurs
5. ≤7 suggestions, `scrollHeight <= clientHeight`
6. Zero green — walks every descendant's computed
   `backgroundColor`/`color`/border colours **and** class names
7. Mobile — trigger visible, autofocus, input >85% viewport, overlay full width,
   no horizontal scroll, × dismisses

Project results are stubbed via `page.route('**/api/projects**')` so keyboard
navigation is deterministic instead of depending on shared mock state.

> Two of these were **skipping silently** on the first run — the keyboard test
> because mock state returned no rows, the mobile test because the header field
> is hidden below `md`. Both were acceptance criteria, so they were fixed rather
> than left green-by-skip.

Screenshots: `screenshots/search-redesign/dropdown-desktop.png`,
`dropdown-mobile.png`.

---

## 6. Files Changed

**New (3)**
- `src/lib/search/searchDropdown.ts`
- `src/components/search/SearchDropdown.tsx`
- `e2e/search-redesign.spec.ts`
- `src/__tests__/searchDropdown.test.ts`

**Modified (2)**
- `src/components/layout/TopAppBar.tsx` — header search replaced; mobile overlay added
- `src/components/acquisition/steps/AddressStep.tsx` — address search replaced

---

## 7. Recommended Next

1. **Other search surfaces still use bespoke UIs** — `AddressAutocomplete.tsx`
   (567 lines, used by `ProjectCreationWizard` and `TargetIdentification`),
   `PublicAddressSearch`, `PropertySearchInput`, `GlobalSearchBar`. This prompt
   scoped to the two named surfaces; those are the natural next migrations, and
   `AddressAutocomplete` would delete the most code.
2. **`PropertySearchStep.tsx` still has 10 green references** — outside this
   prompt's scope but the last search-adjacent file carrying the accent.
3. **Audit `globals.css` for unlayered rules.** Three bugs this sprint came from
   them. Moving those blocks into `@layer base` would make Tailwind utilities
   win normally and remove a whole class of silent failure.
