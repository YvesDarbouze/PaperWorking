import { getAdminFirestore, shouldAttemptFirestore } from '@/lib/firebase/admin';
import type { FaqEntry, GlossaryTerm, GlossaryGroup } from '@/lib/support/types';
import { groupGlossaryByLetter } from '@/lib/support/alphabetical-grouping';
import { CANONICAL_FAQ_SEED, CANONICAL_GLOSSARY_SEED } from '@/lib/support/seed-data';
import { validateAndSanitizeFaqInput, validateAndSanitizeGlossaryInput } from '@/lib/support/content-filter';

export const FAQ_COLLECTION = 'support_faq';
export const GLOSSARY_COLLECTION = 'support_glossary';

// Memory mirror / cache to guarantee instant test resolution & resilient offline fallback
const globalStore = globalThis as unknown as {
  __PW_FAQ_STORE?: Map<string, FaqEntry>;
  __PW_GLOSSARY_STORE?: Map<string, GlossaryTerm>;
};

if (!globalStore.__PW_FAQ_STORE) {
  globalStore.__PW_FAQ_STORE = new Map<string, FaqEntry>();
  for (const f of CANONICAL_FAQ_SEED) {
    globalStore.__PW_FAQ_STORE.set(f.id, { ...f });
  }
}
if (!globalStore.__PW_GLOSSARY_STORE) {
  globalStore.__PW_GLOSSARY_STORE = new Map<string, GlossaryTerm>();
  for (const g of CANONICAL_GLOSSARY_SEED) {
    globalStore.__PW_GLOSSARY_STORE.set(g.id || slugifyTerm(g.term), { ...g });
  }
}

export const faqMemoryMap = globalStore.__PW_FAQ_STORE;
export const glossaryMemoryMap = globalStore.__PW_GLOSSARY_STORE;

