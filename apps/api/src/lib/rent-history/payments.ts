export interface RentalListing {
  price?: number | null;
  listedDate?: string | null;
  removedDate?: string | null;
}

export interface RentPayment {
  period: string;
  modality: string;
  grossRevenue: number;
}

/**
 * Expands rental listings into month-by-month rent payments.
 * Source: PaperWorking src/app/api/rent-history/import/route.ts
 */
export function expandListingsToRentPayments(
  listings: RentalListing[],
  now: Date = new Date(),
): RentPayment[] {
  const paymentsMap: Record<string, RentPayment> = {};

  for (const listing of listings) {
    if (!listing.price || !listing.listedDate) continue;

    const start = new Date(listing.listedDate);
    const end = listing.removedDate ? new Date(listing.removedDate) : now;

    const current = new Date(start.getFullYear(), start.getMonth(), 1);
    const endLimit = new Date(end.getFullYear(), end.getMonth(), 1);

    while (current <= endLimit) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const period = `${year}-${month}`;

      paymentsMap[period] = {
        period,
        modality: 'long_term_rental',
        grossRevenue: listing.price,
      };

      current.setMonth(current.getMonth() + 1);
    }
  }

  return Object.values(paymentsMap).sort((a, b) => b.period.localeCompare(a.period));
}
