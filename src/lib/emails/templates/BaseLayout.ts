/**
 * BaseLayout — Shared Antigravity Email Template Wrapper
 *
 * Provides a consistent, branded HTML shell for all transactional emails.
 * Palette: #0d0d0d (primary), #595959 (text), #7F7F7F (secondary), #F2F2F2 (canvas)
 * Typography: Hanken Grotesk via Google Fonts, system fallbacks
 */

export interface BaseLayoutProps {
  title: string;
  preheader?: string;
  bodyHtml: string;
  footerHtml?: string;
  appUrl?: string;
}

export function renderEmailLayout({
  title,
  preheader,
  bodyHtml,
  footerHtml,
  appUrl = 'https://paperworking.co',
}: BaseLayoutProps): string {
  const defaultFooter = `
    <p style="margin:0 0 8px 0;">You're receiving this because you're a member of a PaperWorking project.</p>
    <p style="margin:0;">
      <a href="${appUrl}/dashboard/settings/notifications" style="color:#7F7F7F;text-decoration:underline;">Manage preferences</a>
      &nbsp;&middot;&nbsp;
      <a href="${appUrl}" style="color:#7F7F7F;text-decoration:underline;">paperworking.co</a>
    </p>
  `;

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${title}</title>
  ${preheader ? `<!--[if !mso]><!--><span style="display:none;max-height:0;overflow:hidden;mso-hide:all">${preheader}</span><!--<![endif]-->` : ''}
  <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    /* Reset */
    body, table, td, p, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }

    body {
      margin: 0;
      padding: 0;
      width: 100% !important;
      background-color: #F2F2F2;
      font-family: 'Hanken Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #595959;
    }

    .email-container {
      max-width: 600px;
      margin: 0 auto;
    }

    .btn-primary {
      display: inline-block;
      background-color: #0d0d0d;
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 28px;
      font-weight: 600;
      font-size: 14px;
      letter-spacing: 0.02em;
    }

    .btn-primary:hover {
      background-color: #333333;
    }

    .divider {
      border: none;
      border-top: 1px solid #E5E5E5;
      margin: 24px 0;
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#F2F2F2;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F2F2F2;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border:1px solid #E5E5E5;">

          <!-- Header -->
          <tr>
            <td style="padding:32px 40px 24px 40px;border-bottom:1px solid #E5E5E5;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:20px;font-weight:700;letter-spacing:-0.02em;color:#0d0d0d;">PaperWorking</span>
                  </td>
                  <td align="right">
                    <span style="font-size:11px;font-weight:500;letter-spacing:0.12em;text-transform:uppercase;color:#7F7F7F;">
                      ${title}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px 32px 40px;border-top:1px solid #E5E5E5;font-size:12px;color:#7F7F7F;line-height:1.5;">
              ${footerHtml || defaultFooter}
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
