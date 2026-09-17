import {
  getGlossaryTermsSync,
  searchGlossaryTermsSync,
  getGlossaryTerms as getGlossaryTermsAsync,
  searchGlossaryTerms as searchGlossaryTermsAsync,
  upsertGlossaryTerm,
  groupGlossaryByLetter,
} from './firestore-support-store';
import type { GlossaryTerm, GlossaryCategory, GlossaryGroup } from './types';

export type { GlossaryTerm, GlossaryCategory, GlossaryGroup };

// Dynamic proxy so any access to GLOSSARY_TERMS gets live data from the Firestore support store
export const GLOSSARY_TERMS: GlossaryTerm[] = new Proxy([] as GlossaryTerm[], {
  get(_target, prop, receiver) {
    const list = getGlossaryTermsSync();
    const val = Reflect.get(list, prop, receiver);
    if (typeof val === 'function') {
      return val.bind(list);
    }
    return val;
  },
  has(_target, prop) {
    const list = getGlossaryTermsSync();
    return Reflect.has(list, prop);
  },
  ownKeys(_target) {
    const list = getGlossaryTermsSync();
    return Reflect.ownKeys(list);
  },
  getOwnPropertyDescriptor(_target, prop) {
    const list = getGlossaryTermsSync();
    return Reflect.getOwnPropertyDescriptor(list, prop);
  },
});

export { getGlossaryTermsSync as getGlossaryTerms, searchGlossaryTermsSync as searchGlossaryTerms, groupGlossaryByLetter };
export { getGlossaryTermsAsync, searchGlossaryTermsAsync, upsertGlossaryTerm };
