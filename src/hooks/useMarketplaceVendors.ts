'use client';

import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

/**
 * Slot key → vendor service type mapping.
 *
 * Maps F4 team slots to the VendorType values used in vendor profiles,
 * so the RFP issuing panel can search for vendors matching the slot's
 * service category.
 */
const SLOT_TO_VENDOR_TYPE: Record<string, string> = {
  f4TitleEscrowVendor: 'Title',
  f4ClosingAttorneyVendor: 'Lawyer',
  f4AppraiserVendor: 'Appraiser',
  f4EnvironmentalVendor: 'Inspector', // closest match
  f4SurveyorVendor: 'Inspector',
  f4InsuranceBrokerVendor: 'Insurance',
  f4CdcVendor: 'Lender',
  f4HardMoneyLenderVendor: 'Lender',
};

export interface MarketplaceVendorHit {
  uid: string;
  companyName: string;
  type: string;
  feeRangeLabel: string;
  avgTurnaroundDays: number;
  overallRating: number;
  totalReviews: number;
  availability: string;
  verified: boolean;
}

/**
 * Hook: search marketplace vendors by F4 slot key.
 *
 * Queries `users` for vendor profiles where `vendorProfile.type` matches
 * the slot's mapped service category. Returns up to 20 results.
 */
export function useMarketplaceVendors(slotKey: string | null) {
  const [vendors, setVendors] = useState<MarketplaceVendorHit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!slotKey) {
      setVendors([]);
      return;
    }

    const vendorType = SLOT_TO_VENDOR_TYPE[slotKey];
    if (!vendorType) {
      setVendors([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const q = query(
          collection(db, 'users'),
          where('vendorProfile.type', '==', vendorType),
          where('vendorProfile.verified', '==', true),
          limit(20)
        );
        const snap = await getDocs(q);

        if (cancelled) return;

        const hits: MarketplaceVendorHit[] = snap.docs
          .map((doc) => {
            const data = doc.data();
            const vp = data.vendorProfile || {};
            return {
              uid: doc.id,
              companyName: vp.companyName || data.displayName || 'Unknown',
              type: vp.type || vendorType,
              feeRangeLabel: vp.feeRangeLabel || 'Contact for pricing',
              avgTurnaroundDays: vp.avgTurnaroundDays || 0,
              overallRating: vp.overallRating || 0,
              totalReviews: vp.totalReviews || 0,
              availability: vp.availability || 'Available',
              verified: !!vp.verified,
            };
          })
          .filter((v) => !v.uid.startsWith('demo-')); // exclude demo vendors

        setVendors(hits);
      } catch (err) {
        console.error('[useMarketplaceVendors] Query failed:', err);
        setVendors([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slotKey]);

  return { vendors, loading };
}

/** Resolve a slot key to its service type label for display */
export function getSlotServiceType(slotKey: string): string {
  return SLOT_TO_VENDOR_TYPE[slotKey] || 'Other';
}

/** All slot keys with their human-readable labels */
export const SLOT_LABELS: Record<string, string> = {
  f4TitleEscrowVendor: 'Title / Escrow',
  f4ClosingAttorneyVendor: 'Closing Attorney',
  f4AppraiserVendor: 'Appraiser',
  f4EnvironmentalVendor: 'Environmental Consultant',
  f4SurveyorVendor: 'Surveyor',
  f4InsuranceBrokerVendor: 'Insurance Broker',
  f4CdcVendor: 'CDC (SBA 504)',
  f4HardMoneyLenderVendor: 'Private / Hard-Money Lender',
};
