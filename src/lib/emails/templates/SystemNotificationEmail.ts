import { renderEmailLayout } from './BaseLayout';

export interface SystemNotificationEmailProps {
  title: string;
  body: string;
  deepLinkUrl: string;
  appUrl?: string;
  type?: string;
  objectReference?: any;
  actorName?: string;
}

export function generateSystemNotificationEmail({
  title,
  body,
  deepLinkUrl,
  appUrl = 'https://paperworking.co',
  type,
  objectReference,
  actorName,
}: SystemNotificationEmailProps): { subject: string; html: string } {
  const subject = title;

  let bodyHtml = '';

  if (type === 'LOAN_STATUS_UPDATE') {
    bodyHtml = `
      <h1 style="font-size:22px;font-weight:700;color:#0d0d0d;margin:0 0 8px 0;letter-spacing:-0.02em;">
        Underwriting Transition Update
      </h1>
      <p style="font-size:14px;color:#7F7F7F;margin:0 0 24px 0;">
        A milestone status update has been recorded for the property loan at <strong style="color:#0d0d0d;">${objectReference?.dealAddress || 'the project'}</strong>.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px; background-color:#F2F2F2; border-left:3px solid #0d0d0d;">
        <tr>
          <td style="padding:16px 20px;">
            <span style="font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#7F7F7F;">Update Details</span>
            <p style="font-size:15px;font-weight:600;color:#0d0d0d;margin:4px 0 0 0;">${body}</p>
          </td>
        </tr>
      </table>
      <a href="${appUrl}${deepLinkUrl}" class="btn-primary" style="display:inline-block;background-color:#0d0d0d;color:#ffffff;text-decoration:none;padding:14px 28px;font-weight:600;font-size:14px;">
        Review in Lender Vault
      </a>
    `;
  } else if (type === 'VENDOR_BID') {
    bodyHtml = `
      <h1 style="font-size:22px;font-weight:700;color:#0d0d0d;margin:0 0 8px 0;letter-spacing:-0.02em;">
        New Bid Received
      </h1>
      <p style="font-size:14px;color:#7F7F7F;margin:0 0 24px 0;">
        A new professional contractor proposal has been submitted for <strong style="color:#0d0d0d;">${objectReference?.dealAddress || 'the project'}</strong>.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px; background-color:#F2F2F2; border-left:3px solid #0d0d0d;">
        <tr>
          <td style="padding:16px 20px;">
            <span style="font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#7F7F7F;">Bid Amount</span>
            <p style="font-size:20px;font-weight:700;color:#0d0d0d;margin:4px 0 0 0;">${objectReference?.amount || 'N/A'}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 20px; border-top:1px solid #E5E5E5;">
            <span style="font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#7F7F7F;">Contractor</span>
            <p style="font-size:15px;font-weight:600;color:#0d0d0d;margin:4px 0 0 0;">${actorName || 'A service provider'}</p>
          </td>
        </tr>
      </table>
      <a href="${appUrl}${deepLinkUrl}" class="btn-primary" style="display:inline-block;background-color:#0d0d0d;color:#ffffff;text-decoration:none;padding:14px 28px;font-weight:600;font-size:14px;">
        Review Proposal
      </a>
    `;
  } else if (type === 'LENDER_CHECKLIST_REMINDER') {
    bodyHtml = `
      <h1 style="font-size:22px;font-weight:700;color:#0d0d0d;margin:0 0 8px 0;letter-spacing:-0.02em;">
        Lender Checklist Action Required
      </h1>
      <p style="font-size:14px;color:#7F7F7F;margin:0 0 24px 0;">
        Underwriting requirements are still pending for <strong style="color:#0d0d0d;">${objectReference?.dealAddress || 'your project'}</strong>.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px; background-color:#F2F2F2; border-left:3px solid #0d0d0d;">
        <tr>
          <td style="padding:16px 20px;">
            <span style="font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#7F7F7F;">Pending Document</span>
            <p style="font-size:15px;font-weight:600;color:#0d0d0d;margin:4px 0 0 0;">${objectReference?.documentName || 'Underwriting document'}</p>
          </td>
        </tr>
      </table>
      <a href="${appUrl}${deepLinkUrl}" class="btn-primary" style="display:inline-block;background-color:#0d0d0d;color:#ffffff;text-decoration:none;padding:14px 28px;font-weight:600;font-size:14px;">
        Upload Document
      </a>
    `;
  } else if (type === 'SLIPPAGE_DETECTED') {
    bodyHtml = `
      <h1 style="font-size:22px;font-weight:700;color:#c23b22;margin:0 0 8px 0;letter-spacing:-0.02em;">
        Slippage Alert: Milestone Overdue
      </h1>
      <p style="font-size:14px;color:#7F7F7F;margin:0 0 24px 0;">
        A critical target closing date has slipped for <strong style="color:#0d0d0d;">${objectReference?.dealAddress || 'the project'}</strong>.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px; background-color:#FDF2F2; border-left:3px solid #c23b22;">
        <tr>
          <td style="padding:16px 20px;">
            <span style="font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#7F7F7F;">Overdue Milestone</span>
            <p style="font-size:15px;font-weight:600;color:#0d0d0d;margin:4px 0 0 0;">${objectReference?.task || 'Milestone target'}</p>
          </td>
        </tr>
      </table>
      <p style="font-size:13px;color:#7F7F7F;margin:0 0 24px 0;line-height:1.5;">
        ${body}
      </p>
      <a href="${appUrl}${deepLinkUrl}" class="btn-primary" style="display:inline-block;background-color:#0d0d0d;color:#ffffff;text-decoration:none;padding:14px 28px;font-weight:600;font-size:14px;">
        View Timeline
      </a>
    `;
  } else if (type === 'DOCUMENT_SIGNED') {
    bodyHtml = `
      <h1 style="font-size:22px;font-weight:700;color:#0d0d0d;margin:0 0 8px 0;letter-spacing:-0.02em;">
        Document E-Signature Confirmed
      </h1>
      <p style="font-size:14px;color:#7F7F7F;margin:0 0 24px 0;">
        A transaction document has been successfully signed for <strong style="color:#0d0d0d;">${objectReference?.dealAddress || 'the project'}</strong>.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px; background-color:#F2F2F2; border-left:3px solid #0d0d0d;">
        <tr>
          <td style="padding:16px 20px;">
            <span style="font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#7F7F7F;">Document Name</span>
            <p style="font-size:15px;font-weight:600;color:#0d0d0d;margin:4px 0 0 0;">${objectReference?.documentName || 'Document'}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 20px; border-top:1px solid #E5E5E5;">
            <span style="font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#7F7F7F;">Signed By</span>
            <p style="font-size:15px;font-weight:600;color:#0d0d0d;margin:4px 0 0 0;">${actorName || 'Participant'}</p>
          </td>
        </tr>
      </table>
      <a href="${appUrl}${deepLinkUrl}" class="btn-primary" style="display:inline-block;background-color:#0d0d0d;color:#ffffff;text-decoration:none;padding:14px 28px;font-weight:600;font-size:14px;">
        View Document Vault
      </a>
    `;
  } else if (type === 'PHASE_TRANSITION') {
    bodyHtml = `
      <h1 style="font-size:22px;font-weight:700;color:#0d0d0d;margin:0 0 8px 0;letter-spacing:-0.02em;">
        Project Phase Passage
      </h1>
      <p style="font-size:14px;color:#7F7F7F;margin:0 0 24px 0;">
        The real estate investment project has successfully passed to a new lifecycle phase.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px; background-color:#F2F2F2; border-left:3px solid #0d0d0d;">
        <tr>
          <td style="padding:16px 20px;">
            <span style="font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#7F7F7F;">New Phase</span>
            <p style="font-size:20px;font-weight:700;text-transform:capitalize;color:#0d0d0d;margin:4px 0 0 0;">${objectReference?.phase || 'Hold'}</p>
          </td>
        </tr>
      </table>
      <a href="${appUrl}${deepLinkUrl}" class="btn-primary" style="display:inline-block;background-color:#0d0d0d;color:#ffffff;text-decoration:none;padding:14px 28px;font-weight:600;font-size:14px;">
        Open Project Workspace
      </a>
    `;
  } else {
    bodyHtml = `
      <h1 style="font-size:22px;font-weight:700;color:#0d0d0d;margin:0 0 8px 0;letter-spacing:-0.02em;">
        Notification Alert
      </h1>
      <p style="font-size:15px;font-weight:600;color:#0d0d0d;margin:0 0 16px 0;">
        ${title}
      </p>
      <p style="font-size:14px;color:#595959;margin:0 0 24px 0;line-height:1.6;">
        ${body}
      </p>
      <a href="${appUrl}${deepLinkUrl}" class="btn-primary" style="display:inline-block;background-color:#0d0d0d;color:#ffffff;text-decoration:none;padding:14px 28px;font-weight:600;font-size:14px;">
        View in PaperWorking
      </a>
    `;
  }

  return {
    subject,
    html: renderEmailLayout({
      title: 'System Notification',
      preheader: `${title} — ${body.slice(0, 80)}`,
      bodyHtml,
      appUrl,
    }),
  };
}
