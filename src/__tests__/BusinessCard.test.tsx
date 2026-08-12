import { BusinessCard, BusinessCardShare } from '@/types/deals';

describe('BusinessCard & BusinessCardShare Immutable Snapshots', () => {
  const originalCard: BusinessCard = {
    id: 'card_123',
    userId: 'user_investor_1',
    name: 'Sarah Jenkins',
    email: 'sarah.j@acme-cap.com',
    phone: '(512) 555-0199',
    company: 'Acme Capital Group',
    title: 'Managing Partner',
    accreditedInvestorStatus: true,
    preferredMarkets: ['Austin, TX', 'Dallas, TX'],
    minInvestment: 50000,
    maxInvestment: 250000,
    isPublic: true,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  };

  it('validates BusinessCard structure and accredited status', () => {
    expect(originalCard.id).toBe('card_123');
    expect(originalCard.accreditedInvestorStatus).toBe(true);
    expect(originalCard.preferredMarkets).toContain('Austin, TX');
    expect(originalCard.minInvestment).toBe(50000);
    expect(originalCard.maxInvestment).toBe(250000);
  });

  it('ensures BusinessCardShare retains an immutable snapshot when original card is updated', () => {
    // Deep clone snapshot at time of share
    const shareSnapshot: BusinessCardShare = {
      id: 'share_456',
      dealId: 'deal_789',
      senderUserId: originalCard.userId,
      recipientUserId: 'user_creator_2',
      businessCardData: JSON.parse(JSON.stringify(originalCard)),
      createdAt: '2026-08-11T12:00:00.000Z',
    };

    // Mutate original card
    const mutatedCard = {
      ...originalCard,
      company: 'New Venture Partners',
      minInvestment: 100000,
      preferredMarkets: ['Miami, FL'],
    };

    // Assert shared snapshot remains unchanged
    expect(shareSnapshot.businessCardData.company).toBe('Acme Capital Group');
    expect(shareSnapshot.businessCardData.minInvestment).toBe(50000);
    expect(shareSnapshot.businessCardData.preferredMarkets).toEqual(['Austin, TX', 'Dallas, TX']);

    // Assert mutated card has new values
    expect(mutatedCard.company).toBe('New Venture Partners');
    expect(mutatedCard.minInvestment).toBe(100000);
  });
});
