import { prisma } from '../prisma';
import { Project, LedgerItem } from '@/types/schema';

/**
 * ── FinancialsSyncService ──
 * Orchestrates high-fidelity synchronization between Firestore (Operational)
 * and Postgres/Prisma (Financial Reporting).
 *
 * Priority: Precision and Audit Integrity.
 */

export const financialsSyncService = {

  /**
   * Syncs a Deal's core financial summary to Postgres.
   *
   * NOTE: totalPayouts is intentionally excluded from the update payload.
   * It is owned exclusively by syncLedgerItems, which derives it from the
   * full Postgres aggregate. Overwriting it here would zero out confirmed
   * payouts on every Firestore re-sync.
   */
  async syncProjectFinancials(deal: Project): Promise<void> {
    if (!deal.id || !deal.organizationId) return;

    const financialFields = {
      organizationId: deal.organizationId,
      purchasePrice: BigInt(Math.round(deal.financials?.purchasePrice || 0)),
      salePrice: BigInt(Math.round(deal.financials?.actualSalePrice || 0)),
      closingCosts: BigInt(Math.round(deal.financials?.finalClosingCosts || 0)),
      renovationCosts: (deal.financials?.costs || []).reduce(
        (sum, c) => sum + BigInt(Math.round(c.amount || 0)),
        BigInt(0)
      ),
      holdingCosts: BigInt(0),
    };

    await prisma.dealFinancials.upsert({
      where: { linkedDealId: deal.id },
      update: financialFields,
      create: {
        ...financialFields,
        linkedDealId: deal.id,
        totalPayouts: BigInt(0),
      },
    });
  },

  /**
   * Syncs a batch of ledger items (payouts) for a deal within a single
   * ACID transaction. totalPayouts is re-derived from the full Postgres
   * aggregate after all upserts complete — not from the current batch —
   * so partial re-syncs never corrupt the running total.
   *
   * Throws on failure so callers can detect and handle sync errors.
   */
  async syncLedgerItems(projectId: string, _organizationId: string, items: LedgerItem[]): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const financials = await tx.dealFinancials.findUnique({
        where: { linkedDealId: projectId },
      });

      if (!financials) {
        throw new Error(`[SYNC] Parent financials not found for deal ${projectId}. Sync aborted.`);
      }

      for (const item of items) {
        const payoutData = {
          financialsId: financials.id,
          payeeName: item.description || 'Unknown Payee',
          payeeRole: item.category || 'Other',
          payoutAmount: BigInt(Math.round(item.amount || 0)),
          isConfirmed: item.status === 'Approved',
          linkedItemId: item.id,
          status: item.status || 'Pending',
        };

        await tx.payoutWaterfall.upsert({
          where: { linkedItemId: item.id },
          update: payoutData,
          create: payoutData,
        });
      }

      // Aggregate from the FULL Postgres dataset for this deal — not just
      // the current batch — to guarantee a consistent confirmed total.
      const aggregate = await tx.payoutWaterfall.aggregate({
        where: { financialsId: financials.id, isConfirmed: true },
        _sum: { payoutAmount: true },
      });

      await tx.dealFinancials.update({
        where: { id: financials.id },
        data: { totalPayouts: aggregate._sum.payoutAmount ?? BigInt(0) },
      });
    });
  },
};
