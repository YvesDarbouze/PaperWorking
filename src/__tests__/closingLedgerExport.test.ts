import { GET } from '@/app/api/reil/projects/[id]/closing-ledger/export/route';
import { NextRequest } from 'next/server';

// Mock variables
const mockVerifyIdToken = jest.fn();
const mockGet = jest.fn();
const mockSet = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockCapture = jest.fn();

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifyIdToken: (...args: any[]) => mockVerifyIdToken(...args),
  },
  adminDb: {
    collection: jest.fn().mockImplementation(() => ({
      doc: jest.fn().mockImplementation((docId) => ({
        get: (...args: any[]) => mockGet(...args),
        set: (...args: any[]) => mockSet(docId, ...args),
        update: (...args: any[]) => mockUpdate(docId, ...args),
        delete: (...args: any[]) => mockDelete(docId, ...args),
      })),
    })),
  },
}));

jest.mock('@/lib/telemetry', () => ({
  telemetry: {
    capture: (...args: any[]) => mockCapture(...args),
  },
}));

describe('Closing Ledger Export API Route', () => {
  const projectId = 'project_test_123';
  const routeParams = { params: Promise.resolve({ id: projectId }) };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects unauthenticated requests with 401', async () => {
    const req = new NextRequest(`http://localhost/api/reil/projects/${projectId}/closing-ledger/export?format=csv`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer invalid-token',
      },
    });
    mockVerifyIdToken.mockRejectedValueOnce(new Error('Invalid token'));

    const res = await GET(req, routeParams);
    expect(res.status).toBe(401);
  });

  it('rejects non-member and non-owner access with 403', async () => {
    const req = new NextRequest(`http://localhost/api/reil/projects/${projectId}/closing-ledger/export?format=csv`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer valid-token',
      },
    });
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'intruder_456' });
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        ownerUid: 'owner_123',
        members: {
          collab_789: true,
        },
      }),
    });

    const res = await GET(req, routeParams);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Access denied');
  });

  it('exports CSV format for project owner with correct headers, filename, data, and overrides', async () => {
    const req = new NextRequest(`http://localhost/api/reil/projects/${projectId}/closing-ledger/export?format=csv`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer valid-token',
      },
    });
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'owner_123' });
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        ownerUid: 'owner_123',
        address: '123 Main St, Anytown, USA',
        financials: {
          purchasePrice: 300000,
          loanAmount: 240000,
          loanInterestRate: 6.5,
          loanOriginationPoints: 1.0,
          closingCostOverrides: {
            transferTax: 1200,
          },
        },
      }),
    });

    const res = await GET(req, routeParams);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/csv');
    expect(res.headers.get('Content-Disposition')).toContain(`closing-ledger-123-main-st-anytown-usa-`);

    const text = await res.text();
    // Verify headers
    expect(text).toContain('"Line Item","Type","Computed ($)","Override ($)","Amount ($)"');
    // Verify computed origination fee: 240000 * 1% = 2400
    expect(text).toContain('"Origination Fees","Computed","2400.00","","2400.00"');
    // Verify overridden transfer tax: computed is 300000 * 0.1% = 300, override is 1200
    expect(text).toContain('"Transfer Tax","Overridden","300.00","1200.00","1200.00"');
    // Verify total includes the overridden amount
    // computed title: 300000 * 0.4% = 1200
    // prepaids: daily interest (240000 * 6.5% / 365 * 15 = 641) + insurance (300000 * 0.5% / 12 = 125) + taxes (300000 * 1.25% / 12 * 3 = 938) = 1704
    // total = 2400 + 1200 + 1200 (override) + 1704 = 6504
    expect(text).toContain('"TOTAL","6504.00"');

    // Telemetry check
    expect(mockCapture).toHaveBeenCalledWith(expect.objectContaining({
      event: 'closing_ledger_exported',
      properties: expect.objectContaining({
        projectId,
        format: 'csv',
      }),
    }));

    // Ensure absolutely NO writes occurred
    expect(mockSet).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('exports PDF format for project members with correct headers, filename, and PDF bytes', async () => {
    const req = new NextRequest(`http://localhost/api/reil/projects/${projectId}/closing-ledger/export?format=pdf`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer valid-token',
      },
    });
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'member_789' });
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        ownerUid: 'owner_123',
        members: {
          member_789: true,
        },
        address: '123 Main St, Anytown, USA',
        financials: {
          purchasePrice: 300000,
          loanAmount: 240000,
          loanInterestRate: 6.5,
          loanOriginationPoints: 1.0,
        },
      }),
    });

    const res = await GET(req, routeParams);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('application/pdf');
    expect(res.headers.get('Content-Disposition')).toContain(`closing-ledger-123-main-st-anytown-usa-`);

    const buffer = await res.arrayBuffer();
    expect(buffer.byteLength).toBeGreaterThan(0);

    // Telemetry check
    expect(mockCapture).toHaveBeenCalledWith(expect.objectContaining({
      event: 'closing_ledger_exported',
      properties: expect.objectContaining({
        projectId,
        format: 'pdf',
      }),
    }));

    // Ensure absolutely NO writes occurred
    expect(mockSet).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
  });
});
