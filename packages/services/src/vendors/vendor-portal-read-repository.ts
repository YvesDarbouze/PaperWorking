export type VendorPortalVendorRow = {
  id: string;
  organizationId: string;
  name: string;
  type: string;
  contactEmail: string | null;
  contactPhone: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type VendorBidRow = {
  id: string;
  vendorId: string;
  milestoneId: string;
  bidAmount: bigint;
  status: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type VendorPortalReadRepository = {
  findVendorByContactEmail(email: string): Promise<VendorPortalVendorRow | null>;
  listVendorBids(vendorId: string): Promise<VendorBidRow[]>;
};
