import { CAN_SPAM_PHYSICAL_ADDRESS, MessageClass } from '@/lib/email/envelopeContract';

/**
 * BaseLayout — Shared PaperWorking Email Template Wrapper (EM Series v2 · EM-5, EM-6)
 *
 * Compiles UX-0 design system tokens into bulletproof table-based HTML for 8-client email rendering:
 * - Canvas: #F9F9FB
 * - Card: #FFFFFF, border 1px solid #EAEBF0, radius 8px
 * - Typography: Inter / Hanken Grotesk, #0D0D12 (headline), #454955 (body), #7F7F7F (muted)
 * - Buttons: #0D0D12 bg, #FFFFFF text, 600 weight, 8px radius
 * - Dark Mode Safe: explicit color overrides prevent Apple Mail / Outlook color distortion
 * - Message Class Footers: Essential (Class E), Optional (Class O), Commercial (Class C with CAN-SPAM)
 */

export interface BaseLayoutProps {
  title: string;
  preheader?: string;
  bodyHtml: string;
  footerHtml?: string;
  appUrl?: string;
  messageClass?: MessageClass;
  unsubscribeUrl?: string;
}

export function renderEmailLayout({
  title,
  preheader,
  bodyHtml,
  footerHtml,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://paperworking.co',
  messageClass = 'O',
  unsubscribeUrl,
}: BaseLayoutProps): string {
  const unsubsUrl = unsubscribeUrl || `${appUrl}/dashboard/settings/notifications`;

  let classFooter = '';
  if (messageClass === 'E') {
    classFooter = `
      <p style="margin:0 0 6px 0;color:#8E909B;">This is a critical security or billing notification regarding your PaperWorking account.</p>
      <p style="margin:0;color:#8E909B;">
        Questions? Contact <a href="mailto:hi@paperworking.co" style="color:#0D0D12;text-decoration:underline;">hi@paperworking.co</a>
      </p>
    `;
  } else if (messageClass === 'C') {
    classFooter = `
      <p style="margin:0 0 6px 0;color:#8E909B;">You received this email because of your activity on PaperWorking.</p>
      <p style="margin:0 0 6px 0;color:#8E909B;">
        <a href="${unsubsUrl}" style="color:#0D0D12;text-decoration:underline;">Unsubscribe</a> &middot;
        <a href="${appUrl}/dashboard/settings/notifications" style="color:#0D0D12;text-decoration:underline;">Notification Preferences</a>
      </p>
      <p style="margin:6px 0 0 0;font-size:11px;color:#A2A4B0;">
        ${CAN_SPAM_PHYSICAL_ADDRESS}
      </p>
    `;
  } else {
    // Class O (Optional)
    classFooter = `
      <p style="margin:0 0 6px 0;color:#8E909B;">You are receiving project & portfolio notifications from PaperWorking.</p>
      <p style="margin:0;color:#8E909B;">
        <a href="${unsubsUrl}" style="color:#0D0D12;text-decoration:underline;">Unsubscribe</a> &middot;
        <a href="${appUrl}/dashboard/settings/notifications" style="color:#0D0D12;text-decoration:underline;">Preferences</a> &middot;
        <a href="mailto:hi@paperworking.co" style="color:#0D0D12;text-decoration:underline;">Support</a>
      </p>
    `;
  }

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${title}</title>
  ${
    preheader
      ? `<!--[if !mso]><!--><span style="display:none;max-height:0;overflow:hidden;mso-hide:all">${preheader}</span><!--<![endif]-->`
      : ''
  }
  <style>
    body, table, td, p, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }

    body {
      margin: 0;
      padding: 0;
      width: 100% !important;
      background-color: #F9F9FB;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #454955;
    }

    .email-container {
      max-width: 600px;
      margin: 0 auto;
    }

    .btn-primary {
      display: inline-block;
      background-color: #0D0D12;
      color: #FFFFFF !important;
      text-decoration: none;
      padding: 13px 26px;
      font-weight: 600;
      font-size: 13px;
      letter-spacing: 0.02em;
      border-radius: 6px;
    }

    .btn-secondary {
      display: inline-block;
      background-color: #FFFFFF;
      color: #0D0D12 !important;
      text-decoration: none;
      padding: 12px 24px;
      font-weight: 600;
      font-size: 13px;
      border: 1px solid #EAEBF0;
      border-radius: 6px;
    }

    .divider {
      border: none;
      border-top: 1px solid #EAEBF0;
      margin: 24px 0;
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#F9F9FB;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F9F9FB;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border:1px solid #EAEBF0;border-radius:8px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="padding:28px 36px 20px 36px;border-bottom:1px solid #EAEBF0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:18px;font-weight:700;color:#0D0D12;letter-spacing:-0.03em;">Paper<span style="font-weight:300;">Working</span></span>
                  </td>
                  <td align="right">
                    <span style="font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#8E909B;">
                      ${title}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding:32px 36px;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 36px 32px 36px;border-top:1px solid #EAEBF0;font-size:12px;color:#8E909B;line-height:1.5;">
              ${footerHtml || classFooter}
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Strips HTML tags into clean plain-text fallback (F-3, Rule 6).
 */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1[^>]*>(.*?)<\/a>/gi, '$3 ($2)')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n$1\n\n')
    .replace(/<hr[^>]*>/gi, '\n---\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&middot;/g, '·')
    .replace(/&copy;/g, '©')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n\s+\n/g, '\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
