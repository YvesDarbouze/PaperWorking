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

const canonicalFaqById = new Map<string, FaqEntry>(
  CANONICAL_FAQ_SEED.map((f) => [f.id, f]),
);

const LEGACY_OR_STALE_PRICING_REGEX =
  /(\$(?:29|41|79|82)\s*\/\s*mo|vendor\s+\$29|investment\s+team\s+\$82)/i;

const ANY_PRICING_TIER_REGEX =
  /(\$(?:29|39|41|59|79|82|99)\s*\/\s*mo|\$(?:390|499|999)\s*\/\s*yr|three\s+transparent\s+pricing\s+plans|subscription\s+tiers)/i;

/**
 * Validates a FAQ entry loaded from Firestore or cache and heals stale legacy pricing
 * strings (e.g. "Vendor $29/mo, Investment Team $82/mo") or non-Billing FAQs polluted
 * with subscription tier breakdowns back to CANONICAL_FAQ_SEED.
 */
export function sanitizeOrHealFaqEntry(item: FaqEntry): FaqEntry | null {
  if (
    !item ||
    typeof item.id !== 'string' ||
    typeof item.question !== 'string' ||
    typeof item.answer !== 'string'
  ) {
    return null;
  }

  const canonical = canonicalFaqById.get(item.id);
  const combined = `${item.question} ${item.answer}`;

  if (LEGACY_OR_STALE_PRICING_REGEX.test(combined)) {
    return canonical ? { ...canonical } : null;
  }

  const isBillingFaq =
    item.id === 'faq-pricing-plans' || item.category?.toLowerCase() === 'billing';
  if (!isBillingFaq && ANY_PRICING_TIER_REGEX.test(item.answer)) {
    return canonical ? { ...canonical } : null;
  }

  return item;
}

function ensureCanonicalFaqsAndHealStore(): void {
  for (const canonical of CANONICAL_FAQ_SEED) {
    if (!faqMemoryMap.has(canonical.id)) {
      faqMemoryMap.set(canonical.id, { ...canonical });
    }
  }
  for (const [id, entry] of Array.from(faqMemoryMap.entries())) {
    const healed = sanitizeOrHealFaqEntry(entry);
    if (!healed) {
      faqMemoryMap.delete(id);
    } else if (healed !== entry) {
      faqMemoryMap.set(id, healed);
    }
  }
}

export function slugifyTerm(term: string): string {
  return term
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function withFirestoreTimeout<T>(promise: Promise<T>): Promise<T> {
  const timeoutMs = Number(process.env.FIRESTORE_READ_TIMEOUT_MS) || 1500;
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Firestore read timeout')), timeoutMs);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/**
 * Reads all FAQ entries from Firestore (merged onto canonical seeds and healed).
 */
export async function getFaqEntries(): Promise<FaqEntry[]> {
  ensureCanonicalFaqsAndHealStore();

  if (shouldAttemptFirestore()) {
    try {
      const db = getAdminFirestore();
      const snapshot = await withFirestoreTimeout(db.collection(FAQ_COLLECTION).get());
      if (!snapshot.empty) {
        snapshot.forEach((doc) => {
          const data = doc.data() as FaqEntry;
          const healed = sanitizeOrHealFaqEntry({ ...data, id: doc.id });
          if (healed) {
            faqMemoryMap.set(healed.id, healed);
          }
        });
      }
    } catch (err) {
      console.warn('[firestore-support-store] Firestore FAQ read failed, falling back to memory store:', err);
    }
  }

  ensureCanonicalFaqsAndHealStore();
  return Array.from(faqMemoryMap.values()).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/**
 * Synchronous getter reading current live memory store.
 */
export function getFaqEntriesSync(): FaqEntry[] {
  ensureCanonicalFaqsAndHealStore();
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
      const doc = await withFirestoreTimeout(db.collection(FAQ_COLLECTION).doc(id).get());
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
      if (process.env.NODE_ENV === 'production') {
        throw err;
      }
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
      const snapshot = await withFirestoreTimeout(db.collection(GLOSSARY_COLLECTION).get());
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
      if (process.env.NODE_ENV === 'production') {
        throw err;
      }
    }
  }

  return entry;
}

export { groupGlossaryByLetter };
export type { FaqEntry, GlossaryTerm, GlossaryGroup };
