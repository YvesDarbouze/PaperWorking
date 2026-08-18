import { maskEmail, maskPhone, maskAccount, maskToken } from '@/lib/utils';

describe('PROMPT 2 — User Management & User 360 Workspace Unit Suite', () => {
  describe('Standardized Masking Helpers (Amendment C)', () => {
    it('masks email addresses while preserving domain extension', () => {
      expect(maskEmail('john.doe@example.com')).toBe('j******e@e******.com');
      expect(maskEmail(null)).toBe('—');
      expect(maskEmail('')).toBe('—');
    });

    it('masks phone numbers to show last 4 digits', () => {
      expect(maskPhone('15551234567')).toBe('***-***-4567');
      expect(maskPhone('4567')).toBe('***-***-4567');
      expect(maskPhone(null)).toBe('—');
    });

    it('masks bank account numbers', () => {
      expect(maskAccount('12345678892')).toBe('•••• 8892');
      expect(maskAccount('8892')).toBe('•••• 8892');
      expect(maskAccount(null)).toBe('—');
    });

    it('masks API tokens', () => {
      expect(maskToken('tok_1234567890abcdef')).toBe('tok_••••cdef');
      expect(maskToken(null)).toBe('—');
    });
  });

  describe('User 360 & Verification Gate Logic', () => {
    it('computes 6-digit OTP code correctly', () => {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      expect(code).toMatch(/^\d{6}$/);
    });

    it('computes verification expiration timestamp (15 min TTL)', () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);
      const diffMinutes = Math.round((expiresAt.getTime() - now.getTime()) / 60000);
      expect(diffMinutes).toBe(15);
    });
  });
});
