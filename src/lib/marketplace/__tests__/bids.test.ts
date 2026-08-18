import {
  createBidRequest,
  submitBidResponse,
  acceptBid,
  toggleStandardUserVendorStatus,
} from '../bidding';

describe('Agent 6: Vendor Marketplace & Bidding System Unit Tests', () => {
  test('1. createBidRequest initializes a pending bid request with required fields', () => {
    const bid = createBidRequest({
      projectId: 'proj_test_100',
      projectName: '100 Ocean Drive',
      senderId: 'user_owner_1',
      senderName: 'Jane Owner',
      vendorId: 'vendor_attorney_1',
      vendorName: 'Apex Legal Group',
      serviceType: 'Real Estate Attorney',
      description: 'Review title and closing documents for purchase phase',
      budgetMax: 2000,
      deadline: '2026-09-01',
    });

    expect(bid.bidId).toContain('bid_');
    expect(bid.status).toBe('pending');
    expect(bid.serviceType).toBe('Real Estate Attorney');
    expect(bid.budgetMax).toBe(2000);
  });

  test('2. submitBidResponse updates bid with amount, timeline, and submitted status', () => {
    const initialBid = createBidRequest({
      projectId: 'proj_test_100',
      projectName: '100 Ocean Drive',
      senderId: 'user_owner_1',
      senderName: 'Jane Owner',
      vendorId: 'vendor_attorney_1',
      vendorName: 'Apex Legal Group',
      serviceType: 'Real Estate Attorney',
      description: 'Title review',
    });

    const submittedBid = submitBidResponse(initialBid, 1850, '3 Business Days', 'Ready to proceed.');
    expect(submittedBid.status).toBe('submitted');
    expect(submittedBid.bidAmount).toBe(1850);
    expect(submittedBid.estimatedTimeline).toBe('3 Business Days');
  });

  test('3. acceptBid creates expense record and flags 1099-NEC when cumulative payments exceed $600', () => {
    const initialBid = createBidRequest({
      projectId: 'proj_test_100',
      projectName: '100 Ocean Drive',
      senderId: 'user_owner_1',
      senderName: 'Jane Owner',
      vendorId: 'vendor_contractor_1',
      vendorName: 'BuildRight Construction',
      serviceType: 'General Contractor',
      description: 'Rehab labor',
    });

    const submittedBid = submitBidResponse(initialBid, 4500, '14 Days');
    const { acceptedBid, expenseRecord, requires1099Flag } = acceptBid(submittedBid, 200); // 200 prior + 4500 = 4700 > 600

    expect(acceptedBid.status).toBe('accepted');
    expect(expenseRecord.amount).toBe(4500);
    expect(expenseRecord.vendorId).toBe('vendor_contractor_1');
    expect(requires1099Flag).toBe(true);
    expect(expenseRecord.requires1099NEC).toBe(true);
  });

  test('4. acceptBid does NOT flag 1099-NEC if cumulative payments are under $600', () => {
    const initialBid = createBidRequest({
      projectId: 'proj_test_100',
      projectName: '100 Ocean Drive',
      senderId: 'user_owner_1',
      senderName: 'Jane Owner',
      vendorId: 'vendor_handyman_1',
      vendorName: 'Handyman Dave',
      serviceType: 'Handyman',
      description: 'Fix door lock',
    });

    const submittedBid = submitBidResponse(initialBid, 250, '1 Day');
    const { requires1099Flag } = acceptBid(submittedBid, 100); // 100 + 250 = 350 < 600

    expect(requires1099Flag).toBe(false);
  });

  test('5. toggleStandardUserVendorStatus enables dual-role functionality for Standard users', () => {
    const vendorProfile = toggleStandardUserVendorStatus(
      {},
      true,
      ['Inspector', 'Handyman'],
      85
    );

    expect(vendorProfile.availableForHire).toBe(true);
    expect(vendorProfile.services).toContain('Inspector');
    expect(vendorProfile.hourlyRate).toBe(85);
    expect(vendorProfile.roleBadge).toBe('Standard Collaborator');
  });
});
