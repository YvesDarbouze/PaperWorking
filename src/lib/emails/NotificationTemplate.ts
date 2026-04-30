import { renderEmailLayout } from './templates/BaseLayout';

/**
 * NotificationTemplate — Refactored
 * Now uses the shared BaseLayout for visual consistency across all emails.
 */

export interface NotificationTemplateProps {
  senderName: string;
  projectName?: string;
  messageSnippet: string;
  projectId: string;
  appUrl: string;
}

export function generateNotificationEmailHtml({
  senderName,
  projectName,
  messageSnippet,
  projectId,
  appUrl,
}: NotificationTemplateProps): string {
  const projectRef = projectName ? `regarding <strong style="color:#0d0d0d;">${projectName}</strong>` : 'in your project';

  const bodyHtml = `
    <h1 style="font-size:22px;font-weight:700;color:#0d0d0d;margin:0 0 8px 0;letter-spacing:-0.02em;">
      New Message from ${senderName}
    </h1>
    <p style="font-size:14px;color:#595959;margin:0 0 24px 0;">
      You have a new unread message ${projectRef}.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="padding:16px 20px;background-color:#F2F2F2;border-left:3px solid #0d0d0d;font-size:14px;color:#595959;font-style:italic;line-height:1.6;">
          "${messageSnippet}"
        </td>
      </tr>
    </table>

    <p style="margin:0 0 24px 0;font-size:14px;color:#595959;">
      Click the button below to view the full conversation and reply.
    </p>

    <a href="${appUrl}/dashboard/inbox?thread=${projectId}" class="btn-primary" style="display:inline-block;background-color:#0d0d0d;color:#ffffff;text-decoration:none;padding:14px 28px;font-weight:600;font-size:14px;">
      View Conversation
    </a>
  `;

  return renderEmailLayout({
    title: 'New Message',
    preheader: `${senderName}: "${messageSnippet.slice(0, 80)}"`,
    bodyHtml,
    appUrl,
  });
}
