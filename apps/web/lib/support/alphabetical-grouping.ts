import type { GlossaryTerm, GlossaryGroup } from './types';

export function groupGlossaryByLetter(terms?: GlossaryTerm[]): GlossaryGroup[] {
  // If terms omitted, read dynamically from memory store
  let list = terms;
  if (!list) {
    // Dynamic import avoidance: read from global store mirror if available
    const globalStore = globalThis as unknown as {
      __PW_GLOSSARY_STORE?: Map<string, GlossaryTerm>;
    };
    if (globalStore.__PW_GLOSSARY_STORE) {
      list = Array.from(globalStore.__PW_GLOSSARY_STORE.values());
    } else {
      list = [];
    }
  }

  const grouped: Record<string, GlossaryTerm[]> = {};
  const sortedTerms = [...list].sort((a, b) => a.term.localeCompare(b.term));

  for (const item of sortedTerms) {
    const letter = item.term[0]?.toUpperCase() || '#';
    if (!grouped[letter]) {
      grouped[letter] = [];
    }
    grouped[letter].push(item);
  }

  return Object.keys(grouped)
    .sort()
    .map((letter) => ({
      letter,
      terms: grouped[letter] || [],
    }));
}
