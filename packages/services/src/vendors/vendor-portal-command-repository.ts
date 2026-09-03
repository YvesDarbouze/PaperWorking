import type { VendorBidRow, VendorPortalVendorRow } from './vendor-portal-read-repository.js';

export type VendorPortalCommandRepository = {
  findVendorByContactEmail(email: string): Promise<VendorPortalVendorRow | null>;
  createVendor(data: {
    organizationId: string;
    name: string;
    type: string;
    contactEmail?: string;
    contactPhone?: string;
  }): Promise<VendorPortalVendorRow>;
  updateVendor(
    id: string,
    data: {
      name?: string;
      type?: string;
      contactEmail?: string;
      contactPhone?: string;
    },
  ): Promise<VendorPortalVendorRow>;
  findBidForVendor(vendorId: string, bidId: string): Promise<VendorBidRow | null>;
  updateBid(
    id: string,
    data: {
      status?: string;
      notes?: string;
      bidAmount?: bigint;
    },
  ): Promise<VendorBidRow>;
};
