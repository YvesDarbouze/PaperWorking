import { z } from 'zod';

export const vendorServiceStatusEnum = z.enum([
  'draft',
  'published',
  'paused',
  'archived',
]);

/**
 * Canonical schema for `/vendorServices/{serviceId}`.
 */
export const vendorServiceSchema = z.object({
  id: z.string().min(1),
  vendorUid: z.string().min(1),
  title: z.string().min(1),
  serviceType: z.string().min(1),
  description: z.string().min(1),
  status: vendorServiceStatusEnum,
  regions: z.array(z.string()).optional(),
  basePrice: z.number().nonnegative().optional(),
  currency: z.string().optional(),
  coverImageUrl: z.string().url().optional(),
  ratingAvg: z.number().min(0).max(5).optional(),
  ratingCount: z.number().int().nonnegative().optional(),
  publishedAt: z.any().optional(),
  createdAt: z.any(),
  updatedAt: z.any(),
});

export type VendorService = z.infer<typeof vendorServiceSchema>;

