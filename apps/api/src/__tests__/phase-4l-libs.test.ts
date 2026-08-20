import { createHmac } from 'crypto';
import { describe, expect, it } from '@jest/globals';
import {
  validatePasswordChangeInput,
  validateResetPasswordEmail,
} from '../lib/auth/password.js';
import {
  buildOtpAuthUrl,
  generateBackupCodes,
  isValidMockTotpCode,
  parseTwoFaAction,
} from '../lib/auth/two-fa.js';
import {
  mapDocuSignToCommitmentStatus,
  mapDocuSignToESignStatus,
  parseDocuSignWebhookEvent,
  verifyDocuSignSignature,
} from '../lib/webhooks/docusign-events.js';
import {
  buildInvitationStatusUpdate,
  isCommitmentLocked,
  isInvitationExpired,
  validateInvitationRespondBody,
} from '../lib/invitations/respond.js';
import {
  generateMockLinkToken,
  shouldUseMockPlaid,
} from '../lib/plaid/link-token.js';

describe('auth password libs', () => {
  it('validatePasswordChangeInput requires both passwords', () => {
    expect(validatePasswordChangeInput({}).ok).toBe(false);
    expect(validatePasswordChangeInput({ currentPassword: 'a', newPassword: 'b' }).ok).toBe(true);
  });

  it('validateResetPasswordEmail validates email', () => {
    expect(validateResetPasswordEmail('bad').ok).toBe(false);
    const ok = validateResetPasswordEmail('User@Example.com');
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.email).toBe('user@example.com');
  });
});

describe('two-fa libs', () => {
  it('parseTwoFaAction accepts known actions', () => {
    expect(parseTwoFaAction('setup')).toBe('setup');
    expect(parseTwoFaAction('unknown')).toBeNull();
  });

  it('isValidMockTotpCode accepts demo codes', () => {
    expect(isValidMockTotpCode('123456')).toBe(true);
    expect(isValidMockTotpCode('999999')).toBe(false);
  });

  it('buildOtpAuthUrl encodes issuer and email', () => {
    expect(buildOtpAuthUrl('a@b.com', 'SECRET')).toContain('otpauth://totp/');
  });

  it('generateBackupCodes returns requested count', () => {
    expect(generateBackupCodes(3)).toHaveLength(3);
  });
});

describe('docusign webhook libs', () => {
  const hmacKey = 'test-secret';

  it('verifyDocuSignSignature validates HMAC', () => {
    const body = '{"envelopeId":"env-1","status":"completed"}';
    const sig = createHmac('sha256', hmacKey).update(body).digest('base64');
    expect(verifyDocuSignSignature(body, sig, hmacKey)).toBe(true);
    expect(verifyDocuSignSignature(body, 'bad', hmacKey)).toBe(false);
  });

  it('parseDocuSignWebhookEvent handles nested data shape', () => {
    const event = parseDocuSignWebhookEvent({
      data: {
        envelopeId: 'env-1',
        envelopeSummary: { status: 'completed', completedDateTime: '2026-01-01T00:00:00Z' },
      },
    });
    expect(event?.envelopeId).toBe('env-1');
    expect(event?.isFinal).toBe(true);
  });

  it('maps envelope and commitment statuses', () => {
    expect(mapDocuSignToESignStatus('completed')).toBe('Signed');
    expect(mapDocuSignToCommitmentStatus('declined', 'pledged')).toBe('soft-committed');
  });
});

describe('invitation respond libs', () => {
  it('validateInvitationRespondBody enforces token and accept signature', () => {
    expect(validateInvitationRespondBody({ token: 'short', action: 'accept' }).ok).toBe(false);
    const missingSig = validateInvitationRespondBody({
      token: 'a'.repeat(16),
      action: 'accept',
    });
    expect(missingSig.ok).toBe(false);
    const ok = validateInvitationRespondBody({
      token: 'a'.repeat(16),
      action: 'decline',
    });
    expect(ok.ok).toBe(true);
  });

  it('buildInvitationStatusUpdate maps actions', () => {
    expect(buildInvitationStatusUpdate('accept', { signatureDataUrl: 'data:image/png' }).status).toBe(
      'accepted',
    );
    expect(buildInvitationStatusUpdate('reopen').status).toBe('opened');
  });

  it('isCommitmentLocked detects locked statuses', () => {
    expect(isCommitmentLocked('signed')).toBe(true);
    expect(isCommitmentLocked('pledged')).toBe(false);
  });

  it('isInvitationExpired compares dates', () => {
    expect(isInvitationExpired(new Date('2020-01-01'), new Date('2026-01-01'))).toBe(true);
  });
});

describe('plaid link token libs', () => {
  it('shouldUseMockPlaid when provider is not plaid', () => {
    expect(shouldUseMockPlaid('mock')).toBe(true);
    expect(shouldUseMockPlaid('plaid')).toBe(false);
  });

  it('generateMockLinkToken has mock prefix', () => {
    expect(generateMockLinkToken(() => 'abc')).toBe('link-sandbox-mock-abc');
  });
});
