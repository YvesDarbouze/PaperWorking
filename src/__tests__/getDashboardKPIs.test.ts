/** @jest-environment node */
import { getDashboardKPIs } from '../actions/getDashboardKPIs';
import { calculatePortfolioSummary } from '@/lib/analyticsUtils';

// Mocks
const mockVerifyIdToken = jest.fn();
const mockGet = jest.fn();
const mockWhere = jest.fn().mockReturnThis();

const mockCollection = {
  doc: jest.fn().mockImplementation(() => ({
    get: mockGet,
  })),
  where: mockWhere,
  get: mockGet,
};

jest.mock('@/lib/firebase/admin', () => ({
  __esModule: true,
  adminAuth: {
    verifyIdToken: (...args: any[]) => mockVerifyIdToken(...args),
  },
  adminDb: {
    collection: (name: string) => mockCollection,
  },
}));

const mockCookieGet = jest.fn();
jest.mock('next/headers', () => ({
  __esModule: true,
  cookies: jest.fn(() => ({
    get: mockCookieGet,
  })),
}));

jest.mock('@/lib/analyticsUtils', () => ({
  __esModule: true,
  calculatePortfolioSummary: jest.fn(),
}));

describe('getDashboardKPIs Server Action', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockReset();
    mockVerifyIdToken.mockReset();
    mockCookieGet.mockReset();
    mockWhere.mockClear();

    process.env = {
      ...originalEnv,
      FIREBASE_PROJECT_ID: 'mock-proj',
      FIREBASE_CLIENT_EMAIL: 'mock-email@example.com',
      FIREBASE_PRIVATE_KEY: 'mock-key',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns empty KPIs if Firebase Admin credentials are missing in env', async () => {
    delete process.env.FIREBASE_PROJECT_ID;
    const result = await getDashboardKPIs();
    expect(result.avgGrossProfit).toBe(0);
    expect(mockCookieGet).not.toHaveBeenCalled();
  });

  it('returns empty KPIs if __session cookie is missing', async () => {
    mockCookieGet.mockReturnValue(undefined);
    const result = await getDashboardKPIs();
    expect(result.avgGrossProfit).toBe(0);
    expect(mockVerifyIdToken).not.toHaveBeenCalled();
  });

  it('returns empty KPIs if token verification fails', async () => {
    mockCookieGet.mockReturnValue({ value: 'invalid-session' });
    mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'));
    const result = await getDashboardKPIs();
    expect(result.avgGrossProfit).toBe(0);
  });

  it('returns empty KPIs if user has no organizationId', async () => {
    mockCookieGet.mockReturnValue({ value: 'valid-session' });
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-123' });
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ organizationId: undefined }),
    });

    const result = await getDashboardKPIs();
    expect(result.avgGrossProfit).toBe(0);
  });

  it('returns empty KPIs if organizationId is org_placeholder', async () => {
    mockCookieGet.mockReturnValue({ value: 'valid-session' });
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-123' });
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ organizationId: 'org_placeholder' }),
    });

    const result = await getDashboardKPIs();
    expect(result.avgGrossProfit).toBe(0);
  });

  it('successfully fetches projects and returns calculated portfolio summary KPIs', async () => {
    mockCookieGet.mockReturnValue({ value: 'valid-session' });
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-123' });
    
    // User profile doc mock
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ organizationId: 'org-real-123' }),
    });

    // Projects collection query mock
    const mockProjects = [
      { id: 'p1', propertyName: 'Project 1' },
      { id: 'p2', propertyName: 'Project 2' },
    ];
    mockGet.mockResolvedValueOnce({
      docs: mockProjects.map(p => ({
        id: p.id,
        data: () => p,
      })),
    });

    // Mock calculations return
    (calculatePortfolioSummary as jest.Mock).mockReturnValue({
      avgGrossProfit: 85000,
      avgROI: 18.2,
      medianResalePrice: 320000,
      activeCapitalDeployed: 950000,
      soldCount: 2,
      activeCount: 4,
      totalPortfolioValue: 1280000,
    });

    const result = await getDashboardKPIs();

    expect(mockWhere).toHaveBeenCalledWith('organizationId', '==', 'org-real-123');
    expect(calculatePortfolioSummary).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'p1', propertyName: 'Project 1' }),
        expect.objectContaining({ id: 'p2', propertyName: 'Project 2' }),
      ])
    );
    expect(result).toEqual({
      avgGrossProfit: 85000,
      avgROI: 18.2,
      medianResalePrice: 320000,
      activeCapitalDeployed: 950000,
      soldCount: 2,
      activeCount: 4,
      totalPortfolioValue: 1280000,
      debtServiceMtd: 0,
      operatingExpensesMtd: 0,
      rentalIncomeMtd: 0,
      unattributedTxCount: 0,
    });
  });

  it('returns empty KPIs if fetching data throws an error', async () => {
    mockCookieGet.mockReturnValue({ value: 'valid-session' });
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-123' });
    mockGet.mockRejectedValue(new Error('Firestore error'));

    const result = await getDashboardKPIs();
    expect(result.avgGrossProfit).toBe(0);
  });
});
