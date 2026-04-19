import { z } from 'zod';

/**
 * 📈 Zillow Group Economic Data (ZGEcon) Market Report Schema
 * 
 * Macro-level market trends.
 */
export const MarketReportSchema = z.object({
  RegionName: z.string(),
  RegionType: z.string(),
  StateCodeFIPS: z.string().optional(),
  ZHVI: z.number().optional().default(0),
  Inventory: z.number().optional().default(0),
  MedianListPrice: z.number().optional().default(0),
  MedianSalePrice: z.number().optional().default(0),
  MedianDaysToPending: z.number().optional().default(0),
  Month: z.string().optional(), // Format: YYYY-MM
});

/**
 * 📦 ZGEcon Response Wrapper
 */
export const ZGEconResponseSchema = z.object({
  results: z.array(z.any()),
  totalCount: z.number().optional(),
});

export type MarketReport = z.infer<typeof MarketReportSchema>;
export type ZGEconResponse = z.infer<typeof ZGEconResponseSchema>;
