'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  SEARCH_DEBOUNCE_MS,
  SEARCH_MAX_ITEMS,
  SEARCH_MIN_CHARS,
  TRENDING_CITIES,
  flattenGroups,
  groupItems,
  highlightMatch,
  pushRecentSearch,
  readRecentSearches,
  suggestCorrection,
  type SearchItem,
} from '@/lib/search/searchDropdown';

/* ═══════════════════════════════════════════════════════════════════════════
   SearchDropdown — shared predictive search input + dropdown.

   Google-Maps-native styling: a flat dark surface, gray pin icons, a subtle
   hover, and no accent colour anywhere. The emerald accent is deliberately
   absent — see `.agents/handoff/search-redesign-walkthrough.md`.

   The component owns the input, the dropdown, keyboard navigation, grouping,
   match highlighting, recent searches, empty states, and the mobile overlay.
   The consumer owns data fetching: it receives `onDebouncedQueryChange` and
   supplies `items` + `loading`.
   ═══════════════════════════════════════════════════════════════════════════ */

/** Flat palette — intentionally hard-coded, not themed. Requirement 1. */
const SURFACE = '#0f0f0f';
const BORDER  = '#222222';
const HOVER   = '#1a1a1a';
const ACTIVE  = '#1f2937'; // gray-800, the keyboard-highlighted row

export interface SearchDropdownProps {
  /** Controlled input value. */
  query: string;
  onQueryChange: (query: string) => void;
  /**
   * Fires `SEARCH_DEBOUNCE_MS` after typing stops, but only once the query is
   * at least `minChars` long. Fires with '' when the query drops below it, so
   * the consumer can clear results.
   */
  onDebouncedQueryChange: (query: string) => void;

  items: SearchItem[];
  loading?: boolean;
  /** Surfaced in place of results when the lookup fails. */
  errorMessage?: string | null;
  onSelect: (item: SearchItem) => void;

  placeholder?: string;
  /** Focus the input on mount — requirement 2. */
  autoFocus?: boolean;
  minChars?: number;
  maxItems?: number;
  /** localStorage key for recents; omit to disable the Recent Searches group. */
  recentKey?: string;
  /** Show the trending-city row in the empty state. */
  trendingCities?: readonly string[];
  onTrendingSelect?: (city: string) => void;
  /** Render as a full-screen overlay below 640px — requirement 8. */
  mobileFullScreen?: boolean;
  /**
   * Fired when the user dismisses the dropdown (Escape, or the overlay's close
   * button). Lets a parent that mounts this conditionally — such as the mobile
   * search overlay in the app header — unmount it.
   */
  onRequestClose?: () => void;
  /** Extra classes on the outer wrapper. */
  className?: string;
  /** Test hook prefix, so two instances on one page stay addressable. */
  testId?: string;
  /**
   * Optional passthrough to the underlying input, so a parent can focus it
   * (the dashboard header binds Cmd+K to this) without reaching into the DOM.
   */
  inputRef?: React.MutableRefObject<HTMLInputElement | null>;
}

