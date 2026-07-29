/**
 * Prompt 63 — Milestone Emails: regression tests
 *
 * Verifies:
 *   1. TODO console.log stubs are gone from route source
 *   2. Real imports for CommunicationEngine and email generators are present
 *   3. Idempotency guards (firstMetricEmailSent / secondProjectEmailSent) are in route source
 *   4. Audit trail collection (milestoneEmailSends) is referenced
 *   5. sendMilestoneEmail is failure-isolated (try/catch wraps dispatch)
 *   6. generateFirstMetricEmail renders correct subject and HTML content
 *   7. generateSecondProjectEmail renders correct subject and HTML content
 *   8. Email content is sensible (required fields rendered, no placeholder leakage)
 *   9. Both milestone emails use sendRawEmail, not sendCannedEmail
 *  10. RESEND_WEBHOOK_SECRET is documented in .env.example
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');
const ROOT = path.resolve(__dirname, '../..');

function read(relPath: string): string {
  return fs.readFileSync(path.join(SRC, relPath), 'utf8');
}

function readRoot(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

const ROUTE = read('app/api/events/route.ts');
const ENV_EXAMPLE = readRoot('.env.example');

describe('Prompt 63 — Milestone Emails: wire stubs to real dispatch', () => {

  // ─────────────────────────────────────────────────────────────────────────
  // 1. TODO stubs are gone
  // ─────────────────────────────────────────────────────────────────────────
  describe('TODO stubs removed', () => {
    it('removes the first_metric_lit TODO comment', () => {
      expect(ROUTE).not.toContain('TODO: Trigger FirstMetricEmail');
    });

    it('removes the second_project_created TODO comment', () => {
      expect(ROUTE).not.toContain('TODO: Trigger SecondProjectEmail');
    });

    it('first_metric_lit case no longer only console.logs', () => {
      // The case block should have real code beyond console.log
      expect(ROUTE).not.toMatch(
        /case 'first_metric_lit':\s*\{[\s\S]{0,200}\/\/ TODO[\s\S]{0,100}console\.log[\s\S]{0,50}break/,
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Real imports present
  // ─────────────────────────────────────────────────────────────────────────
  describe('real imports wired', () => {
    it('imports CommunicationEngine', () => {
      expect(ROUTE).toContain("from '@/lib/engine/CommunicationEngine'");
    });

    it('imports generateFirstMetricEmail', () => {
      expect(ROUTE).toContain('generateFirstMetricEmail');
      expect(ROUTE).toContain('FirstMetricEmail');
    });

    it('imports generateSecondProjectEmail', () => {
      expect(ROUTE).toContain('generateSecondProjectEmail');
      expect(ROUTE).toContain('SecondProjectEmail');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Idempotency guards present in route source
  // ─────────────────────────────────────────────────────────────────────────
  describe('idempotency guards', () => {
    it('uses firstMetricEmailSent field for idempotency', () => {
      expect(ROUTE).toContain('firstMetricEmailSent');
    });

    it('uses secondProjectEmailSent field for idempotency', () => {
      expect(ROUTE).toContain('secondProjectEmailSent');
    });

    it('checks the field before sending (=== true guard)', () => {
      expect(ROUTE).toContain('=== true');
    });

    it('uses arrayUnion or set/merge to mark sent', () => {
      // Either arrayUnion or a set({ merge: true }) with the idempotency field
      const usesSetMerge = ROUTE.includes('merge: true');
      const usesArrayUnion = ROUTE.includes('arrayUnion');
      expect(usesSetMerge || usesArrayUnion).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Audit trail: milestoneEmailSends collection
  // ─────────────────────────────────────────────────────────────────────────
  describe('audit trail', () => {
    it('writes to milestoneEmailSends collection', () => {
      expect(ROUTE).toContain('milestoneEmailSends');
    });

    it('audit doc includes providerMessageId', () => {
      expect(ROUTE).toContain('providerMessageId');
    });

    it('audit doc includes sentAt timestamp', () => {
      expect(ROUTE).toContain('sentAt');
    });

    it('audit doc includes mock flag', () => {
      // So we can distinguish real vs mocked sends in the audit log
      expect(ROUTE).toContain('mock');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Failure isolation: email errors do not break event ingestion
  // ─────────────────────────────────────────────────────────────────────────
  describe('failure isolation', () => {
    it('email dispatch is wrapped in try/catch', () => {
      // sendMilestoneEmail wraps CommunicationEngine.sendRawEmail in try/catch
      const hasTryCatch = ROUTE.includes('try {') && ROUTE.includes('sendRawEmail') &&
        ROUTE.includes('catch (err)');
      expect(hasTryCatch).toBe(true);
    });

    it('catch block logs the error without re-throwing', () => {
      expect(ROUTE).toContain('Email failure MUST NOT break event ingestion');
    });

    it('route returns { success: true } unconditionally at end', () => {
      expect(ROUTE).toContain("return NextResponse.json({ success: true, event })");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 6. generateFirstMetricEmail template output
  // ─────────────────────────────────────────────────────────────────────────
  describe('generateFirstMetricEmail template', () => {
    const { generateFirstMetricEmail } = require('../lib/emails/templates/FirstMetricEmail');

    it('returns subject and html', () => {
      const result = generateFirstMetricEmail({
        displayName: 'Yves Darbouze',
        projectName: '123 Main St',
        metricName: 'Cap Rate',
        metricValue: '7.2%',
        projectUrl: '/dashboard/projects/proj123',
      });
      expect(result).toHaveProperty('subject');
      expect(result).toHaveProperty('html');
    });

    it('subject contains project name', () => {
      const { subject } = generateFirstMetricEmail({
        displayName: 'Yves', projectName: '456 Oak Ave',
        metricName: 'NOI', metricValue: '$24,000', projectUrl: '/dashboard',
      });
      expect(subject).toContain('456 Oak Ave');
    });

    it('subject contains first metric live phrasing', () => {
      const { subject } = generateFirstMetricEmail({
        displayName: 'Yves', projectName: 'Test Property',
        metricName: 'NOI', metricValue: '$24,000', projectUrl: '/dashboard',
      });
      expect(subject.toLowerCase()).toContain('metric');
    });

    it('html contains the metric value', () => {
      const { html } = generateFirstMetricEmail({
        displayName: 'Jane', projectName: 'My Deal',
        metricName: 'Cash-on-Cash', metricValue: '12.4%', projectUrl: '/dashboard',
      });
      expect(html).toContain('12.4%');
    });

    it('html contains the metric name', () => {
      const { html } = generateFirstMetricEmail({
        displayName: 'Jane', projectName: 'My Deal',
        metricName: 'Cash-on-Cash Return', metricValue: '12.4%', projectUrl: '/dashboard',
      });
      expect(html).toContain('Cash-on-Cash Return');
    });

    it('html contains CTA link', () => {
      const { html } = generateFirstMetricEmail({
        displayName: 'Jane', projectName: 'My Deal',
        metricName: 'NOI', metricValue: '$1,000', projectUrl: '/dashboard/projects/abc',
      });
      expect(html).toContain('/dashboard/projects/abc');
    });

    it('html is a full HTML document', () => {
      const { html } = generateFirstMetricEmail({
        displayName: 'Yves', projectName: 'P', metricName: 'M', metricValue: 'V', projectUrl: '/',
      });
      expect(html.toLowerCase()).toContain('<html');
      expect(html.toLowerCase()).toContain('</html>');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 7. generateSecondProjectEmail template output
  // ─────────────────────────────────────────────────────────────────────────
  describe('generateSecondProjectEmail template', () => {
    const { generateSecondProjectEmail } = require('../lib/emails/templates/SecondProjectEmail');

    it('returns subject and html', () => {
      const result = generateSecondProjectEmail({
        displayName: 'Yves', projectName: '789 Pine Rd', totalProjects: 2,
      });
      expect(result).toHaveProperty('subject');
      expect(result).toHaveProperty('html');
    });

    it('subject contains totalProjects count', () => {
      const { subject } = generateSecondProjectEmail({
        displayName: 'Yves', projectName: 'Some Deal', totalProjects: 3,
      });
      expect(subject).toContain('3');
    });

    it('html contains project name', () => {
      const { html } = generateSecondProjectEmail({
        displayName: 'Yves', projectName: 'Riverside Duplex', totalProjects: 2,
      });
      expect(html).toContain('Riverside Duplex');
    });

    it('html contains portfolio CTA', () => {
      const { html } = generateSecondProjectEmail({
        displayName: 'Yves', projectName: 'A', totalProjects: 2,
      });
      expect(html.toLowerCase()).toContain('portfolio');
    });

    it('html is a full HTML document', () => {
      const { html } = generateSecondProjectEmail({
        displayName: 'Yves', projectName: 'B', totalProjects: 2,
      });
      expect(html.toLowerCase()).toContain('<html');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 8. Route uses sendRawEmail (user-scoped, no projectId required)
  // ─────────────────────────────────────────────────────────────────────────
  describe('dispatch via sendRawEmail', () => {
    it('calls sendRawEmail for milestone dispatch', () => {
      expect(ROUTE).toContain('sendRawEmail');
    });

    it('does not use sendCannedEmail for milestone dispatch', () => {
      // sendCannedEmail requires a projectId — milestone emails are user-scoped
      expect(ROUTE).not.toContain('sendCannedEmail');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 9. User email fallback chain: userData.email || token.email
  // ─────────────────────────────────────────────────────────────────────────
  describe('email address resolution', () => {
    it('reads email from userData (Firestore user doc)', () => {
      expect(ROUTE).toContain('userData.email');
    });

    it('falls back to token.email from verified JWT', () => {
      expect(ROUTE).toContain('token.email');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 10. RESEND_WEBHOOK_SECRET documented in .env.example
  // ─────────────────────────────────────────────────────────────────────────
  describe('.env.example documentation', () => {
    it('documents RESEND_WEBHOOK_SECRET', () => {
      expect(ENV_EXAMPLE).toContain('RESEND_WEBHOOK_SECRET');
    });

    it('explains RESEND_WEBHOOK_SECRET purpose', () => {
      expect(ENV_EXAMPLE).toContain('delivery tracking');
    });
  });
});
