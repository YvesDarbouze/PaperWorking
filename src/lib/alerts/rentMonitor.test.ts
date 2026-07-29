/** @jest-environment node */
import { checkMissingRent } from './rentMonitor';
import { adminDb } from '@/lib/firebase/admin';
import prisma from '@/lib/prisma';

// Mock Firebase Admin Db
const mockGetDoc = jest.fn();
const mockGetAlerts = jest.fn();
const mockDocSet = jest.fn();
const mockDocUpdate = jest.fn();

jest.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: (col: string) => {
      if (col === 'projects') {
        return {
          doc: (id: string) => ({
            get: () => mockGetDoc(id),
          }),
        };
      }
      if (col === 'inboxItems') {
        return {
          where: () => ({
            where: () => ({
              where: () => ({
                where: () => ({
                  get: mockGetAlerts,
                }),
              }),
            }),
          }),
          doc: (id: string) => ({
            set: mockDocSet,
          }),
        };
      }
      if (col === 'users') {
        return {
          where: () => ({
            limit: () => ({
              get: jest.fn().mockResolvedValue({
                empty: false,
                docs: [{ id: 'mock-user-id' }],
              }),
            }),
          }),
        };
      }
      return {};
    },
  },
}));

// Mock Prisma Client
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    transaction: {
      findFirst: jest.fn(),
    },
  },
}));

describe('checkMissingRent Engine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fires alert if no rent transaction exists (Test Case 1)', async () => {
    // Mock project data: dispositionType RENT, phase hold, subStrategy Long-Term
    mockGetDoc.mockResolvedValue({
      exists: true,
      data: () => ({
        id: 'proj_1',
        address: '123 Main St',
        dispositionType: 'RENT',
        phase: 'hold',
        subStrategy: 'Long-Term',
        propertyName: 'Elm St Rehab',
        organizationId: 'org_abc',
        financials: {
          monthlyGrossRent: 2500, // $2,500
        },
      }),
    });

    // Mock no transactions found
    (prisma.transaction.findFirst as jest.Mock).mockResolvedValue(null);

    // Mock no existing alert
    mockGetAlerts.mockResolvedValue({
      empty: true,
      docs: [],
    });

    const result = await checkMissingRent('proj_1');
    expect(result).toBe(true);
    expect(mockDocSet).toHaveBeenCalled();
  });

  it('does NOT fire alert if rent transaction exists (Test Case 2)', async () => {
    mockGetDoc.mockResolvedValue({
      exists: true,
      data: () => ({
        id: 'proj_1',
        address: '123 Main St',
        dispositionType: 'RENT',
        phase: 'hold',
        subStrategy: 'Long-Term',
        propertyName: 'Elm St Rehab',
        organizationId: 'org_abc',
        financials: {
          monthlyGrossRent: 2500,
        },
      }),
    });

    // Mock transaction exists
    (prisma.transaction.findFirst as jest.Mock).mockResolvedValue({
      plaidId: 'rent_1',
      amount: BigInt(250000),
      date: new Date(),
      reiCategory: 'rental_income',
    });

    const result = await checkMissingRent('proj_1');
    expect(result).toBe(false);
    expect(mockDocSet).not.toHaveBeenCalled();
  });

  it('does NOT fire alert for short-term rental Airbnb (Test Case 3)', async () => {
    mockGetDoc.mockResolvedValue({
      exists: true,
      data: () => ({
        id: 'proj_1',
        address: '123 Main St',
        dispositionType: 'RENT',
        phase: 'hold',
        subStrategy: 'Airbnb',
        propertyName: 'Elm St Rehab',
        organizationId: 'org_abc',
        financials: {
          monthlyGrossRent: 2500,
        },
      }),
    });

    const result = await checkMissingRent('proj_1');
    expect(result).toBe(false);
    expect(mockDocSet).not.toHaveBeenCalled();
  });

  it('does NOT fire alert for non-rental property Sale (Test Case 4)', async () => {
    mockGetDoc.mockResolvedValue({
      exists: true,
      data: () => ({
        id: 'proj_1',
        address: '123 Main St',
        dispositionType: 'SALE',
        phase: 'hold',
        subStrategy: 'Long-Term',
        propertyName: 'Elm St Rehab',
        organizationId: 'org_abc',
        financials: {
          monthlyGrossRent: 2500,
        },
      }),
    });

    const result = await checkMissingRent('proj_1');
    expect(result).toBe(false);
    expect(mockDocSet).not.toHaveBeenCalled();
  });

  it('deduplicates alerts if an active alert already exists', async () => {
    mockGetDoc.mockResolvedValue({
      exists: true,
      data: () => ({
        id: 'proj_1',
        address: '123 Main St',
        dispositionType: 'RENT',
        phase: 'hold',
        subStrategy: 'Long-Term',
        propertyName: 'Elm St Rehab',
        organizationId: 'org_abc',
        financials: {
          monthlyGrossRent: 2500,
        },
      }),
    });

    (prisma.transaction.findFirst as jest.Mock).mockResolvedValue(null);

    // Mock an existing unresolved alert
    mockGetAlerts.mockResolvedValue({
      empty: false,
      docs: [
        {
          id: 'existing_alert_id',
          ref: {
            update: mockDocUpdate,
          },
        },
      ],
    });

    const result = await checkMissingRent('proj_1');
    expect(result).toBe(true);
    expect(mockDocUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        updatedAt: expect.any(Date),
      })
    );
    expect(mockDocSet).not.toHaveBeenCalled();
  });
});
