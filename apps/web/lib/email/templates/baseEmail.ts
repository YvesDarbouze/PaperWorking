/**
 * Shared HTML & Text Email Layout Engine for PaperWorking.
 *
 * Design System Compliance:
 * - Radix Lyra Neutral palette (dark theme with #0b0f17 bg and #121014 card, or light neutral)
 * - Official PaperWorking brand logo (https://paperworking.co/brand/logo-dark.png or logo-light.png)
 * - Strict Anti-Slop: Zero empty buzzwords, zero em dashes (R-02), zero #00DD94 neon greens
 * - Mobile-first responsive email table architecture (fluid w-full max-w-[600px])
 */

export interface BaseEmailOptions {
  title: string;
  previewText?: string;
  bodyHtml: string;
  recipientEmail?: string;
  unsubscribeUrl?: string;
  theme?: 'dark' | 'light';
  includeFooter?: boolean;
}

// Note: In public/brand, 'logo-light.png' has white lettering (for dark surfaces),
// while 'logo-dark.png' has dark lettering (for light surfaces).
export const PAPERWORKING_LOGO_WHITE_LETTERS = 'https://paperworking.co/brand/logo-light.png';
export const PAPERWORKING_LOGO_DARK_LETTERS = 'https://paperworking.co/brand/logo-dark.png';
export const PAPERWORKING_LOGO_DARK_URL = PAPERWORKING_LOGO_WHITE_LETTERS;
export const PAPERWORKING_LOGO_LIGHT_URL = PAPERWORKING_LOGO_DARK_LETTERS;
export const PAPERWORKING_ICON_URL = 'https://paperworking.co/brand/icon-white.png';

/**
 * Wraps content in the official PaperWorking branded HTML shell.
 */
export function wrapInBaseEmail(options: BaseEmailOptions): string {
  const isDark = options.theme !== 'light';
  const bgColor = isDark ? '#09090b' : '#f4f4f5';
  const cardBg = isDark ? '#121215' : '#ffffff';
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : '#e4e4e7';
  const textColor = isDark ? '#f4f4f5' : '#18181b';
  const mutedColor = isDark ? '#a1a1aa' : '#71717a';
  const footerBg = isDark ? '#0d0d10' : '#fafafa';
  const logoUrl = isDark ? PAPERWORKING_LOGO_WHITE_LETTERS : PAPERWORKING_LOGO_DARK_LETTERS;

  const defaultUnsub = options.recipientEmail
    ? `https://paperworking.co/unsubscribe?email=${encodeURIComponent(options.recipientEmail)}`
    : 'https://paperworking.co/unsubscribe';
  const unsubUrl = options.unsubscribeUrl || defaultUnsub;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${escapeHtml(options.title)}</title>
  ${options.previewText ? `<span style="display:none;font-size:0px;line-height:0px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;mso-hide:all;">${escapeHtml(options.previewText)}</span>` : ''}
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: ${bgColor}; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; border-radius: 0 !important; border-left: none !important; border-right: none !important; }
      .email-content { padding: 24px 20px !important; }
      .email-header { padding: 20px 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 32px 12px; background-color: ${bgColor};">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 0;">
        <!-- Email Card Container -->
        <table role="presentation" class="email-container" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: ${cardBg}; border-radius: 12px; border: 1px solid ${borderColor}; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.25);">
          <!-- Header with Official Logo -->
          <tr>
            <td class="email-header" style="padding: 24px 32px; border-bottom: 1px solid ${borderColor}; background-color: ${isDark ? '#141418' : '#fafafa'};">
              <a href="https://paperworking.co" target="_blank" style="text-decoration: none; display: inline-block;">
                <img src="${logoUrl}" alt="PaperWorking" width="168" height="27" style="display: block; width: 168px; max-width: 100%; height: auto; border: 0;" />
              </a>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td class="email-content" style="padding: 32px 32px; color: ${textColor}; font-size: 15px; line-height: 1.6;">
              ${options.bodyHtml}
            </td>
          </tr>

          <!-- Footer -->
          ${
            options.includeFooter !== false
              ? `
          <tr>
            <td style="padding: 24px 32px; background-color: ${footerBg}; border-top: 1px solid ${borderColor}; font-size: 12px; line-height: 1.6; color: ${mutedColor}; text-align: left;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="color: ${mutedColor}; font-size: 12px;">
                    <div style="font-weight: 600; color: ${textColor}; margin-bottom: 4px;">PaperWorking</div>
                    <div>Institutional project management for real estate investors.</div>
                    <div style="margin-top: 8px;">
                      <a href="${unsubUrl}" style="color: ${mutedColor}; text-decoration: underline;">Unsubscribe</a> &bull; 
                      <a href="https://paperworking.co/privacy" style="color: ${mutedColor}; text-decoration: underline;">Privacy Policy</a> &bull; 
                      <a href="https://paperworking.co/terms" style="color: ${mutedColor}; text-decoration: underline;">Terms of Service</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
              : ''
          }
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
