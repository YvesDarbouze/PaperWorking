import {
  getFaqEntriesSync,
  searchFaqEntriesSync,
  getFaqEntries as getFaqEntriesAsync,
  searchFaqEntries as searchFaqEntriesAsync,
  upsertFaqEntry,
} from './firestore-support-store';
import type { FaqEntry, FaqCategory } from './types';

export type { FaqEntry, FaqCategory };

// Dynamic proxy so any access to FAQ_ENTRIES gets live data from the Firestore support store
export const FAQ_ENTRIES: FaqEntry[] = new Proxy([] as FaqEntry[], {
  get(_target, prop, receiver) {
    const list = getFaqEntriesSync();
    const val = Reflect.get(list, prop, receiver);
    if (typeof val === 'function') {
      return val.bind(list);
    }
    return val;
  },
  has(_target, prop) {
    const list = getFaqEntriesSync();
    return Reflect.has(list, prop);
  },
  ownKeys(_target) {
    const list = getFaqEntriesSync();
    return Reflect.ownKeys(list);
  },
  getOwnPropertyDescriptor(_target, prop) {
    const list = getFaqEntriesSync();
    return Reflect.getOwnPropertyDescriptor(list, prop);
  },
});

export { getFaqEntriesSync as getFaqEntries, searchFaqEntriesSync as searchFaqEntries };
export { getFaqEntriesAsync, searchFaqEntriesAsync, upsertFaqEntry };
