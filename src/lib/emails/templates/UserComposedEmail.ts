import { renderEmailLayout } from './BaseLayout';

/**
 * UserComposedEmail
 * Wraps user-written messages sent from the Command Center inbox.
 * Includes [ref:deal_*] tracking token for reply routing.
 */

export interface UserComposedEmailProps {
  senderName: string;
  senderOrganization?: string;
  projectName?: string;
  projectId: string;
  messageBody: string;
  appUrl?: string;
}

export function generateUserComposedEmail({
  senderName,
  senderOrganization,
  projectName,
  projectId,
  messageBody,
  appUrl = 'https://paperworking.co',
}: UserComposedEmailProps): string {
  const orgLine = senderOrganization
    ? `<span style="font-size:12px;color:#7F7F7F;">${senderOrganization}</span>`
    : '';

  const projectLine = projectName
    ? `<p style="font-size:12px;color:#7F7F7F;margin:0 0 16px 0;">
        Regarding <strong style="color:#595959;">${projectName}</strong>
      </p>`
    : '';

  const bodyHtml = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td>
          <span style="font-size:15px;font-weight:600;color:#0d0d0d;">${senderName}</span>
          ${orgLine ? `<br/>${orgLine}` : ''}
        </td>
      </tr>
    </table>

    ${projectLine}

    <div style="font-size:14px;color:#595959;line-height:1.7;white-space:pre-wrap;">
${messageBody}
    </div>

    <hr style="border:none;border-top:1px solid #E5E5E5;margin:32px 0;" />

    <p style="font-size:13px;color:#7F7F7F;margin:0 0 16px 0;">
      Reply directly to this email or use the button below to respond in PaperWorking.
    </p>

    <a href="${appUrl}/dashboard/inbox?thread=${projectId}" class="btn-primary" style="display:inline-block;background-color:#0d0d0d;color:#ffffff;text-decoration:none;padding:14px 28px;font-weight:600;font-size:14px;">
      Reply in App
    </a>
  `;

  return renderEmailLayout({
    title: 'Message',
    preheader: `${senderName}: ${messageBody.slice(0, 100)}`,
    bodyHtml,
    appUrl,
  });
}
