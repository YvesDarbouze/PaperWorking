import { renderEmailLayout } from './BaseLayout';

export interface DigestItem {
  id: string;
  title: string;
  body: string;
  deepLinkUrl: string;
  createdAt: Date;
}

export interface InboxDigestEmailProps {
  recipientName: string;
  items: DigestItem[];
  appUrl?: string;
}

export function generateInboxDigestEmail({
  recipientName,
  items,
  appUrl = 'https://paperworking.co',
}: InboxDigestEmailProps): { subject: string; html: string } {
  const count = items.length;
  const subject = `[PaperWorking] You have ${count} unread notification${count > 1 ? 's' : ''}`;

  const itemsHtml = items
    .map((item) => {
      const formattedDate = item.createdAt.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      return `
        <div style="border: 1px solid #E5E5E5; padding: 20px; margin-bottom: 16px; background-color: #ffffff; border-radius: 4px;">
          <div style="font-size: 12px; color: #7F7F7F; margin-bottom: 6px; font-weight: 500;">
            ${formattedDate}
          </div>
          <h3 style="font-size: 16px; font-weight: 700; color: #0d0d0d; margin: 0 0 8px 0; letter-spacing: -0.01em;">
            ${item.title}
          </h3>
          <p style="font-size: 14px; color: #595959; margin: 0 0 16px 0; line-height: 1.5;">
            ${item.body}
          </p>
          <a href="${appUrl}${item.deepLinkUrl}" style="display: inline-block; background-color: #0d0d0d; color: #ffffff !important; text-decoration: none; padding: 10px 18px; font-weight: 600; font-size: 13px; letter-spacing: 0.01em;">
            View in PaperWorking
          </a>
        </div>
      `;
    })
    .join('');

  const bodyHtml = `
    <h1 style="font-size: 24px; font-weight: 700; color: #0d0d0d; margin: 0 0 8px 0; letter-spacing: -0.02em;">
      Unread Activity Digest
    </h1>
    <p style="font-size: 15px; color: #595959; margin: 0 0 24px 0; line-height: 1.6;">
      Hi ${recipientName}, you have <strong>${count}</strong> unread action items and notifications waiting in your PaperWorking inbox. Here is a summary:
    </p>

    <div style="margin-bottom: 24px;">
      ${itemsHtml}
    </div>

    <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #E5E5E5;">
      <a href="${appUrl}/dashboard" class="btn-primary" style="display: inline-block; background-color: #0d0d0d; color: #ffffff; text-decoration: none; padding: 14px 28px; font-weight: 600; font-size: 14px;">
        Go to Dashboard
      </a>
    </div>
  `;

  return {
    subject,
    html: renderEmailLayout({
      title: 'Activity Digest',
      preheader: `You have ${count} unread notifications waiting in PaperWorking.`,
      bodyHtml,
      appUrl,
    }),
  };
}
