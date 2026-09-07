import { getFirestoreAdmin } from './admin.js';
import { dealToDealRecord } from './converters/deal.converter.js';
import { FirestoreDealRepository } from './repositories/deal.repository.js';
import type { FirestoreClientFactory } from './repositories/firestore-access.js';

/** Firestore DealsCommandRepository — replaces Prisma when DATABASE_READ_MODE=firestore. */
export function createFirestoreDealsCommandRepository(
  firestoreFactory: FirestoreClientFactory = getFirestoreAdmin,
) {
  const deals = new FirestoreDealRepository(firestoreFactory);

  return {
    async findBySlug(slug: string) {
      const deal = await deals.findBySlug(slug);
      return deal ? { id: deal.id } : null;
    },

    async findById(id: string) {
      const deal = await deals.getById(id);
      return deal ? { id: deal.id } : null;
    },

    async getBySlug(slug: string) {
      const deal = await deals.findBySlug(slug);
      return deal ? dealToDealRecord(deal) : null;
    },

    async create(data: Parameters<FirestoreDealRepository['create']>[0]) {
      const created = await deals.create(data);
      return dealToDealRecord(created);
    },

    async updateBySlug(slug: string, patch: Parameters<FirestoreDealRepository['updateBySlug']>[1]) {
      const updated = await deals.updateBySlug(slug, patch);
      return dealToDealRecord(updated);
    },
  };
}

export type FirestoreDealsCommandRepository = ReturnType<
  typeof createFirestoreDealsCommandRepository
>;
