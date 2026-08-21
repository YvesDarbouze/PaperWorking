import { handleVendorsGet, type VendorRecord } from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import { SEED_MARKETPLACE_VENDORS } from '@/lib/marketplace/seed-data';
import {
  isDevAuthFailure,
  requireDevSessionAuth,
} from '@/lib/projects/dev-session-auth';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const auth = await requireDevSessionAuth();

  const result = await handleVendorsGet(
    {
      state: url.searchParams.get('state'),
      type: url.searchParams.get('type'),
      search: url.searchParams.get('search'),
      query: url.searchParams.get('query'),
      location: url.searchParams.get('location'),
      city: url.searchParams.get('city'),
      zip: url.searchParams.get('zip'),
      id: url.searchParams.get('id'),
    },
    {
      requireAuth: async () => {
        if (isDevAuthFailure(auth)) return auth;
        return { uid: auth.uid };
      },
      getVendorById: async (id) => {
        const match = SEED_MARKETPLACE_VENDORS.find((v) => v.id === id || v.uid === id);
        return (match as VendorRecord | undefined) ?? null;
      },
      listVendors: async ({ type }) => {
        let vendors = SEED_MARKETPLACE_VENDORS as VendorRecord[];
        if (type && type !== 'All') {
          const needle = type.toLowerCase();
          vendors = vendors.filter((v) => {
            const vendorType = String(v.type ?? '').toLowerCase();
            if (needle === 'lawyer') return vendorType === 'lawyer' || vendorType === 'attorney';
            if (needle === 'listing agent') {
              return vendorType === 'listing agent' || vendorType === 'agent';
            }
            return vendorType === needle;
          });
        }
        return vendors;
      },
    },
  );

  return toNextResponse(result);
}
