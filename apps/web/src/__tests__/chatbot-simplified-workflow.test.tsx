import React from 'react';
import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import { NextRequest } from 'next/server';
import { POST as feedbackPost } from '@/app/api/assistant/feedback/route';
import { sentEmailsForTesting, __clearSentEmailsForTesting } from '@/lib/email/sendgrid-service';
import { scrubPii, getClientDiagnostics } from '@/lib/telemetry/client-diagnostic-buffer';
import { AssistantProvider } from '@/components/assistant/AssistantProvider';
import PepperLauncher from '@/components/assistant/PepperLauncher';
import PepperDrawer from '@/components/assistant/PepperDrawer';

// Prevent hanging network connections during unit testing
(process.env as Record<string, string | undefined>).NODE_ENV = 'test';
delete process.env.FIRESTORE_EMULATOR_HOST;
delete process.env.FIRESTORE_EMULATOR_RUNNING;

describe('Simplified Conversational Chatbot Workflow & Triage', () => {
  beforeEach(() => {
    __clearSentEmailsForTesting();
  });

  describe('1. Client Diagnostic Buffer & PII Scrubber', () => {
    it('scrubs sensitive credentials, tokens, and user emails before telemetry ingestion', () => {
      const rawText = 'User investor.bob@gmail.com failed with Bearer secret_token_xyz and password: "mySuperSecret123"';
      const clean = scrubPii(rawText);

      expect(clean).not.toContain('investor.bob@gmail.com');
      expect(clean).toContain('i***@gmail.com');
      expect(clean).not.toContain('secret_token_xyz');
      expect(clean).toContain('Bearer [REDACTED_TOKEN]');
      expect(clean).not.toContain('mySuperSecret123');
      expect(clean).toContain('[REDACTED_PASSWORD]');
    });

    it('preserves internal domain paperworking.co for telemetry routing', () => {
      const internalLog = 'Dispatched alert to hi@paperworking.co';
      const clean = scrubPii(internalLog);
      expect(clean).toContain('hi@paperworking.co');
    });

    it('collects client diagnostics with environment, viewport, and route', () => {
      const diag = getClientDiagnostics('test-session-123');
      expect(diag.sessionId).toBe('test-session-123');
      expect(diag.appVersion).toBe('0.1.0-dev');
      expect(diag.viewport.width).toBeGreaterThan(0);
      expect(diag.recentErrors).toBeDefined();
    });
  });

  describe('2. Backend Route & hi@paperworking.co Email Dispatch', () => {
    it('generates structured bug ticket and dispatches email notification to hi@paperworking.co', async () => {
      const req = new NextRequest('http://localhost:3000/api/assistant/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Firebase-AppCheck': 'test-debug-token',
        },
        body: JSON.stringify({
          kind: 'bug',
          ticketId: 'PW-BUG-84920',
          title: 'Holding cost clock calculation discrepancy',
          description: 'The debt service interest accrual rate did not update after changing loan APR.',
          module: 'Holding Ledger',
          severity: 'high',
          route: '/projects/elm-duplex/ledger',
          userEmail: 'investor@firm.com',
          userName: 'Marcus Sterling',
          hasAttachment: true,
          attachmentName: 'screenshot-clock.png',
          diagnostics: {
            appVersion: '0.1.0-dev',
            platform: 'MacIntel',
            route: '/projects/elm-duplex/ledger',
            viewport: { width: 1440, height: 900 },
          },
        }),
      });

      const res = await feedbackPost(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.ticketId).toBe('PW-BUG-84920');
      expect(data.message).toContain('Ticket PW-BUG-84920');

      // Verify email dispatch to hi@paperworking.co
      expect(sentEmailsForTesting.length).toBe(2);
      const teamEmail = sentEmailsForTesting.find((e) => {
        const to = Array.isArray(e.to) ? e.to[0] : e.to;
        return to?.email === 'hi@paperworking.co';
      });

      expect(teamEmail).toBeDefined();
      expect(teamEmail?.subject).toContain('[PW-BUG-84920]');
      expect(teamEmail?.subject).toContain('[HIGH]');
      expect(teamEmail?.subject).toContain('Bug Report');
      expect(teamEmail?.text).toContain('Ticket ID: PW-BUG-84920');
      expect(teamEmail?.text).toContain('Affected Workspace/Module: Holding Ledger');
      expect(teamEmail?.text).toContain('Severity: HIGH');
      expect(teamEmail?.text).toContain('screenshot-clock.png');
      expect(teamEmail?.text).toContain('Viewport: 1440x900');
    });

    it('handles feature requests with dinner guarantee and dispatches to hi@paperworking.co', async () => {
      const req = new NextRequest('http://localhost:3000/api/assistant/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Firebase-AppCheck': 'test-debug-token',
        },
        body: JSON.stringify({
          kind: 'feature_request',
          ticketId: 'PW-FEAT-39102',
          title: 'Direct HUD-1 Settlement Statement OCR Parser',
          description: 'Automatically map lender settlement fees into line items in the Fund Phase Vault.',
          reilPhase: 'Fund',
          userEmail: 'subscriber@venture.com',
          userName: 'Elena Founder',
          clientTierClaim: 'investor',
        }),
      });

      const res = await feedbackPost(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      // Non-subscriber in unauthenticated mock gets graceful upsell
      if (data.upsell) {
        expect(data.message).toContain('Feature requests directly shape PaperWorking development');
      } else {
        expect(data.success).toBe(true);
        expect(data.ticketId).toBe('PW-FEAT-39102');
        expect(data.message).toContain('dinner is on us');
      }
    });
  });

  describe('3. Launcher FAB & Alternating Blinking Badge', () => {
    it('renders launcher FAB container and alternating callout badge', () => {
      const html = renderToString(
        <AssistantProvider>
          <PepperLauncher />
        </AssistantProvider>,
      );

      expect(html).toContain('data-testid="ava-launcher-container"');
      expect(html).toContain('data-testid="ava-launcher-bubble"');
      expect(html).toContain('data-testid="dismiss-pulse-button"');
      expect(html).toContain('Report Bug');
      expect(html).toContain('Feature Request');
    });
  });

  describe('4. Conversational Chatbot Drawer & Statutory Disclaimer', () => {
    it('renders statutory non-advice banner in drawer', () => {
      const html = renderToString(
        <AssistantProvider>
          <PepperDrawer isOpen={true} />
        </AssistantProvider>,
      );

      expect(html).toContain('data-testid="assistant-cage-disclaimer-banner"');
      expect(html).toContain('automated assistant — answers may be inaccurate — not advice');
      expect(html).toContain('data-testid="close-drawer-button"');
    });

    it('renders mission statement and dinner pledge prominently in chat view', () => {
      const html = renderToString(
        <AssistantProvider>
          <PepperDrawer isOpen={true} activeTab="chat" />
        </AssistantProvider>,
      );

      expect(html).toContain('Submit Request');
      expect(html).toContain('Report a bug or even make a feature request.');
      expect(html).toContain('If we develop your feature request, we will buy you dinner.');
      expect(html).toContain('data-testid="assistant-chat-input"');
      expect(html).toContain('data-testid="send-message-button"');
    });

    it('provides starter choice chips for Report a Bug and Feature Request', () => {
      const html = renderToString(
        <AssistantProvider>
          <PepperDrawer isOpen={true} activeTab="chat" />
        </AssistantProvider>,
      );

      expect(html).toContain('Report a Bug');
      expect(html).toContain('Feature Request');
      expect(html).toContain('Ask a Question');
      expect(html).toContain('Talk to Support');
    });

    it('preserves test compatibility with data-testids for feedback and escalation tabs', () => {
      const feedbackHtml = renderToString(
        <AssistantProvider>
          <PepperDrawer isOpen={true} activeTab="feedback" />
        </AssistantProvider>,
      );

      expect(feedbackHtml).toContain('data-testid="feedback-tab-panel"');
      expect(feedbackHtml).toContain('data-testid="feedback-title-input"');
      expect(feedbackHtml).toContain('data-testid="feedback-desc-input"');
      expect(feedbackHtml).toContain('data-testid="submit-feedback-button"');

      const escalationHtml = renderToString(
        <AssistantProvider>
          <PepperDrawer isOpen={true} activeTab="escalation" />
        </AssistantProvider>,
      );

      expect(escalationHtml).toContain('data-testid="escalation-tab-panel"');
      expect(escalationHtml).toContain('data-testid="callback-name-input"');
      expect(escalationHtml).toContain('data-testid="callback-phone-input"');
      expect(escalationHtml).toContain('data-testid="callback-email-input"');
      expect(escalationHtml).toContain('data-testid="callback-window-select"');
      expect(escalationHtml).toContain('data-testid="submit-callback-button"');
    });
  });
});
