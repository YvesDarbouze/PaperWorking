/**
 * Automated email service dispatch tests.
 *
 * The SendGrid module is mocked so each lifecycle method can be asserted to
 * render the matching template and dispatch exactly once to the recipient.
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { SendGridDispatchResult } from '@/lib/email/sendgrid-service';

interface SentEmailPayload {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
}

const sendMock = jest.fn<(payload: SentEmailPayload) => Promise<SendGridDispatchResult>>();

jest.unstable_mockModule('@/lib/email/sendgrid-service', () => ({
  sendGridService: {
    send: sendMock,
  },
}));

const { automatedEmailService } = await import('@/lib/email/automated-email-service');

beforeEach(() => {
  sendMock.mockReset();
  sendMock.mockResolvedValue({
    success: true,
    messageId: 'mock-msg-1',
    mode: 'mock',
    attempts: 1,
  });
});

describe('automatedEmailService', () => {
  it('onPhaseAdvance renders the phase template and sends once', async () => {
    const result = await automatedEmailService.onPhaseAdvance({
      to: 'owner@example.com',
      projectName: 'Maple Duplex',
      projectId: 'proj-1',
      fromPhase: 'phase-1',
      toPhase: 'phase-2',
      advancedBy: 'Sam Rivera',
    });

    expect(sendMock).toHaveBeenCalledTimes(1);
    const payload = sendMock.mock.calls[0]?.[0];
    expect(payload?.to).toBe('owner@example.com');
    expect(payload?.subject.trim().length).toBeGreaterThan(0);
    expect(payload?.html).toContain('Phase Advance');
    expect(payload?.text?.trim().length).toBeGreaterThan(0);
    expect(result.success).toBe(true);
  });

  it('onInvestorPledge renders the pledge template and sends once', async () => {
    await automatedEmailService.onInvestorPledge({
      to: 'owner@example.com',
      projectName: 'Maple Duplex',
      projectId: 'proj-1',
      investorName: 'Robert Chen',
      pledgeAmount: 250000,
      totalRaised: 750000,
      targetAmount: 1000000,
    });

    expect(sendMock).toHaveBeenCalledTimes(1);
    const payload = sendMock.mock.calls[0]?.[0];
    expect(payload?.to).toBe('owner@example.com');
    expect(payload?.subject.trim().length).toBeGreaterThan(0);
    expect(payload?.html).toContain('Capital Pledge Received');
  });

  it('onDocumentUpload renders the document template and sends once to every recipient', async () => {
    const recipients = ['owner@example.com', 'partner@example.com'];

    await automatedEmailService.onDocumentUpload({
      to: recipients,
      projectName: 'Maple Duplex',
      projectId: 'proj-1',
      documentName: 'Inspection Report',
      category: 'Inspection',
      uploaderName: 'Grace Hopper',
    });

    expect(sendMock).toHaveBeenCalledTimes(1);
    const payload = sendMock.mock.calls[0]?.[0];
    expect(payload?.to).toEqual(recipients);
    expect(payload?.subject.trim().length).toBeGreaterThan(0);
    expect(payload?.html).toContain('Document Uploaded');
  });

  it('onProjectClosed renders the disposition template and sends once', async () => {
    await automatedEmailService.onProjectClosed({
      to: 'owner@example.com',
      projectName: 'Maple Duplex',
      projectId: 'proj-1',
      outcome: 'closed_won',
      closedBy: 'Sam Rivera',
      metrics: { netProfit: 42500, roi: 18.5, daysHeld: 320 },
    });

    expect(sendMock).toHaveBeenCalledTimes(1);
    const payload = sendMock.mock.calls[0]?.[0];
    expect(payload?.to).toBe('owner@example.com');
    expect(payload?.subject.trim().length).toBeGreaterThan(0);
    expect(payload?.html).toContain('Closed — Won');
    expect(payload?.text?.trim().length).toBeGreaterThan(0);
  });
});
