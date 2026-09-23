/**
 * AutomatedEmailService — lifecycle-triggered email dispatch.
 *
 * Renders the matching v1 email template and dispatches it through the
 * SendGrid service. Callers are responsible for resolving recipient
 * identity/display names before invoking these methods.
 */

import {
  generateDocumentUploadEmail,
  generateInvestorPledgeEmail,
  generatePhaseAdvanceEmail,
  generateProjectClosedEmail,
  htmlToPlainText,
} from './templates';
import type {
  DocumentUploadEmailProps,
  InvestorPledgeEmailProps,
  PhaseAdvanceEmailProps,
} from './templates';
import { sendGridService } from './sendgrid-service';
import type { SendGridDispatchResult } from './sendgrid-service';

export type AutomatedEmailRecipient = string | string[];

export type PhaseAdvanceEmailOptions = Omit<PhaseAdvanceEmailProps, 'appUrl'> & {
  to: AutomatedEmailRecipient;
};

export type InvestorPledgeEmailOptions = Omit<InvestorPledgeEmailProps, 'appUrl'> & {
  to: AutomatedEmailRecipient;
};

export type DocumentUploadEmailOptions = Omit<DocumentUploadEmailProps, 'appUrl'> & {
  to: AutomatedEmailRecipient;
};

export interface ProjectClosedEmailOptions {
  to: AutomatedEmailRecipient;
  projectName: string;
  projectId: string;
  outcome: 'closed_won' | 'closed_lost';
  closedBy: string;
  metrics?: { netProfit?: number; roi?: number; daysHeld?: number };
}

interface RenderedEmail {
  subject: string;
  html: string;
  text?: string;
}

async function dispatchRenderedEmail(
  to: AutomatedEmailRecipient,
  rendered: RenderedEmail,
): Promise<SendGridDispatchResult> {
  return sendGridService.send({
    to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text ?? htmlToPlainText(rendered.html),
  });
}

export const automatedEmailService = {
  /** Sends the phase-advance notification when a project moves to its next lifecycle phase. */
  async onPhaseAdvance(options: PhaseAdvanceEmailOptions): Promise<SendGridDispatchResult> {
    const { to, ...templateProps } = options;
    return dispatchRenderedEmail(to, generatePhaseAdvanceEmail(templateProps));
  },

  /** Sends the capital-pledge notification when an investor commits funds to a project. */
  async onInvestorPledge(options: InvestorPledgeEmailOptions): Promise<SendGridDispatchResult> {
    const { to, ...templateProps } = options;
    return dispatchRenderedEmail(to, generateInvestorPledgeEmail(templateProps));
  },

  /** Sends the vault notification when a document is uploaded to a project. */
  async onDocumentUpload(options: DocumentUploadEmailOptions): Promise<SendGridDispatchResult> {
    const { to, ...templateProps } = options;
    return dispatchRenderedEmail(to, generateDocumentUploadEmail(templateProps));
  },

  /** Sends the disposition notification when a project is closed as won or lost. */
  async onProjectClosed(options: ProjectClosedEmailOptions): Promise<SendGridDispatchResult> {
    const { to, outcome, metrics } = options;
    if (outcome !== 'closed_won' && outcome !== 'closed_lost') {
      throw new Error(`No email template is available for project outcome "${String(outcome)}".`);
    }
    return dispatchRenderedEmail(
      to,
      generateProjectClosedEmail({
        projectName: options.projectName,
        projectId: options.projectId,
        outcome,
        closedBy: options.closedBy,
        netProfit: metrics?.netProfit,
        roi: metrics?.roi,
        daysHeld: metrics?.daysHeld,
      }),
    );
  },
};
