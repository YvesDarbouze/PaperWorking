import { renderEmailLayout } from './BaseLayout';

/* ═══════════════════════════════════════════════════════
   NudgeEmail — Phase C (Reinforce)
   
   Sent 48-72 hours after signup if the user hasn't
   created a project or lit their first metric.
   Gentle re-engagement without being pushy.
   ═══════════════════════════════════════════════════════ */

export interface NudgeEmailProps {
  displayName: string;
  daysInactive: number;
  intent?: string;
  appUrl?: string;
}

export function generateNudgeEmail({
  displayName,
  daysInactive,
  intent,
  appUrl = 'https://paperworking.co',
}: NudgeEmailProps): { subject: string; html: string } {
  const firstName = displayName.split(' ')[0] || 'there';

  // Contextual nudge based on intent
  const nudgeMessage = intent === 'own_properties'
    ? 'Import your existing properties to see live cash flow metrics and portfolio health.'
    : intent === 'past_deals'
      ? 'Enter your first completed deal — building a track record takes just 2 minutes.'
      : 'Most investors start by entering a property address and purchase price. It takes under a minute.';

  const bodyHtml = `
    <h1 style="font-size:22px;font-weight:700;color:#0d0d0d;margin:0 0 8px 0;letter-spacing:-0.02em;">
      Your workspace is ready, ${firstName}
    </h1>
    <p style="font-size:15px;color:#595959;margin:0 0 16px 0;line-height:1.7;">
      You signed up ${daysInactive} day${daysInactive !== 1 ? 's' : ''} ago but haven't created your first project yet.
      No pressure — we just wanted to make sure you didn't miss the best part.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 24px 0;">
      <tr>
        <td style="background-color:#F8F8F8;padding:20px 24px;border:1px solid #E5E5E5;">
          <p style="font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#7F7F7F;margin:0 0 8px 0;">
            Quick start
          </p>
          <p style="font-size:14px;color:#595959;margin:0;line-height:1.6;">
            ${nudgeMessage}
          </p>
        </td>
      </tr>
    </table>

    <a href="${appUrl}/dashboard/projects?wizard=true" class="btn-primary" style="display:inline-block;background-color:#0d0d0d;color:#ffffff;text-decoration:none;padding:14px 28px;font-weight:600;font-size:14px;">
      Create Your First Project
    </a>

    <hr class="divider" />

    <p style="font-size:13px;color:#7F7F7F;margin:0;line-height:1.6;">
      Not ready yet? No worries — your workspace isn't going anywhere.
      Reply to this email if you have questions.
    </p>
  `;

  return {
    subject: `${firstName}, your workspace is waiting`,
    html: renderEmailLayout({
      title: 'Getting Started',
      preheader: `Your PaperWorking workspace is set up — create your first project to see live metrics.`,
      bodyHtml,
      appUrl,
    }),
  };
}
