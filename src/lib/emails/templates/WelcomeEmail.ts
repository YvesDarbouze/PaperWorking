import { renderEmailLayout } from './BaseLayout';

/* ═══════════════════════════════════════════════════════
   WelcomeEmail — Phase C (Reinforce)
   
   Sent immediately after registration. Sets the tone
   and nudges the user toward creating their first project.
   ═══════════════════════════════════════════════════════ */

export interface WelcomeEmailProps {
  displayName: string;
  intent?: string;
  appUrl?: string;
}

export function generateWelcomeEmail({
  displayName,
  intent,
  appUrl = 'https://paperworking.co',
}: WelcomeEmailProps): { subject: string; html: string } {
  const firstName = displayName.split(' ')[0] || 'there';

  const intentLine = intent === 'own_properties'
    ? 'Since you already own properties, let\'s get your portfolio loaded so you can see live metrics.'
    : intent === 'past_deals'
      ? 'Let\'s build your track record — enter your first completed deal to get started.'
      : 'Let\'s find your first investment — create a project to start analyzing deals.';

  const bodyHtml = `
    <h1 style="font-size:24px;font-weight:700;color:#0d0d0d;margin:0 0 16px 0;letter-spacing:-0.02em;">
      Welcome to PaperWorking, ${firstName}
    </h1>

    <p style="font-size:15px;color:#595959;margin:0 0 16px 0;line-height:1.7;">
      You've joined the workspace that serious real estate investors use to
      track deals from acquisition through exit — with live metrics that update
      automatically.
    </p>

    <p style="font-size:15px;color:#595959;margin:0 0 24px 0;line-height:1.7;">
      ${intentLine}
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;">
      <tr>
        <td style="padding-right:12px;">
          <a href="${appUrl}/dashboard/projects?wizard=true" class="btn-primary" style="display:inline-block;background-color:#0d0d0d;color:#ffffff;text-decoration:none;padding:14px 28px;font-weight:600;font-size:14px;">
            Create Your First Project
          </a>
        </td>
      </tr>
    </table>

    <hr class="divider" />

    <p style="font-size:15px;font-weight:700;color:#0d0d0d;margin:0 0 12px 0;">
      How the Trial Works:
    </p>
    <ul style="font-size:14px;color:#595959;margin:0 0 24px 0;padding-left:20px;line-height:1.7;">
      <li style="margin-bottom:8px;"><strong>14 Days Free:</strong> You have full access to all features, including unlimited projects and live metric calculations.</li>
      <li style="margin-bottom:8px;"><strong>Simple Billing:</strong> If you stay past day 14, you'll be billed for your selected plan.</li>
      <li style="margin-bottom:0;"><strong>Cancel Anytime:</strong> You can cancel directly from your dashboard settings at any time during the 14 days.</li>
    </ul>

    <hr class="divider" />

    <p style="font-size:13px;color:#7F7F7F;margin:0 0 24px 0;line-height:1.6;">
      <strong>What's next?</strong> Add a property address and a purchase price.
      PaperWorking will calculate your cap rate, cash-on-cash return, and more — instantly.
    </p>

    <p style="font-size:11px;color:#7F7F7F;margin:24px 0 0 0;line-height:1.6;font-style:italic;">
      Credit card required · Cancel before day 15 to avoid charge
    </p>
  `;

  return {
    subject: `Welcome to PaperWorking, ${firstName}`,
    html: renderEmailLayout({
      title: 'Welcome',
      preheader: `Welcome to PaperWorking — let's build your portfolio.`,
      bodyHtml,
      appUrl,
    }),
  };
}
