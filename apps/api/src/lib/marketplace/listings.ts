export interface DealListingRecord {
  id: string;
  visibility?: string;
  visibilityMode?: string;
  isNewListing?: boolean;
  createdAt?: string | number | Date;
  [key: string]: unknown;
}

export function isPublicListing(listing: DealListingRecord): boolean {
  return listing.visibility === 'PUBLIC' || listing.visibilityMode === 'PUBLIC';
}

export function filterListingsForViewer(
  listings: DealListingRecord[],
  isAuthenticated: boolean,
): DealListingRecord[] {
  if (isAuthenticated) return listings;
  return listings.filter(isPublicListing);
}

export function sortMarketplaceListings(listings: DealListingRecord[]): DealListingRecord[] {
  return [...listings].sort((a, b) => {
    if (a.isNewListing && !b.isNewListing) return -1;
    if (!a.isNewListing && b.isNewListing) return 1;

    const timeA = new Date(a.createdAt ?? 0).getTime();
    const timeB = new Date(b.createdAt ?? 0).getTime();
    return timeB - timeA;
  });
}
