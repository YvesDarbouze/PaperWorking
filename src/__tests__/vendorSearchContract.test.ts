import { filterVendorsBySearch, GET } from '@/app/api/vendors/route';
import { NextRequest } from 'next/server';

// Mock auth guard
jest.mock('@/lib/firebase-admin/auth-guard', () => ({
  requireAuth: jest.fn().mockResolvedValue({ uid: 'user_investor_1' }),
  isAuthError: jest.fn().mockReturnValue(false),
}));

// Mock Firestore adminDb
const mockVendorsList = [
  {
    id: 'vendor_apex_legal',
    companyName: 'Apex Legal Group',
    name: 'Apex Legal Group',
    type: 'Lawyer',
    accountType: 'vendor',
    subscriptionStatus: 'active',
    location: 'Miami, FL',
    city: 'Miami',
    licensingStates: ['FL', 'GA'],
    serviceAreas: ['33101', '33139', '33131'],
  },
  {
    id: 'vendor_cornerstone_inspections',
    companyName: 'Cornerstone Property Inspections',
    name: 'Cornerstone Property Inspections',
    type: 'Inspector',
    accountType: 'vendor',
    subscriptionStatus: 'active',
    location: 'Dallas, TX',
    city: 'Dallas',
    licensingStates: ['TX', 'OK'],
    serviceAreas: ['75201', '75204', '75219'],
  },
  {
    id: 'vendor_first_choice_lending',
    companyName: 'First Choice Capital Lending',
    name: 'First Choice Capital Lending',
    type: 'Lender',
    accountType: 'vendor',
    subscriptionStatus: 'active',
    location: 'Atlanta, GA',
    city: 'Atlanta',
    licensingStates: ['GA', 'FL'],
    serviceAreas: ['30301', '30308', '30309'],
  },
];

jest.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnThis(),
      get: jest.fn().mockImplementation(() =>
        Promise.resolve({
          docs: [
            {
              id: 'vendor_apex_legal',
              data: () => ({
                id: 'vendor_apex_legal',
                companyName: 'Apex Legal Group',
                name: 'Apex Legal Group',
                type: 'Lawyer',
                accountType: 'vendor',
                subscriptionStatus: 'active',
                location: 'Miami, FL',
                city: 'Miami',
                licensingStates: ['FL', 'GA'],
                serviceAreas: ['33101', '33139', '33131'],
              }),
            },
            {
              id: 'vendor_cornerstone_inspections',
              data: () => ({
                id: 'vendor_cornerstone_inspections',
                companyName: 'Cornerstone Property Inspections',
                name: 'Cornerstone Property Inspections',
                type: 'Inspector',
                accountType: 'vendor',
                subscriptionStatus: 'active',
                location: 'Dallas, TX',
                city: 'Dallas',
                licensingStates: ['TX', 'OK'],
                serviceAreas: ['75201', '75204', '75219'],
              }),
            },
            {
              id: 'vendor_first_choice_lending',
              data: () => ({
                id: 'vendor_first_choice_lending',
                companyName: 'First Choice Capital Lending',
                name: 'First Choice Capital Lending',
                type: 'Lender',
                accountType: 'vendor',
                subscriptionStatus: 'active',
                location: 'Atlanta, GA',
                city: 'Atlanta',
                licensingStates: ['GA', 'FL'],
                serviceAreas: ['30301', '30308', '30309'],
              }),
            },
          ],
        })
      ),
    }),
  },
}));

describe('BUG-008 — Vendor Search City vs ZIP Matching Contract', () => {
  describe('filterVendorsBySearch Logic', () => {
    it('matches exact ZIP code input (33101)', () => {
      const results = filterVendorsBySearch(mockVendorsList, '33101');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('vendor_apex_legal');
    });

    it('matches City name input (Miami) case-insensitively', () => {
      const resultsUpper = filterVendorsBySearch(mockVendorsList, 'Miami');
      const resultsLower = filterVendorsBySearch(mockVendorsList, 'miami');

      expect(resultsUpper).toHaveLength(1);
      expect(resultsUpper[0].id).toBe('vendor_apex_legal');
      expect(resultsLower).toHaveLength(1);
      expect(resultsLower[0].id).toBe('vendor_apex_legal');
    });

    it('matches City, State format input (Dallas, TX)', () => {
      const results = filterVendorsBySearch(mockVendorsList, 'Dallas, TX');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('vendor_cornerstone_inspections');
    });

    it('matches City name for Atlanta', () => {
      const results = filterVendorsBySearch(mockVendorsList, 'Atlanta');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('vendor_first_choice_lending');
    });

    it('returns all vendors for empty or whitespace query', () => {
      const results = filterVendorsBySearch(mockVendorsList, '   ');
      expect(results).toHaveLength(3);
    });

    it('returns empty array when query matches no vendor city or zip', () => {
      const results = filterVendorsBySearch(mockVendorsList, 'Seattle');
      expect(results).toHaveLength(0);
    });
  });

  describe('GET /api/vendors Endpoint Integration', () => {
    it('returns matching vendors when querying by location=Miami', async () => {
      const req = new NextRequest('http://localhost:3000/api/vendors?location=Miami');
      const res = await GET(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.vendors).toHaveLength(1);
      expect(json.vendors[0].id).toBe('vendor_apex_legal');
    });

    it('returns matching vendors when querying by zip=33101', async () => {
      const req = new NextRequest('http://localhost:3000/api/vendors?zip=33101');
      const res = await GET(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.vendors).toHaveLength(1);
      expect(json.vendors[0].id).toBe('vendor_apex_legal');
    });
  });
});
