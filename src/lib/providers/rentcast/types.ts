// ─── RentCast API Response Types ──────────────────────────────────────────────
// Typed interfaces matching the documented RentCast API schemas.
// Reference: https://api.rentcast.io/v1 (OpenAPI spec)

// ─── Common ──────────────────────────────────────────────────────────────────

export interface RentCastAddress {
  id: string;
  formattedAddress: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  stateFips: string;
  zipCode: string;
  county: string;
  countyFips: string;
  latitude: number;
  longitude: number;
}

export interface RentCastFeatures {
  architectureType?: string;
  cooling?: boolean;
  coolingType?: string;
  exteriorType?: string;
  fireplace?: boolean;
  fireplaceType?: string;
  floorCount?: number;
  foundationType?: string;
  garage?: boolean;
  garageSpaces?: number;
  garageType?: string;
  heating?: boolean;
  heatingType?: string;
  pool?: boolean;
  poolType?: string;
  roofType?: string;
  roomCount?: number;
  unitCount?: number;
  viewType?: string;
}

export interface RentCastTaxAssessment {
  year: number;
  value: number;
  land: number;
  improvements: number;
}

export interface RentCastPropertyTax {
  year: number;
  total: number;
}

export interface RentCastHistoryEntry {
  event: string;
  date: string;
  price?: number;
}

export interface RentCastOwner {
  names: string[];
  type: string;
  mailingAddress: RentCastAddress;
}

// ─── /properties ─────────────────────────────────────────────────────────────

export interface RentCastProperty extends RentCastAddress {
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  lotSize: number;
  yearBuilt: number;
  assessorID?: string;
  legalDescription?: string;
  subdivision?: string;
  zoning?: string;
  lastSaleDate?: string;
  hoa?: { fee: number };
  features?: RentCastFeatures;
  taxAssessments?: Record<string, RentCastTaxAssessment>;
  propertyTaxes?: Record<string, RentCastPropertyTax>;
  history?: Record<string, RentCastHistoryEntry>;
  owner?: RentCastOwner;
  ownerOccupied?: boolean;
}

// ─── /avm/value ──────────────────────────────────────────────────────────────

export interface RentCastSaleComparable {
  id: string;
  formattedAddress: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  lotSize: number;
  yearBuilt: number;
  status: string;
  price: number;
  listingType?: string;
  listedDate?: string;
  removedDate?: string;
  lastSeenDate?: string;
  daysOnMarket?: number;
  distance: number;
  daysOld?: number;
  correlation: number;
}

export interface RentCastValueEstimate {
  price: number;
  priceRangeLow: number;
  priceRangeHigh: number;
  latitude: number;
  longitude: number;
  subjectProperty?: Partial<RentCastProperty>;
  comparables: RentCastSaleComparable[];
}

// ─── /avm/rent/long-term ─────────────────────────────────────────────────────

export interface RentCastRentalComparable {
  id: string;
  formattedAddress: string;
  addressLine1: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  lotSize: number;
  yearBuilt: number;
  status: string;
  price: number;
  listedDate?: string;
  removedDate?: string;
  lastSeenDate?: string;
  daysOnMarket?: number;
  distance: number;
  correlation: number;
}

export interface RentCastRentEstimate {
  rent: number;
  rentRangeLow: number;
  rentRangeHigh: number;
  latitude: number;
  longitude: number;
  subjectProperty?: Partial<RentCastProperty>;
  comparables: RentCastRentalComparable[];
}

// ─── /markets ────────────────────────────────────────────────────────────────

export interface RentCastMarketStat {
  averagePrice?: number;
  medianPrice?: number;
  minPrice?: number;
  maxPrice?: number;
  averagePricePerSquareFoot?: number;
  medianPricePerSquareFoot?: number;
  minPricePerSquareFoot?: number;
  maxPricePerSquareFoot?: number;
  averageSquareFootage?: number;
  medianSquareFootage?: number;
  minSquareFootage?: number;
  maxSquareFootage?: number;
  averageDaysOnMarket?: number;
  medianDaysOnMarket?: number;
  minDaysOnMarket?: number;
  maxDaysOnMarket?: number;
  newListings?: number;
  totalListings?: number;
}

export interface RentCastMarketPropertyTypeStat extends RentCastMarketStat {
  propertyType: string;
}

export interface RentCastMarketBedroomsStat extends RentCastMarketStat {
  bedrooms: number;
}

export interface RentCastMarketDataSection extends RentCastMarketStat {
  dataByPropertyType?: RentCastMarketPropertyTypeStat[];
  dataByBedrooms?: RentCastMarketBedroomsStat[];
  history?: Record<string, RentCastMarketStat>;
}

export interface RentCastMarketData {
  zipCode: string;
  city: string;
  state: string;
  county: string;
  latitude: number;
  longitude: number;
  saleData?: RentCastMarketDataSection;
  rentalData?: RentCastMarketDataSection;
}

// ─── /listings/sale & /listings/rental ────────────────────────────────────────

export interface RentCastListing {
  id: string;
  formattedAddress: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  zipCode: string;
  county: string;
  latitude: number;
  longitude: number;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  lotSize: number;
  yearBuilt: number;
  status: string;
  price: number;
  listingType?: string;
  listedDate?: string;
  removedDate?: string;
  lastSeenDate?: string;
  daysOnMarket?: number;
}

// ─── Client Method Params ────────────────────────────────────────────────────

export interface PropertyLookupParams {
  address: string;
}

export interface AVMValueParams {
  address: string;
  compCount?: number;
  maxRadius?: number;
  daysOld?: number;
}

export interface AVMRentParams {
  address: string;
  compCount?: number;
  maxRadius?: number;
  daysOld?: number;
}

export interface MarketParams {
  zipCode: string;
}

export interface ListingParams {
  address?: string;
  zipCode?: string;
  city?: string;
  state?: string;
  limit?: number;
  offset?: number;
  status?: string;
  bedrooms?: number;
  bathrooms?: number;
  propertyType?: string;
  minPrice?: number;
  maxPrice?: number;
}

// ─── Cache Entry Envelope ────────────────────────────────────────────────────

export interface CachedResponse<T> {
  data: T;
  fetchedAt: string;         // ISO date
  endpoint: string;
  cacheKey: string;
  ttlSeconds: number;
  expiresAt: string;         // ISO date
}

// ─── Endpoint TTL Configuration ──────────────────────────────────────────────

export const ENDPOINT_TTLS: Record<string, number> = {
  'properties':          30 * 24 * 60 * 60,  // 30 days — static property data
  'avm/value':           7 * 24 * 60 * 60,   // 7 days  — AVM valuations
  'avm/rent/long-term':  7 * 24 * 60 * 60,   // 7 days  — rent estimates
  'markets':             30 * 24 * 60 * 60,  // 30 days — market stats
  'listings/sale':       24 * 60 * 60,        // 24 hours — active sale listings
  'listings/rental':     24 * 60 * 60,        // 24 hours — active rental listings
};
