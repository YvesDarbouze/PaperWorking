import { renderEmailLayout } from './BaseLayout';

export interface InvestorInquiryEmailProps {
  investorName: string;
  investorEmail: string;
  projectName: string;
  projectId: string;
  message: string;
  appUrl?: string;
}

export function generateInvestorInquiryEmail({
  investorName,
  investorEmail,
  projectName,
  projectId,
  message,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://paperworking.co',
}: InvestorInquiryEmailProps): { subject: string; html: string; text: string } {
  const subject = `New question from ${investorName} on ${projectName}`;

  const bodyHtml = `
    <h1 style="font-size:22px;font-weight:700;color:#0d0d0d;margin:0 0 8px 0;letter-spacing:-0.02em;">
      Investor Question
    </h1>
    <p style="font-size:14px;color:#7F7F7F;margin:0 0 24px 0;">
      ${investorName} asked a question about <strong style="color:#0d0d0d;">${projectName}</strong>.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="padding:16px 20px;background-color:#F2F2F2;border-bottom:1px solid #E5E5E5;">
          <span style="font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#7F7F7F;">From</span>
          <p style="font-size:15px;font-weight:600;color:#0d0d0d;margin:4px 0 0 0;">${investorName}</p>
          <p style="font-size:13px;color:#7F7F7F;margin:2px 0 0 0;">${investorEmail}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 20px;background-color:#F2F2F2;">
          <span style="font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#7F7F7F;">Message</span>
          <p style="font-size:14px;color:#0d0d0d;margin:4px 0 0 0;white-space:pre-wrap;">${message}</p>
        </td>
      </tr>
    </table>

    <p style="font-size:13px;color:#7F7F7F;margin:0 0 24px 0;">
      Reply directly to this investor's email address to respond.
    </p>

    <a href="${appUrl}/dashboard/projects/${projectId}"
       style="display:inline-block;background-color:#0d0d0d;color:#ffffff;text-decoration:none;padding:14px 28px;font-weight:600;font-size:14px;letter-spacing:0.02em;">
      View in PaperWorking
    </a>
  `;

  const text = [
    `Investor Question`,
    '',
    `${investorName} (${investorEmail}) asked a question about ${projectName}:`,
    '',
    message,
    '',
    `View the deal: ${appUrl}/dashboard/projects/${projectId}`,
  ].join('\n');

  return { subject, html: renderEmailLayout({ title: 'Investor Question', preheader: subject, bodyHtml }), text };
}
