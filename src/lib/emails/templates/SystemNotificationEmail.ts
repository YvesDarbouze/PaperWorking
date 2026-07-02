import { renderEmailLayout } from './BaseLayout';

export interface SystemNotificationEmailProps {
  title: string;
  body: string;
  deepLinkUrl: string;
  appUrl?: string;
}

export function generateSystemNotificationEmail({
  title,
  body,
  deepLinkUrl,
  appUrl = 'https://paperworking.co',
}: SystemNotificationEmailProps): { subject: string; html: string } {
  const subject = title;

  const bodyHtml = `
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
