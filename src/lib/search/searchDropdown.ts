/**
 * Pure helpers for the shared <SearchDropdown /> component.
 *
 * Kept free of React so the matching, grouping, recents, and typo logic can be
 * unit-tested directly rather than through the DOM.
 */

/**
 * `vendors` extends the three groups named in the redesign spec. The dashboard
 * header has a Deals/Vendors scope toggle that predates this work, and vendor
 * results are neither a property nor a project; folding them into either would
 * mislabel them.
 */
export type SearchGroup = 'properties' | 'projects' | 'vendors' | 'recent';

export interface SearchItem {
  /** Stable identity — also the dedupe key. */
  id: string;
  /** Primary line. The matched substring is bolded against this. */
  label: string;
  /** Optional secondary line (project name, city, etc). */
  sublabel?: string;
  group: SearchGroup;
  /** Where selecting this item navigates, when the consumer wants a link. */
  href?: string;
  /** Consumer payload passed back untouched on select. */
  raw?: unknown;
}

/** Trigger threshold and timing — requirement 3. */
export const SEARCH_MIN_CHARS = 3;
export const SEARCH_DEBOUNCE_MS = 150;
/** Hard cap so the list never needs a scrollbar — requirement 3. */
export const SEARCH_MAX_ITEMS = 7;
/** Recent searches cap — requirement 5. */
export const RECENT_MAX = 3;
export const RECENT_STORAGE_KEY = 'pw_recent_searches';

/** Group headers, in render order. */
export const GROUP_LABELS: Record<SearchGroup, string> = {
  recent: 'Recent Searches',
  properties: 'Properties',
  projects: 'Projects',
  vendors: 'Vendors',
};

export const GROUP_ORDER: readonly SearchGroup[] =
  ['recent', 'properties', 'projects', 'vendors'] as const;

/** Cities offered when a query returns nothing — requirement 7. */
export const TRENDING_CITIES = ['Los Angeles, CA', 'Phoenix, AZ', 'Austin, TX'] as const;

/* ── Match highlighting ─────────────────────────────────────────────────── */

export interface MatchSegment {
  text: string;
  matched: boolean;
}

/**
 * Split `label` into segments so the consumer can bold what the user typed.
 * Case-insensitive, matches every occurrence, and never drops characters —
 * concatenating the segments always reproduces the original label exactly.
 */
export function highlightMatch(label: string, query: string): MatchSegment[] {
  const q = query.trim();
  if (!label) return [];
  if (!q) return [{ text: label, matched: false }];

  const haystack = label.toLowerCase();
  const needle = q.toLowerCase();
  const segments: MatchSegment[] = [];

  let cursor = 0;
  for (;;) {
    const hit = haystack.indexOf(needle, cursor);
    if (hit === -1) break;
    if (hit > cursor) segments.push({ text: label.slice(cursor, hit), matched: false });
    segments.push({ text: label.slice(hit, hit + needle.length), matched: true });
    cursor = hit + needle.length;
  }
  if (cursor < label.length) segments.push({ text: label.slice(cursor), matched: false });

  return segments.length ? segments : [{ text: label, matched: false }];
}

/* ── Grouping ───────────────────────────────────────────────────────────── */

export interface RenderGroup {
  group: SearchGroup;
  label: string;
  items: SearchItem[];
}

/**
 * Dedupe by id, cap the total at `maxItems`, and bucket into render groups in
 * GROUP_ORDER. The cap is applied across the whole list, not per group, so the
 * dropdown never exceeds its height budget.
 */
export function groupItems(
  items: SearchItem[],
  maxItems: number = SEARCH_MAX_ITEMS,
): RenderGroup[] {
  const seen = new Set<string>();
  const capped: SearchItem[] = [];

  for (const group of GROUP_ORDER) {
    for (const item of items) {
      if (item.group !== group) continue;
      if (seen.has(item.id)) continue;
      if (capped.length >= maxItems) break;
      seen.add(item.id);
      capped.push(item);
    }
    if (capped.length >= maxItems) break;
  }

  return GROUP_ORDER
    .map((group) => ({
      group,
      label: GROUP_LABELS[group],
      items: capped.filter((i) => i.group === group),
    }))
    .filter((g) => g.items.length > 0);
}

/** Flatten render groups back to a single list — the keyboard nav index space. */
export function flattenGroups(groups: RenderGroup[]): SearchItem[] {
  return groups.flatMap((g) => g.items);
}

/* ── Recent searches (localStorage) ─────────────────────────────────────── */

export function readRecentSearches(
  storageKey: string = RECENT_STORAGE_KEY,
  max: number = RECENT_MAX,
): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === 'string' && v.length > 0).slice(0, max);
  } catch {
    return [];
  }
}

/** Push to the front, dedupe case-insensitively, and cap. Returns the new list. */
export function pushRecentSearch(
  term: string,
  storageKey: string = RECENT_STORAGE_KEY,
  max: number = RECENT_MAX,
): string[] {
  const clean = term.trim();
  if (!clean) return readRecentSearches(storageKey, max);

  const existing = readRecentSearches(storageKey, max * 4);
  const next = [clean, ...existing.filter((t) => t.toLowerCase() !== clean.toLowerCase())]
    .slice(0, max);

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch { /* quota or disabled storage — recents are non-essential */ }
  }
  return next;
}

/* ── "Did you mean" ─────────────────────────────────────────────────────── */

/** Levenshtein distance, iterative with a single row buffer. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    prev = curr;
  }
  return prev[b.length];
}

/**
 * Suggest a correction when the query is a near-miss for a known city.
 * Returns null when the query already matches, is too short to judge, or no
 * candidate is close enough — a wrong suggestion is worse than none.
 */
export function suggestCorrection(
  query: string,
  candidates: readonly string[] = TRENDING_CITIES,
): string | null {
  const q = query.trim().toLowerCase();
  if (q.length < 4) return null;

  let best: { value: string; distance: number } | null = null;

  for (const candidate of candidates) {
    // Compare against the city name alone, not the ", ST" suffix.
    const cityName = candidate.split(',')[0].trim();
    const lower = cityName.toLowerCase();
    if (lower === q || lower.startsWith(q)) return null; // already on target

    const distance = editDistance(q, lower);
    if (!best || distance < best.distance) best = { value: candidate, distance };
  }

  if (!best) return null;
  // Allow roughly one typo per four characters, capped at 3.
  const tolerance = Math.min(3, Math.max(1, Math.floor(q.length / 4)));
  return best.distance <= tolerance ? best.value : null;
}
