import { z } from 'zod';

/**
 * 🗺️ Public Records Enumerations
 */

export enum BridgeTransactionType {
  DEED = 'DEED',
  RE_SALE = 'RE-SALE',
  QUIT_CLAIM = 'QUIT-CLAIM',
  QUIT_CLAIMS = 'QUIT-CLAIMS',
  FORECLOSURE = 'FORECLOSURE',
  RE_FINANCE = 'RE-FINANCE',
  CONSTRUCTION_LOAN = 'CONSTRUCTION-LOAN',
  DEED_IN_LIEU = 'DEED-IN-LIEU',
  INTER_FAMILY = 'INTER-FAMILY',
}

export enum BridgePropertyUse {
  RESIDENTIAL = 'RESIDENTIAL',
  COMMERCIAL = 'COMMERCIAL',
  VACANT_LAND = 'VACANT-LAND',
  AGRICULTURAL = 'AGRICULTURAL',
  INDUSTRIAL = 'INDUSTRIAL',
  MULTI_FAMILY = 'MULTI-FAMILY',
}

export enum BridgeTaxStatus {
  PAID = 'PAID',
  DELINQUENT = 'DELINQUENT',
  EXEMPT = 'EXEMPT',
  PARTIAL = 'PARTIAL',
}

/**
 * 🏘️ Bridge Public Records (Parcels) Schema
 * 
 * Non-OData structure for parcel-level property data.
 */
export const BridgeParcelSchema = z.object({
  ParcelId: z.string(),
  County: z.string().optional(),
  FIPS: z.string().optional(),
  AssessedValue: z.number().optional().default(0),
  TaxAmount: z.number().optional().default(0),
  TaxYear: z.number().optional(),
  LegalDescription: z.string().optional(),
  Coordinates: z.string().optional(),
  OwnerName: z.string().optional(),
  LandValue: z.number().optional(),
  ImprovementValue: z.number().optional(),
  PropertyUse: z.nativeEnum(BridgePropertyUse).optional(),
});

/**
 * 📝 Bridge Tax Assessment Schema
 * 
 * Detailed tax history records.
 */
export const BridgeAssessmentSchema = z.object({
  TaxYear: z.number(),
  TaxAmount: z.number().optional().default(0),
  AssessedLandValue: z.number().optional().default(0),
  AssessedImprovementValue: z.number().optional().default(0),
  TotalAssessedValue: z.number().optional().default(0),
  TaxStatus: z.nativeEnum(BridgeTaxStatus).optional(),
  zpid: z.string().optional(),
  AddressFull: z.string().optional(),
});

/**
 * 💸 Bridge Transaction Schema
 * 
 * Historical sales and recording data for comparables.
 */
export const BridgeTransactionSchema = z.object({
  RecordingDate: z.string(),
  SalesPrice: z.number().optional().default(0),
  DocumentType: z.nativeEnum(BridgeTransactionType).or(z.string()).optional(),
  BuyerName: z.string().optional(),
  SellerName: z.string().optional(),
  RecordingBook: z.string().optional(),
  RecordingPage: z.string().optional(),
});

/**
 * 📦 Non-OData Response Wrapper
 */
export const BridgePublicResponseSchema = z.object({
  results: z.array(z.any()),
  totalCount: z.number().optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
});

export type BridgeParcel = z.infer<typeof BridgeParcelSchema>;
export type BridgeAssessment = z.infer<typeof BridgeAssessmentSchema>;
export type BridgeTransaction = z.infer<typeof BridgeTransactionSchema>;
export type BridgePublicResponse = z.infer<typeof BridgePublicResponseSchema>;
