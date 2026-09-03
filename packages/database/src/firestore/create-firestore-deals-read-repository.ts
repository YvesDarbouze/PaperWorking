import { getFirestoreAdmin } from './admin.js';
import {
  dealToDealRecord,
  dealToExistsPreview,
} from './converters/deal.converter.js';
import { FirestoreDealRepository } from './repositories/deal.repository.js';
import type { FirestoreClientFactory } from './repositories/firestore-access.js';

/** Firestore DealsReadRepository — replaces Prisma when DATABASE_READ_MODE=firestore. */
export function createFirestoreDealsReadRepository(
  firestoreFactory: FirestoreClientFactory = getFirestoreAdmin,
) {
  const deals = new FirestoreDealRepository(firestoreFactory);

  return {
    async listDeals(input: {
      accessOr: Array<Record<string, unknown>>;
      q?: string;
    }) {
      const rows = await deals.listDeals(input);
      return rows.map(dealToDealRecord);
    },

    async findBySlugOrId(slugOrId: string) {
      const deal = await deals.findBySlugOrId(slugOrId);
      return deal ? dealToExistsPreview(deal) : null;
    },

    async findBySlug(slug: string) {
      const deal = await deals.findBySlug(slug);
      return deal ? dealToDealRecord(deal) : null;
    },
  };
}

export type FirestoreDealsReadRepository = ReturnType<typeof createFirestoreDealsReadRepository>;
