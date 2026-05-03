// Shared Bridge Interactive API types — used by both the route handler and client components.

export interface BridgeSearchResult {
  listingKey: string;
  listingId: string;
  address: string;
  listPrice: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  standardStatus: string | null;
  thumbnailUrl: string | null;
}