export function SearchDropdown({
  query,
  onQueryChange,
  onDebouncedQueryChange,
  items,
  loading = false,
  errorMessage = null,
  onSelect,
  placeholder = 'Search deals by name or address...',
  autoFocus = false,
  minChars = SEARCH_MIN_CHARS,
  maxItems = SEARCH_MAX_ITEMS,
  recentKey,
  trendingCities = TRENDING_CITIES,
  onTrendingSelect,
  mobileFullScreen = true,
  onRequestClose,
  className = '',
  testId = 'search',
  inputRef: externalInputRef,
}: SearchDropdownProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recents, setRecents] = useState<string[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Held in a ref so the debounce effect does not re-run when the consumer
  // passes a new function identity on every render. Assigned in an effect
  // rather than during render — writing a ref while rendering is not safe
  // under concurrent rendering (react-hooks/refs).
  const emitRef = useRef(onDebouncedQueryChange);
  useEffect(() => {
    emitRef.current = onDebouncedQueryChange;
  }, [onDebouncedQueryChange]);

  /* ── Viewport ── */
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  /* ── Recents ── */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (recentKey) setRecents(readRecentSearches(recentKey));
  }, [recentKey]);

  /* ── Debounce: 150ms, min 3 chars ── */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();

    if (trimmed.length < minChars) {
      emitRef.current('');
      return;
    }
    debounceRef.current = setTimeout(() => emitRef.current(trimmed), SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, minChars]);

  /* ── Autofocus ── */
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  /* ── Outside click ── */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  /* ── Derived ── */
  const trimmed = query.trim();
  const triggered = trimmed.length >= minChars;

  const withRecents = useMemo<SearchItem[]>(() => {
    // Recents only make sense before the user has typed enough to search.
    if (triggered || !recentKey) return items;
    return [
      ...recents.map((term) => ({
        id: `recent:${term}`,
        label: term,
        group: 'recent' as const,
      })),
      ...items,
    ];
  }, [items, recents, recentKey, triggered]);

  const groups = useMemo(() => groupItems(withRecents, maxItems), [withRecents, maxItems]);
  const flat = useMemo(() => flattenGroups(groups), [groups]);

  const showEmpty = open && triggered && !loading && flat.length === 0;
  const correction = useMemo(
    () => (showEmpty ? suggestCorrection(trimmed) : null),
    [showEmpty, trimmed],
  );

  // Keep the highlighted row in range as results change.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveIndex((prev) => (prev >= flat.length ? flat.length - 1 : prev));
  }, [flat.length]);

  /* ── Selection ── */
  const commit = useCallback(
    (item: SearchItem) => {
      if (recentKey) setRecents(pushRecentSearch(item.label, recentKey));
      setOpen(false);
      setActiveIndex(-1);
      onSelect(item);
    },
    [onSelect, recentKey],
  );

  const close = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.blur();
    onRequestClose?.();
  }, [onRequestClose]);

  /* ── Keyboard — requirement 6 ── */
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    // Tab is deliberately not intercepted: focus moves out naturally. We only
    // collapse the dropdown so it does not hang over the next control.
    if (e.key === 'Tab') {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (!flat.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((prev) => (prev < flat.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : flat.length - 1));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < flat.length) {
        e.preventDefault();
        commit(flat[activeIndex]);
      }
    }
  };

  const overlay = mobileFullScreen && isMobile && open;

  /* ── Row ── */
  const renderRow = (item: SearchItem, index: number) => {
    const isActive = index === activeIndex;
    const segments = highlightMatch(item.label, triggered ? trimmed : '');
    return (
      <button
        key={item.id}
        type="button"
        role="option"
        aria-selected={isActive}
        id={`${testId}-option-${index}`}
        data-testid={`${testId}-option`}
        data-active={isActive ? 'true' : 'false'}
        onMouseEnter={() => setActiveIndex(index)}
        onClick={() => commit(item)}
        className="pw-interactive-custom group w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors duration-100 cursor-pointer"
        style={{ background: isActive ? ACTIVE : 'transparent' }}
        onMouseOver={(e) => {
          if (!isActive) e.currentTarget.style.background = HOVER;
        }}
        onMouseOut={(e) => {
          if (!isActive) e.currentTarget.style.background = 'transparent';
        }}
      >
        <span
          className="material-symbols-outlined text-[18px] shrink-0"
          style={{ color: '#9ca3af', fontVariationSettings: "'FILL' 0" }}
          aria-hidden="true"
        >
          location_on
        </span>

        <span className="flex-1 min-w-0">
          <span className="block truncate text-sm text-gray-400">
            {segments.map((seg, i) =>
              seg.matched ? (
                <strong key={i} className="font-bold text-white">{seg.text}</strong>
              ) : (
                <React.Fragment key={i}>{seg.text}</React.Fragment>
              ),
            )}
          </span>
          {item.sublabel && (
            <span className="block truncate text-xs text-gray-500 mt-0.5">{item.sublabel}</span>
          )}
        </span>

        <span
          className="material-symbols-outlined text-[16px] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: '#6b7280' }}
          aria-hidden="true"
        >
          arrow_forward
        </span>
      </button>
    );
  };

  /* ── Panel ── */
  let runningIndex = -1;
  const panel = (
    <div
      role="listbox"
      aria-label="Search suggestions"
      data-testid={`${testId}-dropdown`}
      className={
        overlay
          ? // Starts below the fixed input bar so the bar never covers the
            // close button or the first result row.
            'fixed inset-x-0 bottom-0 top-[68px] z-[300] flex flex-col'
          : 'absolute left-0 right-0 top-full mt-2 z-[300] rounded-xl overflow-hidden shadow-2xl'
      }
      style={{
        background: SURFACE,
        border: overlay ? 'none' : `1px solid ${BORDER}`,
      }}
    >
      <div className={overlay ? 'flex-1 overflow-y-auto' : ''}>
        {errorMessage ? (
          <div className="px-3 py-3" data-testid={`${testId}-error`}>
            <p className="text-sm" style={{ color: '#f87171' }}>{errorMessage}</p>
          </div>
        ) : loading ? (
          <div
            className="flex items-center gap-2 px-3 py-3"
            data-testid={`${testId}-loading`}
          >
            <span
              className="w-3.5 h-3.5 rounded-full border-2 animate-spin shrink-0"
              style={{ borderColor: '#374151', borderTopColor: '#9ca3af' }}
            />
            <span className="text-sm text-gray-500">Searching…</span>
          </div>
        ) : flat.length > 0 ? (
          groups.map((g) => (
            <div key={g.group}>
              <div
                className="text-xs uppercase tracking-wider text-gray-500 py-1 px-3"
                data-testid={`${testId}-group-header`}
              >
                {g.label}
              </div>
              {g.items.map((item) => {
                runningIndex += 1;
                return renderRow(item, runningIndex);
              })}
            </div>
          ))
        ) : showEmpty ? (
          <div className="px-3 py-4" data-testid={`${testId}-empty`}>
            <p className="text-sm text-gray-400">
              No matches found. Try a different address or city.
            </p>

            {correction && (
              <p className="text-sm text-gray-400 mt-2">
                Did you mean:{' '}
                <button
                  type="button"
                  onClick={() => onQueryChange(correction)}
                  data-testid={`${testId}-did-you-mean`}
                  className="pw-interactive-custom text-white font-semibold underline underline-offset-2 cursor-pointer"
                >
                  {correction}
                </button>
                ?
              </p>
            )}

            {trendingCities.length > 0 && (
              <p className="text-sm text-gray-500 mt-3">
                Trending:{' '}
                {trendingCities.map((city, i) => (
                  <React.Fragment key={city}>
                    {i > 0 && <span className="text-gray-600"> • </span>}
                    <button
                      type="button"
                      data-testid={`${testId}-trending`}
                      onClick={() => {
                        onQueryChange(city);
                        onTrendingSelect?.(city);
                        inputRef.current?.focus();
                      }}
                      className="pw-interactive-custom text-gray-300 hover:text-white transition-colors cursor-pointer"
                    >
                      {city}
                    </button>
                  </React.Fragment>
                ))}
              </p>
            )}
          </div>
        ) : (
          <div className="px-3 py-3">
            <p className="text-sm text-gray-500">
              Keep typing — suggestions appear after {minChars} characters.
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const showPanel =
    open && (!!errorMessage || loading || flat.length > 0 || showEmpty || !triggered);

  return (
    <div ref={wrapperRef} className={`relative ${className}`} data-testid={`${testId}-root`}>
      <div
        className={overlay ? 'fixed inset-x-0 top-0 z-[301] p-3' : 'relative'}
        style={overlay ? { background: SURFACE } : undefined}
      >
        <div className="relative w-full">
          <span
            className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] pointer-events-none z-[1]"
            style={{ color: '#9ca3af' }}
            aria-hidden="true"
          >
            search
          </span>
        <input
          ref={(node) => {
            inputRef.current = node;
            if (externalInputRef) externalInputRef.current = node;
          }}
          type="text"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={`${testId}-dropdown`}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `${testId}-option-${activeIndex}` : undefined}
          data-testid={`${testId}-input`}
          className="w-full h-11 text-sm rounded-xl outline-none transition-colors placeholder:text-gray-500"
          style={{
            background: '#111111',
            border: `1px solid ${BORDER}`,
            color: '#ffffff',
            // Padding is inline, not `pl-10`/`pr-12`: globals.css:1527 styles
            // `input[type="text"]` with `padding: 10px 14px` from OUTSIDE any
            // cascade layer, and unlayered rules beat Tailwind's @layer
            // utilities regardless of specificity. Unlike the global button
            // rule there is no `:not()` escape hatch, so this must be inline
            // or the magnifying-glass icon overlaps the text.
            paddingLeft: 40,
            paddingRight: overlay ? 48 : 12,
          }}
          placeholder={placeholder}
          value={query}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => {
            onQueryChange(e.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        </div>

        {/* Close (×) — top-right of the mobile overlay. Sits over the input's
            right padding so the field still spans 100vw minus page padding,
            rather than giving up width to the button. Requirement 8. */}
        {overlay && (
          <button
            type="button"
            onClick={close}
            aria-label="Close search"
            data-testid={`${testId}-close`}
            className="pw-interactive-custom absolute right-4 top-1/2 -translate-y-1/2 z-[2] w-9 h-9 flex items-center justify-center rounded-lg cursor-pointer"
            style={{ color: '#9ca3af' }}
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        )}
      </div>

      {showPanel && panel}
    </div>
  );
}

export default SearchDropdown;
