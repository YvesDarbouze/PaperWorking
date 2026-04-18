import { z } from 'zod';

/**
 * 🌉 Zillow Bridge / RESO OData v1.1.0 Schemas
 * 
 * Standardized validation for Multiple Listing Service (MLS) data.
 * Patterns follow the Real Estate Standards Organization (RESO) Data Dictionary.
 */

export const BridgeMediaSchema = z.object({
  MediaURL: z.string().url(),
  Order: z.number().optional().default(0),
  MediaCategory: z.string().optional(),
  ShortDescription: z.string().optional(),
  LongDescription: z.string().optional(),
  MediaKey: z.string().optional(),
});

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

  // Financials
  ListPrice: z.number().optional().default(0),
  OriginalListPrice: z.number().optional(),
  ClosePrice: z.number().optional(),

  // Remarks & Media
  PublicRemarks: z.string().optional().default(''),
  Media: z.array(BridgeMediaSchema).optional().default([]),

  // Metadata
  ModificationTimestamp: z.string().optional(),
  StatusChangeTimestamp: z.string().optional(),
  ListAgentFullName: z.string().optional(),
  ListOfficeName: z.string().optional(),
});

export const ODataResponseSchema = z.object({
  value: z.array(z.any()), // We will validate individual items later for flexibility
  '@odata.nextLink': z.string().optional(),
  '@odata.count': z.number().optional(),
});

export type BridgeProperty = z.infer<typeof BridgePropertySchema>;
export type ODataResponse = z.infer<typeof ODataResponseSchema>;
export type BridgeMedia = z.infer<typeof BridgeMediaSchema>;
