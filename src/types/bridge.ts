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

/** Response shape from /api/bridge/agents */
export interface BridgeAgentResult {
  memberKey: string;
  name: string;
  email: string | null;
  phone: string | null;
  license: string | null;
  officeName: string | null;
  photoUrl: string | null;
}

/** Response shape from /api/bridge/offices */
export interface BridgeOfficeResult {
  officeKey: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string;
  type: string | null;
  status: string | null;
}

/** Response shape from /api/bridge/openhouses */
export interface BridgeOpenHouseResult {
  openHouseKey: string;
  listingKey: string | null;
  listingId: string | null;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  type: string | null;
  remarks: string | null;
  showingAgent: string | null;
}
