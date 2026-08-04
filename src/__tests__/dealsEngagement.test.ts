import {
  generateInvitationToken,
  validateInvitationToken,
  revokeInvitation,
  validateInvestmentIntent,
  sanitizePublicTeaser,
  DealInvitation,
} from '@/lib/deals/engagementUtils';

describe('Deal Engagement, Token Invitations & Waitlist Utilities (PROMPT 4)', () => {
  describe('Invitation Tokens & Expiry', () => {
    it('generates a secure token with 30-day expiry date', () => {
      const invite = generateInvitationToken(
        'deal_austin_123',
        'partner@investor.com',
        'sender_456',
        'Marcus Aurelius'
      );

      expect(invite.token).toBeDefined();
      expect(invite.token.length).toBe(48); // hex 24 bytes
      expect(invite.invitedEmail).toBe('partner@investor.com');
      expect(invite.status).toBe('PENDING');

      const now = new Date();
      const expiresAt = new Date(invite.expiresAt);
      const diffDays = Math.round((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(30);

      const validation = validateInvitationToken(invite);
      expect(validation.valid).toBe(true);
    });

    it('rejects expired invitation tokens', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const expiredInvite: DealInvitation = {
        id: 'inv_123',
        dealId: 'deal_123',
        dealSlug: 'deal_123',
        token: 'tok_expired',
        invitedEmail: 'test@example.com',
        senderUserId: 'sender_1',
        senderName: 'Sender',
        status: 'PENDING',
        createdAt: pastDate,
        expiresAt: pastDate,
      };

      const validation = validateInvitationToken(expiredInvite);
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('expired');
    });

    it('handles explicit revocation by deal owner', () => {
      const invite = generateInvitationToken('deal_123', 'invitee@test.com', 'user_1', 'Owner');
      const revoked = revokeInvitation(invite);

      expect(revoked.status).toBe('REVOKED');
      expect(revoked.revokedAt).toBeDefined();

      const validation = validateInvitationToken(revoked);
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('revoked');
    });
  });

  describe('Investment Intent Validation (XOR & Over-Commit Waitlist)', () => {
    it('accepts valid currency amount intent when below target', () => {
      const res = validateInvestmentIntent(200000, 130000, 'USD', undefined, 25000);
      expect(res.valid).toBe(true);
      expect(res.status).toBe('COMMITTED');
      expect(res.calculatedAmount).toBe(25000);
    });

    it('accepts valid percentage intent (XOR)', () => {
      const res = validateInvestmentIntent(200000, 100000, 'USD', 10, undefined);
      expect(res.valid).toBe(true);
      expect(res.status).toBe('COMMITTED');
      expect(res.calculatedAmount).toBe(20000);
    });

    it('rejects specifying BOTH percentage and currency amount (XOR violation)', () => {
      const res = validateInvestmentIntent(200000, 100000, 'USD', 10, 20000);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('EITHER a percentage OR a currency amount');
    });

    it('rejects specifying NEITHER percentage nor currency amount', () => {
      const res = validateInvestmentIntent(200000, 100000, 'USD', undefined, undefined);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('EITHER a percentage OR a currency amount');
    });

    it('places investor on WAITLIST state when target is fully committed', () => {
      const res = validateInvestmentIntent(200000, 200000, 'USD', undefined, 25000);
      expect(res.valid).toBe(true);
      expect(res.status).toBe('WAITLIST');
      expect(res.calculatedAmount).toBe(25000);
    });

    it('places investor on WAITLIST state when amount exceeds remaining target', () => {
      const res = validateInvestmentIntent(200000, 190000, 'USD', undefined, 25000);
      expect(res.valid).toBe(true);
      expect(res.status).toBe('WAITLIST');
    });
  });

  describe('Public Teaser Sanitizer', () => {
    it('sanitizes deal into public-safe teaser concealing private data', () => {
      const fullDeal = {
        displayAddress: '123 Main St, Austin, TX 78701',
        city: 'Austin',
        state: 'TX',
        assetClass: 'Multi-Family',
        fundingTarget: 200000,
        committedAmount: 130000,
        status: 'LISTED',
        price: 350000,
        // Sensitive fields
        investorList: [{ name: 'Secret Investor', amount: 50000 }],
        ownerEmail: 'owner@secret.com',
      };

      const sanitized = sanitizePublicTeaser(fullDeal);
      expect(sanitized.displayAddress).toBe('123 Main St, Austin, TX 78701');
      expect(sanitized.percentFunded).toBe(65);
      expect((sanitized as any).investorList).toBeUndefined();
      expect((sanitized as any).ownerEmail).toBeUndefined();
    });
  });
});
