import {
  determineEscalationOptions,
  containsUrgencyKeywords,
  formatTranscriptForHandoff,
} from '@/lib/assistant/escalation';
import { PEPPER_CONFIG } from '@/lib/assistant/config';

describe('Ava Tier-Aware Escalation & Business Rules (§6, §3.3)', () => {
  describe('Urgency Keyword Detection', () => {
    it('detects mid-closing and wire crisis keywords', () => {
      expect(containsUrgencyKeywords('We are mid-closing and the escrow wire is pending')).toBe(true);
      expect(containsUrgencyKeywords('Our deadline today is 5pm for loan commitment')).toBe(true);
      expect(containsUrgencyKeywords('Where do I send wire instructions?')).toBe(true);
      expect(containsUrgencyKeywords('How do I run the deal calculator?')).toBe(false);
    });
  });

  describe('Tier-Aware Routing Entitlements', () => {
    it('NEVER offers Priority Emergency Line to Investor or Vendor tiers', () => {
      const investorOptions = determineEscalationOptions({
        accountType: 'investor',
        userMessage: 'Urgent! We are mid-closing and need wire help!',
      });
      const hasInvestorPriority = investorOptions.some((o) => o.type === 'priority_line');
      expect(hasInvestorPriority).toBe(false);

      const vendorOptions = determineEscalationOptions({
        accountType: 'vendor',
        userMessage: 'Mid-closing urgency',
      });
      const hasVendorPriority = vendorOptions.some((o) => o.type === 'priority_line');
      expect(hasVendorPriority).toBe(false);
    });

    it('proactively offers Priority Emergency Line ONLY to Investment Team subscribers', () => {
      const teamOptions = determineEscalationOptions({
        accountType: 'investment_team',
        userMessage: 'We are mid-closing on our Austin project!',
      });

      const priorityOption = teamOptions.find((o) => o.type === 'priority_line');
      expect(priorityOption).toBeDefined();
      expect(priorityOption?.title).toContain('Emergency Priority Line');
      expect(priorityOption?.isUrgent).toBe(true);
      // Urgency surfaces priority line at the top
      expect(teamOptions[0]?.type).toBe('priority_line');
    });

    it('guarantees email support for all accounts with pre-draft action', () => {
      const options = determineEscalationOptions({ accountType: 'investor' });
      const emailOption = options.find((o) => o.type === 'email');
      expect(emailOption).toBeDefined();
      expect(emailOption?.actionUrl).toContain('mailto:support@paperworking.co');
    });

    it('formats transcript cleanly for email attachment / callback context', () => {
      const transcript = [
        { role: 'user', text: 'How do I add an LLC to my deal?' },
        { role: 'assistant', text: 'You can tag your deal to an owning LLC in the Project settings.' },
      ];
      const formatted = formatTranscriptForHandoff(transcript);
      expect(formatted).toContain('[1] User:');
      expect(formatted).toContain('How do I add an LLC to my deal?');
      expect(formatted).toContain(`[2] ${PEPPER_CONFIG.agentName}:`);
      expect(formatted).toContain('owning LLC');
    });
  });
});
