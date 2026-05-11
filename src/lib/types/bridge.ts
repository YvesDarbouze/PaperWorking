import { z } from 'zod';

/**
 * 🌉 Zillow Bridge / RESO OData v1.1.0 Schemas
 * 
 * Standardized validation for Multiple Listing Service (MLS) data.
 * Patterns follow the Real Estate Standards Organization (RESO) Data Dictionary.
 *
 * Resources documented at:
 *   https://www.zillowgroup.com/developers/api/mls-broker-data/mls-listings/
 *   https://bridgedataoutput.com/docs/platform/
 */

// ─────────────────────────────────────────────────────────────────────────────
// Media
// ─────────────────────────────────────────────────────────────────────────────

export const BridgeMediaSchema = z.object({
  MediaURL: z.string().url(),
  Order: z.number().optional().default(0),
  MediaCategory: z.string().optional(),
  ShortDescription: z.string().optional(),
  LongDescription: z.string().optional(),
  MediaKey: z.string().optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Property (Listings)
// ─────────────────────────────────────────────────────────────────────────────

export const BridgePropertySchema = z.object({
  // IDs & Status
  ListingKey: z.string(),
  ListingId: z.string(),
  StandardStatus: z.string().optional().default('Sourcing'),
  MlsStatus: z.string().optional(),

  // Location
  UnparsedAddress: z.string().optional(),
  FullAddress: z.string().optional(),
  City: z.string().optional(),
  StateOrProvince: z.string().optional(),
  PostalCode: z.string().optional(),
  CountyOrParish: z.string().optional(),
  Latitude: z.number().optional(),
  Longitude: z.number().optional(),

  // Physical Characteristics
  BedroomsTotal: z.number().optional().default(0),
  BathroomsFull: z.number().optional().default(0),
  BathroomsHalf: z.number().optional().default(0),
  LivingArea: z.number().optional().default(0),
  LotSizeAcres: z.number().optional().default(0),
  YearBuilt: z.number().optional().default(0),
  PropertyType: z.string().optional(),
  PropertySubType: z.string().optional(),

  // Financials
  ListPrice: z.number().optional().default(0),
  OriginalListPrice: z.number().optional(),
  ClosePrice: z.number().optional(),
  AssociationFee: z.number().optional(),
  TaxAnnualAmount: z.number().optional(),

  // Remarks & Media
  PublicRemarks: z.string().optional().default(''),
  Media: z.array(BridgeMediaSchema).optional().default([]),

  // Dates
  ListingContractDate: z.string().optional(),
  CloseDate: z.string().optional(),
  OnMarketDate: z.string().optional(),
  DaysOnMarket: z.number().optional(),
  ModificationTimestamp: z.string().optional(),
  StatusChangeTimestamp: z.string().optional(),
  BridgeModificationTimestamp: z.string().optional(),

  // Agent & Office References
  ListAgentKey: z.string().optional(),
  ListAgentFullName: z.string().optional(),
  ListAgentMlsId: z.string().optional(),
  ListOfficeKey: z.string().optional(),
  ListOfficeName: z.string().optional(),
  ListOfficeMlsId: z.string().optional(),
  BuyerAgentKey: z.string().optional(),
  BuyerAgentFullName: z.string().optional(),
  BuyerOfficeKey: z.string().optional(),
  BuyerOfficeName: z.string().optional(),

  // Feed metadata
  FeedTypes: z.array(z.string()).optional().default([]),
  OriginatingSystemName: z.string().optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Member (Agents)
// RESO OData: /{dataset}/Member
// Bridge Web API: /{dataset}/agents
// ─────────────────────────────────────────────────────────────────────────────

export const BridgeMemberSchema = z.object({
  MemberKey: z.string(),
  MemberMlsId: z.string().optional(),
  MemberFirstName: z.string().optional(),
  MemberLastName: z.string().optional(),
  MemberFullName: z.string().optional(),
  MemberEmail: z.string().optional(),
  MemberDirectPhone: z.string().optional(),
  MemberOfficePhone: z.string().optional(),
  MemberMobilePhone: z.string().optional(),
  MemberStateLicense: z.string().optional(),
  MemberDesignation: z.array(z.string()).optional().default([]),

  // Office reference
  OfficeName: z.string().optional(),
  OfficeKey: z.string().optional(),
  OfficeMlsId: z.string().optional(),

  // Media
  Media: z.array(BridgeMediaSchema).optional().default([]),

  // Metadata
  ModificationTimestamp: z.string().optional(),
  OriginatingSystemName: z.string().optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Office
// RESO OData: /{dataset}/Office
// Bridge Web API: /{dataset}/offices
// ─────────────────────────────────────────────────────────────────────────────

export const BridgeOfficeSchema = z.object({
  OfficeKey: z.string(),
  OfficeMlsId: z.string().optional(),
  OfficeName: z.string().optional(),
  OfficePhone: z.string().optional(),
  OfficeEmail: z.string().optional(),
  OfficeAddress1: z.string().optional(),
  OfficeAddress2: z.string().optional(),
  OfficeCity: z.string().optional(),
  OfficeStateOrProvince: z.string().optional(),
  OfficePostalCode: z.string().optional(),
  OfficeBrokerKey: z.string().optional(),
  OfficeBrokerMlsId: z.string().optional(),
  OfficeType: z.string().optional(),
  OfficeStatus: z.string().optional(),

  // Metadata
  ModificationTimestamp: z.string().optional(),
  OriginatingSystemName: z.string().optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// OpenHouse
// RESO OData: /{dataset}/OpenHouse
// Bridge Web API: /{dataset}/openhouses
// ─────────────────────────────────────────────────────────────────────────────

export const BridgeOpenHouseSchema = z.object({
  OpenHouseKey: z.string(),
  OpenHouseId: z.string().optional(),
  ListingKey: z.string().optional(),
  ListingId: z.string().optional(),
  OpenHouseDate: z.string().optional(),
  OpenHouseStartTime: z.string().optional(),
  OpenHouseEndTime: z.string().optional(),
  OpenHouseType: z.string().optional(),
  OpenHouseRemarks: z.string().optional(),
  ShowingAgentKey: z.string().optional(),
  ShowingAgentFirstName: z.string().optional(),
  ShowingAgentLastName: z.string().optional(),

  // Metadata
  ModificationTimestamp: z.string().optional(),
  OriginatingSystemName: z.string().optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// OData Response Wrapper
// ─────────────────────────────────────────────────────────────────────────────

export const ODataResponseSchema = z.object({
  value: z.array(z.any()),
  '@odata.nextLink': z.string().optional(),
  '@odata.count': z.number().optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Exported Types
// ─────────────────────────────────────────────────────────────────────────────

export type BridgeProperty = z.infer<typeof BridgePropertySchema>;
export type BridgeMember = z.infer<typeof BridgeMemberSchema>;
export type BridgeOffice = z.infer<typeof BridgeOfficeSchema>;
export type BridgeOpenHouse = z.infer<typeof BridgeOpenHouseSchema>;
export type ODataResponse = z.infer<typeof ODataResponseSchema>;
export type BridgeMedia = z.infer<typeof BridgeMediaSchema>;
