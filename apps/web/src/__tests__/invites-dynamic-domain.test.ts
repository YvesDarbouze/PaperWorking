/**
 * Test Suite: Dynamic Base URL Resolution for Email Invites (Item 3.4)
 *
 * Verifies:
 * 1. resolveAppBaseUrl prioritizes NEXT_PUBLIC_APP_URL when present.
 * 2. resolveAppBaseUrl respects x-forwarded-host and x-forwarded-proto headers.
 * 3. resolveAppBaseUrl handles standard host headers with localhost protocol deduction.
 * 4. resolveAppBaseUrl falls back to request URL origin.
 * 5. POST /api/invites dispatches transactional emails containing dynamically resolved URLs.
 */

import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';
import { resolveAppBaseUrl } from '../../lib/utils/url';
import { POST as postInviteRoute } from '../../app/api/invites/route';
import { __clearSentEmailsForTesting, sentEmailsForTesting } from '../../lib/email/sendgrid-service';

describe('Dynamic Domain Resolution in Email Invites (Item 3.4)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.APP_URL;
    __clearSentEmailsForTesting();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('resolveAppBaseUrl logic', () => {
    it('prioritizes NEXT_PUBLIC_APP_URL when configured', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://custom-preview.paperworking.co/';
      const req = new Request('http://localhost:3000/api/invites');
      const resolved = resolveAppBaseUrl(req);

      expect(resolved).toBe('https://custom-preview.paperworking.co');
    });

    it('resolves from x-forwarded-host and x-forwarded-proto headers', () => {
      const req = new Request('http://internal-docker-service/api/invites', {
        headers: {
          'x-forwarded-host': 'staging.paperworking.co',
          'x-forwarded-proto': 'https',
        },
      });
      const resolved = resolveAppBaseUrl(req);

      expect(resolved).toBe('https://staging.paperworking.co');
    });

    it('resolves from standard host header with localhost http deduction', () => {
      const req = new Request('http://localhost:3000/api/invites', {
        headers: {
          host: 'localhost:3000',
        },
      });
      const resolved = resolveAppBaseUrl(req);

      expect(resolved).toBe('http://localhost:3000');
    });

    it('falls back to request URL origin when headers are minimal', () => {
      const req = new Request('https://preview-pr-42.paperworking.co/api/invites');
      const resolved = resolveAppBaseUrl(req);

      expect(resolved).toBe('https://preview-pr-42.paperworking.co');
    });

    it('falls back to production paperworking.co when no request or env is provided', () => {
      const resolved = resolveAppBaseUrl();
      expect(resolved).toBe('https://paperworking.co');
    });
  });

  describe('POST /api/invites dynamic URL integration', () => {
    it('dispatches phase lead invite with dynamic host from request', async () => {
      process.env.TEST_AUTH_UID = 'test-investor-user';

      const request = new Request('https://preview-staging.paperworking.co/api/invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          host: 'preview-staging.paperworking.co',
          'x-forwarded-proto': 'https',
        },
        body: JSON.stringify({
          email: 'partner@equitygroup.com',
          name: 'Elena Rostova',
          role: 'Acquisitions Lead',
          projectId: 'deal-lifecycle',
          assignType: 'phase',
          phaseKey: 'acquisition',
          phaseTitle: 'Acquisition',
        }),
      });

      const response = await postInviteRoute(request);
      expect(response.status).toBe(201);

      expect(sentEmailsForTesting.length).toBeGreaterThan(0);
      const email = sentEmailsForTesting[sentEmailsForTesting.length - 1];

      // Verifies link does NOT contain hardcoded https://paperworking.com
      expect(email.text).not.toContain('https://paperworking.com/projects');
      expect(email.html).not.toContain('https://paperworking.com/projects');

      // Verifies link dynamically matches staging environment
      expect(email.text).toContain('https://preview-staging.paperworking.co/projects/deal-lifecycle?phase=acquisition');
      expect(email.html).toContain('https://preview-staging.paperworking.co/projects/deal-lifecycle?phase=acquisition');
    });

    it('dispatches step assignment invite with localhost dev domain', async () => {
      process.env.TEST_AUTH_UID = 'test-investor-user';

      const request = new Request('http://localhost:3000/api/invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          host: 'localhost:3000',
        },
        body: JSON.stringify({
          email: 'contractor@localtrades.com',
          name: 'Marco Trades',
          role: 'General Contractor',
          projectId: 'deal-lifecycle',
          taskId: 'task-hvac-1',
          taskTitle: 'Inspect HVAC Units',
          assignType: 'step',
        }),
      });

      const response = await postInviteRoute(request);
      expect(response.status).toBe(201);

      const email = sentEmailsForTesting[sentEmailsForTesting.length - 1];
      expect(email.text).toContain('http://localhost:3000/projects/deal-lifecycle');
      expect(email.html).toContain('http://localhost:3000/projects/deal-lifecycle');
    });
  });
});
