/** @jest-environment jsdom */
// jsdom rather than the repo default `node`: the recent-searches helpers read
// and write `window.localStorage`.
import {
  GROUP_ORDER,
  RECENT_MAX,
  SEARCH_DEBOUNCE_MS,
  SEARCH_MAX_ITEMS,
  SEARCH_MIN_CHARS,
  editDistance,
  flattenGroups,
  groupItems,
  highlightMatch,
  pushRecentSearch,
  readRecentSearches,
  suggestCorrection,
  type SearchItem,
} from '@/lib/search/searchDropdown';

const item = (id: string, label: string, group: SearchItem['group']): SearchItem =>
  ({ id, label, group });

describe('SearchDropdown helpers', () => {
  describe('constants match the spec', () => {
    it('debounces at 150ms and triggers after 3 characters', () => {
      expect(SEARCH_DEBOUNCE_MS).toBe(150);
      expect(SEARCH_MIN_CHARS).toBe(3);
    });

    it('caps suggestions at 7 and recents at 3', () => {
      expect(SEARCH_MAX_ITEMS).toBe(7);
      expect(RECENT_MAX).toBe(3);
    });
  });

  describe('highlightMatch', () => {
    it('bolds the exact characters typed', () => {
      const segs = highlightMatch('4208 Melrose Ave', '42');
      expect(segs[0]).toEqual({ text: '42', matched: true });
      expect(segs[1]).toEqual({ text: '08 Melrose Ave', matched: false });
    });

    it('is case-insensitive but preserves original casing', () => {
      const segs = highlightMatch('Melrose Avenue', 'mel');
      expect(segs[0]).toEqual({ text: 'Mel', matched: true });
      expect(segs.map((s) => s.text).join('')).toBe('Melrose Avenue');
    });

    it('highlights every occurrence', () => {
      const segs = highlightMatch('42 on 42nd', '42');
      expect(segs.filter((s) => s.matched)).toHaveLength(2);
    });

    it('never loses characters', () => {
      const label = '1234 N. Main St, Apt #5';
      for (const q of ['1', '12', 'main', '#5', 'zzz', '']) {
        expect(highlightMatch(label, q).map((s) => s.text).join('')).toBe(label);
      }
    });

    it('returns a single unmatched segment when there is no hit', () => {
      const segs = highlightMatch('Melrose', 'xyz');
      expect(segs).toEqual([{ text: 'Melrose', matched: false }]);
    });

    it('handles an empty label', () => {
      expect(highlightMatch('', 'abc')).toEqual([]);
    });
  });

  describe('groupItems', () => {
    it('caps the total across all groups so no scrollbar is needed', () => {
      const many = Array.from({ length: 20 }, (_, i) =>
        item(`p${i}`, `Prop ${i}`, 'properties'),
      );
      expect(flattenGroups(groupItems(many))).toHaveLength(SEARCH_MAX_ITEMS);
    });

    it('renders groups in GROUP_ORDER regardless of input order', () => {
      // One item per group, deliberately shuffled on the way in.
      const groups = groupItems([
        item('d', 'D', 'vendors'),
        item('a', 'A', 'projects'),
        item('c', 'C', 'recent'),
        item('b', 'B', 'properties'),
      ]);
      expect(groups.map((g) => g.group)).toEqual([...GROUP_ORDER]);
      expect(groups.map((g) => g.label)).toEqual([
        'Recent Searches',
        'Properties',
        'Projects',
        'Vendors',
      ]);
    });

    it('omits empty groups entirely', () => {
      const groups = groupItems([item('b', 'B', 'properties')]);
      expect(groups).toHaveLength(1);
      expect(groups[0].label).toBe('Properties');
    });

    it('dedupes by id', () => {
      const groups = groupItems([
        item('same', 'One', 'properties'),
        item('same', 'Two', 'properties'),
      ]);
      expect(flattenGroups(groups)).toHaveLength(1);
    });

    it('respects a custom cap', () => {
      const many = Array.from({ length: 10 }, (_, i) => item(`p${i}`, `P${i}`, 'properties'));
      expect(flattenGroups(groupItems(many, 3))).toHaveLength(3);
    });
  });

  describe('recent searches', () => {
    const KEY = 'pw_test_recents';
    beforeEach(() => window.localStorage.clear());

    it('returns an empty list when nothing is stored', () => {
      expect(readRecentSearches(KEY)).toEqual([]);
    });

    it('pushes most-recent-first and caps at 3', () => {
      pushRecentSearch('one', KEY);
      pushRecentSearch('two', KEY);
      pushRecentSearch('three', KEY);
      pushRecentSearch('four', KEY);
      expect(readRecentSearches(KEY)).toEqual(['four', 'three', 'two']);
    });

    it('dedupes case-insensitively and promotes the repeat', () => {
      pushRecentSearch('Austin', KEY);
      pushRecentSearch('Phoenix', KEY);
      pushRecentSearch('austin', KEY);
      expect(readRecentSearches(KEY)).toEqual(['austin', 'Phoenix']);
    });

    it('ignores blank terms', () => {
      pushRecentSearch('real', KEY);
      pushRecentSearch('   ', KEY);
      expect(readRecentSearches(KEY)).toEqual(['real']);
    });

    it('survives corrupt stored JSON', () => {
      window.localStorage.setItem(KEY, '{not json');
      expect(readRecentSearches(KEY)).toEqual([]);
    });

    it('ignores a stored non-array', () => {
      window.localStorage.setItem(KEY, '{"a":1}');
      expect(readRecentSearches(KEY)).toEqual([]);
    });
  });

  describe('editDistance', () => {
    it('is zero for identical strings', () => {
      expect(editDistance('austin', 'austin')).toBe(0);
    });

    it('counts single edits', () => {
      expect(editDistance('austin', 'austn')).toBe(1);
      expect(editDistance('phoenix', 'phonix')).toBe(1);
    });

    it('handles empty input', () => {
      expect(editDistance('', 'abc')).toBe(3);
      expect(editDistance('abc', '')).toBe(3);
    });
  });

  describe('suggestCorrection', () => {
    it('suggests a city for a near-miss typo', () => {
      expect(suggestCorrection('austn')).toBe('Austin, TX');
      expect(suggestCorrection('phoenex')).toBe('Phoenix, AZ');
    });

    it('returns null when the query is already correct', () => {
      expect(suggestCorrection('austin')).toBeNull();
    });

    it('returns null for a prefix the user is still typing', () => {
      expect(suggestCorrection('phoen')).toBeNull();
    });

    it('returns null for short queries it cannot judge', () => {
      expect(suggestCorrection('au')).toBeNull();
    });

    it('returns null when nothing is close enough', () => {
      expect(suggestCorrection('zzzzzzzzzz')).toBeNull();
    });
  });
});
