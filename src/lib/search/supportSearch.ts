import { STATIC_SUPPORT_INDEX, type SearchDocument } from './supportIndexBuilder';

export interface SearchResult {
  doc: SearchDocument;
  score: number;
  snippet: string;
}

/**
 * Normalizes text for matching by lowercasing and stripping punctuation.
 */
function normalizeText(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Splits query string into individual word tokens (filters out short stop words like 'a', 'in', 'the' unless query is short).
 */
function tokenizeQuery(rawQuery: string): string[] {
  const norm = normalizeText(rawQuery);
  const words = norm.split(' ').filter(Boolean);
  if (words.length <= 2) return words;
  const stopWords = new Set(['a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'my', 'how', 'do', 'i', 'what']);
  const filtered = words.filter((w) => !stopWords.has(w));
  return filtered.length > 0 ? filtered : words;
}

/**
 * Generates a context snippet highlighting the matched term in context.
 */
function extractContextSnippet(doc: SearchDocument, rawQuery: string): string {
  const normQuery = normalizeText(rawQuery);
  const tokens = tokenizeQuery(rawQuery);
  const text = `${doc.title}. ${doc.excerpt} ${doc.content}`;

  let matchIndex = -1;
  if (normQuery.length >= 3) {
    matchIndex = text.toLowerCase().indexOf(normQuery);
  }

  if (matchIndex === -1 && tokens.length > 0) {
    for (const token of tokens) {
      const idx = text.toLowerCase().indexOf(token);
      if (idx !== -1) {
        matchIndex = idx;
        break;
      }
    }
  }

  if (matchIndex === -1) {
    return doc.excerpt.length > 110 ? `${doc.excerpt.slice(0, 110)}…` : doc.excerpt;
  }

  const start = Math.max(0, matchIndex - 30);
  const end = Math.min(text.length, matchIndex + 80);
  let snippet = text.slice(start, end).trim();

  if (start > 0) snippet = `…${snippet}`;
  if (end < text.length) snippet = `${snippet}…`;

  return snippet;
}

/**
 * Performs client-side search over STATIC_SUPPORT_INDEX.
 */
export function searchSupportIndex(query: string, limit = 8): SearchResult[] {
  const q = query.trim();
  if (!q) return [];

  const normQuery = normalizeText(q);
  const tokens = tokenizeQuery(q);
  if (tokens.length === 0) return [];

  const results: SearchResult[] = [];

  for (const doc of STATIC_SUPPORT_INDEX) {
    const titleNorm = normalizeText(doc.title);
    const excerptNorm = normalizeText(doc.excerpt);
    const contentNorm = normalizeText(doc.content);
    const tagsNorm = doc.tags.map((t) => normalizeText(t)).join(' ');

    let score = 0;

    // Exact phrase match bonus
    if (normQuery.length >= 3) {
      if (titleNorm.includes(normQuery)) score += 100;
      if (tagsNorm.includes(normQuery)) score += 60;
      if (excerptNorm.includes(normQuery)) score += 40;
      if (contentNorm.includes(normQuery)) score += 20;
    }

    // Individual token matching
    let tokenHits = 0;
    for (const token of tokens) {
      if (!token) continue;
      let matchedInDoc = false;

      if (titleNorm.includes(token)) {
        score += 35;
        matchedInDoc = true;
      }
      if (tagsNorm.includes(token)) {
        score += 25;
        matchedInDoc = true;
      }
      if (excerptNorm.includes(token)) {
        score += 15;
        matchedInDoc = true;
      }
      if (contentNorm.includes(token)) {
        score += 10;
        matchedInDoc = true;
      }

      if (matchedInDoc) tokenHits++;
    }

    // Require that at least half of query tokens match unless query is 1 word
    if (tokens.length > 1 && tokenHits < Math.ceil(tokens.length / 2)) {
      continue;
    }

    if (score > 0) {
      const snippet = extractContextSnippet(doc, q);
      results.push({ doc, score, snippet });
    }
  }

  // Sort by score descending, then title ascending
  results.sort((a, b) => b.score - a.score || a.doc.title.localeCompare(b.doc.title));

  return results.slice(0, limit);
}