export function slugifyTerm(term: string): string {
  return term
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Reads all FAQ entries from Firestore (or memory mirror).
 */
export async function getFaqEntries(): Promise<FaqEntry[]> {
  if (shouldAttemptFirestore()) {
    try {
      const db = getAdminFirestore();
      const snapshot = await db.collection(FAQ_COLLECTION).get();
      if (!snapshot.empty) {
        const list: FaqEntry[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as FaqEntry;
          list.push({ ...data, id: doc.id });
        });
        // Update live cache
        for (const item of list) {
          faqMemoryMap.set(item.id, item);
        }
        return list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      }
    } catch (err) {
      console.warn('[firestore-support-store] Firestore FAQ read failed, falling back to memory store:', err);
    }
  }

  return Array.from(faqMemoryMap.values()).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/**
 * Synchronous getter reading current live memory store.
 */
export function getFaqEntriesSync(): FaqEntry[] {
  return Array.from(faqMemoryMap.values()).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/**
 * Filter FAQ entries by search query byte-compatibly.
 */
export async function searchFaqEntries(query: string): Promise<FaqEntry[]> {
  const all = await getFaqEntries();
  const q = query.trim().toLowerCase();
  if (!q) return all;

  return all.filter(
    (faq) =>
      faq.question.toLowerCase().includes(q) ||
      faq.answer.toLowerCase().includes(q) ||
      faq.category.toLowerCase().includes(q),
  );
}

/**
 * Synchronous search reading current live memory store.
 */
export function searchFaqEntriesSync(query: string): FaqEntry[] {
  const all = getFaqEntriesSync();
  const q = query.trim().toLowerCase();
  if (!q) return all;

  return all.filter(
    (faq) =>
      faq.question.toLowerCase().includes(q) ||
      faq.answer.toLowerCase().includes(q) ||
      faq.category.toLowerCase().includes(q),
  );
}

/**
 * Gets a single FAQ entry by ID.
 */
export async function getFaqEntryById(id: string): Promise<FaqEntry | null> {
  if (shouldAttemptFirestore()) {
    try {
      const db = getAdminFirestore();
      const doc = await db.collection(FAQ_COLLECTION).doc(id).get();
      if (doc.exists) {
        const data = { ...(doc.data() as FaqEntry), id: doc.id };
        faqMemoryMap.set(id, data);
        return data;
      }
    } catch {
      // Fall through to memory store
    }
  }

  return faqMemoryMap.get(id) || null;
}

/**
 * Upserts a FAQ entry into Firestore & live cache.
 * Strictly validates against Zod schema and rejects injection, emails, and URLs.
 */
export async function upsertFaqEntry(faq: FaqEntry): Promise<FaqEntry> {
  const sanitized = validateAndSanitizeFaqInput(faq);
  const entry: FaqEntry = {
    ...sanitized,
    updatedAt: new Date().toISOString(),
  };
  faqMemoryMap.set(entry.id, entry);

  if (shouldAttemptFirestore()) {
    try {
      const db = getAdminFirestore();
      await db.collection(FAQ_COLLECTION).doc(entry.id).set(entry, { merge: true });
    } catch (err) {
      console.warn(`[firestore-support-store] Firestore write failed for FAQ ${entry.id}:`, err);
    }
  }

  return entry;
}

/**
 * Reads all Glossary terms from Firestore (or memory mirror).
 */
export async function getGlossaryTerms(): Promise<GlossaryTerm[]> {
  if (shouldAttemptFirestore()) {
    try {
      const db = getAdminFirestore();
      const snapshot = await db.collection(GLOSSARY_COLLECTION).get();
      if (!snapshot.empty) {
        const list: GlossaryTerm[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as GlossaryTerm;
          list.push({ ...data, id: doc.id });
        });
        // Update live cache
        for (const item of list) {
          glossaryMemoryMap.set(item.id || slugifyTerm(item.term), item);
        }
        return list.sort((a, b) => a.term.localeCompare(b.term));
      }
    } catch (err) {
      console.warn('[firestore-support-store] Firestore Glossary read failed, falling back to memory store:', err);
    }
  }

  return Array.from(glossaryMemoryMap.values()).sort((a, b) => a.term.localeCompare(b.term));
}

/**
 * Synchronous getter reading current live memory store.
 */
export function getGlossaryTermsSync(): GlossaryTerm[] {
  return Array.from(glossaryMemoryMap.values()).sort((a, b) => a.term.localeCompare(b.term));
}

/**
 * Filter Glossary terms by query byte-compatibly.
 */
export async function searchGlossaryTerms(query: string): Promise<GlossaryTerm[]> {
  const all = await getGlossaryTerms();
  const q = query.trim().toLowerCase();
  if (!q) return all;

  return all.filter(
    (item) =>
      item.term.toLowerCase().includes(q) ||
      item.definition.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q),
  );
}

/**
 * Synchronous search reading current live memory store.
 */
export function searchGlossaryTermsSync(query: string): GlossaryTerm[] {
  const all = getGlossaryTermsSync();
  const q = query.trim().toLowerCase();
  if (!q) return all;

  return all.filter(
    (item) =>
      item.term.toLowerCase().includes(q) ||
      item.definition.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q),
  );
}

/**
 * Upserts a Glossary term into Firestore & live cache.
 * Strictly validates against Zod schema and rejects injection, emails, and URLs.
 */
export async function upsertGlossaryTerm(term: GlossaryTerm): Promise<GlossaryTerm> {
  const sanitized = validateAndSanitizeGlossaryInput(term);
  const id = sanitized.id || slugifyTerm(sanitized.term);
  const entry: GlossaryTerm = {
    ...sanitized,
    id,
    updatedAt: new Date().toISOString(),
  };
  glossaryMemoryMap.set(id, entry);

  if (shouldAttemptFirestore()) {
    try {
      const db = getAdminFirestore();
      await db.collection(GLOSSARY_COLLECTION).doc(id).set(entry, { merge: true });
    } catch (err) {
      console.warn(`[firestore-support-store] Firestore write failed for Glossary ${id}:`, err);
    }
  }

  return entry;
}

export { groupGlossaryByLetter };
export type { FaqEntry, GlossaryTerm, GlossaryGroup };
