export type VendorRow = {
  id: string;
  organizationId: string;
  name: string;
  type: string;
  contactEmail: string | null;
  contactPhone: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type VendorsReadRepository = {
  listVendors(input: { organizationIds: string[]; q?: string }): Promise<VendorRow[]>;
};
