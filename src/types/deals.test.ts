import {
  DealStatus,
  DealInvitationStatus,
  InvestmentCommitmentCurrency,
  InvestmentCommitmentType,
  InvestmentCommitmentStatus,
  DealMessageSource,
  Deal,
  Project,
  DealInvitation,
  InvestmentCommitment,
  DealMessage,
  BusinessCard,
  generateDealSlug,
  formatDecimalPrecision,
  isValidDecimal,
} from './deals';

describe('Deals Type Definitions & Enum Completeness', () => {
  describe('Enum Completeness', () => {
    test('DealStatus contains all required statuses', () => {
      const expectedStatuses = ['draft', 'published', 'funding', 'closed', 'archived'];
      const actualValues = Object.values(DealStatus);
      expect(actualValues).toHaveLength(5);
      expect(actualValues).toEqual(expect.arrayContaining(expectedStatuses));
    });

    test('DealInvitationStatus contains all required statuses', () => {
      const expectedStatuses = ['pending', 'declined', 'interested'];
      const actualValues = Object.values(DealInvitationStatus);
      expect(actualValues).toHaveLength(3);
      expect(actualValues).toEqual(expect.arrayContaining(expectedStatuses));
    });

    test('InvestmentCommitmentCurrency contains all supported currencies', () => {
      const expectedCurrencies = ['USD', 'CAD', 'EUR', 'GBP'];
      const actualValues = Object.values(InvestmentCommitmentCurrency);
      expect(actualValues).toHaveLength(4);
      expect(actualValues).toEqual(expect.arrayContaining(expectedCurrencies));
    });

    test('InvestmentCommitmentType contains percentage and fixed', () => {
      const expectedTypes = ['percentage', 'fixed'];
      const actualValues = Object.values(InvestmentCommitmentType);
      expect(actualValues).toHaveLength(2);
      expect(actualValues).toEqual(expect.arrayContaining(expectedTypes));
    });

    test('InvestmentCommitmentStatus contains pending, confirmed, withdrawn', () => {
      const expectedStatuses = ['pending', 'confirmed', 'withdrawn'];
      const actualValues = Object.values(InvestmentCommitmentStatus);
      expect(actualValues).toHaveLength(3);
      expect(actualValues).toEqual(expect.arrayContaining(expectedStatuses));
    });

    test('DealMessageSource contains platform and email_inbound', () => {
      const expectedSources = ['platform', 'email_inbound'];
      const actualValues = Object.values(DealMessageSource);
      expect(actualValues).toHaveLength(2);
      expect(actualValues).toEqual(expect.arrayContaining(expectedSources));
    });
  });

  describe('Decimal Precision & Utility Functions', () => {
    test('formatDecimalPrecision formats numbers and strings to target decimal places', () => {
      expect(formatDecimalPrecision(150000.5, 2)).toBe('150000.50');
      expect(formatDecimalPrecision('25000.75', 2)).toBe('25000.75');
      expect(formatDecimalPrecision(0.1254, 4)).toBe('0.1254');
      expect(formatDecimalPrecision('0.155', 2)).toBe('0.16');
    });

    test('formatDecimalPrecision throws on invalid numeric input', () => {
      expect(() => formatDecimalPrecision('invalid')).toThrow(TypeError);
    });

    test('isValidDecimal correctly identifies valid decimal strings and numbers', () => {
      expect(isValidDecimal(100)).toBe(true);
      expect(isValidDecimal('250000.00')).toBe(true);
      expect(isValidDecimal('0')).toBe(true);
      expect(isValidDecimal('-500.25')).toBe(true);

      expect(isValidDecimal(NaN)).toBe(false);
      expect(isValidDecimal(Infinity)).toBe(false);
      expect(isValidDecimal('abc')).toBe(false);
      expect(isValidDecimal('')).toBe(false);
    });

    test('generateDealSlug strips spaces and non-alphanumeric characters', () => {
      expect(generateDealSlug('123 Main St, Austin, TX 78701')).toBe('123mainstaustintx78701');
      expect(generateDealSlug('  456 Oak Avenue #2B  ')).toBe('456oakavenue2b');
      expect(generateDealSlug('')).toBe('');
    });
  });

  describe('Strict Null Checks & Interface Compliance', () => {
    test('instantiates a valid Deal entity', () => {
      const deal: Deal = {
        id: 'deal-uuid-1',
        slug: '100wallstreetnewyorkny',
        address: '100 Wall Street, New York, NY',
        purchasePrice: formatDecimalPrecision(1200000.00, 2),
        rehabCost: formatDecimalPrecision(150000.00, 2),
        arv: formatDecimalPrecision(1650000.00, 2),
        holdingCosts: formatDecimalPrecision(30000.00, 2),
        projectedRoi: formatDecimalPrecision(0.1850, 4),
        status: DealStatus.FUNDING,
        creatorId: 'user-creator-1',
        projectIds: ['proj-1', 'proj-2'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(deal.id).toBe('deal-uuid-1');
      expect(deal.slug).toBe('100wallstreetnewyorkny');
      expect(deal.status).toBe('funding');
      expect(isValidDecimal(deal.purchasePrice)).toBe(true);
    });

    test('instantiates a valid Project entity with nullable dealId and investorId', () => {
      const project: Project = {
        id: 'proj-uuid-1',
        name: 'Austin Multifamily Rehab',
        investorId: 'inv-user-1',
        dealId: 'deal-uuid-1',
        status: 'active',
        createdAt: new Date().toISOString(),
      };

      const standaloneProject: Project = {
        id: 'proj-uuid-2',
        name: 'Independent Flip',
        investorId: null,
        dealId: null,
        status: 'planning',
        createdAt: new Date().toISOString(),
      };

      expect(project.investorId).toBe('inv-user-1');
      expect(standaloneProject.investorId).toBeNull();
      expect(standaloneProject.dealId).toBeNull();
    });

    test('instantiates a valid DealInvitation with nullable inviteeUserId', () => {
      const internalInvite: DealInvitation = {
        id: 'inv-1',
        dealId: 'deal-uuid-1',
        inviteeEmail: 'investor@example.com',
        inviteeUserId: 'user-123',
        status: DealInvitationStatus.INTERESTED,
        businessCardShared: true,
        createdAt: new Date().toISOString(),
      };

      const externalInvite: DealInvitation = {
        id: 'inv-2',
        dealId: 'deal-uuid-1',
        inviteeEmail: 'external@prospect.com',
        inviteeUserId: null,
        status: DealInvitationStatus.PENDING,
        businessCardShared: false,
        createdAt: new Date().toISOString(),
      };

      expect(internalInvite.inviteeUserId).toBe('user-123');
      expect(externalInvite.inviteeUserId).toBeNull();
    });

    test('instantiates a valid InvestmentCommitment entity', () => {
      const commitment: InvestmentCommitment = {
        id: 'commit-1',
        dealId: 'deal-uuid-1',
        investorId: 'user-investor-1',
        amount: formatDecimalPrecision(50000.00, 2),
        currency: InvestmentCommitmentCurrency.USD,
        type: InvestmentCommitmentType.FIXED,
        status: InvestmentCommitmentStatus.CONFIRMED,
        createdAt: new Date().toISOString(),
      };

      expect(commitment.amount).toBe('50000.00');
      expect(commitment.currency).toBe('USD');
      expect(commitment.type).toBe('fixed');
      expect(commitment.status).toBe('confirmed');
    });

    test('instantiates a valid DealMessage entity with nullable senderId', () => {
      const message: DealMessage = {
        id: 'msg-1',
        dealId: 'deal-uuid-1',
        senderId: null,
        senderEmail: 'inbound@external.com',
        content: 'Is seller financing available for this deal?',
        source: DealMessageSource.EMAIL_INBOUND,
        createdAt: new Date().toISOString(),
      };

      expect(message.senderId).toBeNull();
      expect(message.source).toBe('email_inbound');
    });

    test('instantiates a valid BusinessCard entity with nullable phone, company, and criteria', () => {
      const card: BusinessCard = {
        id: 'card-1',
        userId: 'user-1',
        name: 'Jane Doe',
        email: 'jane@acmeinvestments.com',
        phone: '+1-555-0199',
        company: 'Acme Capital',
        investmentCriteria: {
          minRoi: 0.15,
          maxRehabBudget: 200000,
          targetMarkets: ['Austin', 'Dallas'],
        },
        isPublic: true,
      };

      expect(card.phone).toBe('+1-555-0199');
      expect(card.company).toBe('Acme Capital');
      expect(card.isPublic).toBe(true);
      expect(card.investmentCriteria?.minRoi).toBe(0.15);
    });
  });
});
