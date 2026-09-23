import { renderEmailLayout } from './BaseLayout';

/* ═══════════════════════════════════════════════════════
   SecondProjectEmail — Phase C (Reinforce)
   
   Sent after the user creates their second project.
   Encourages portfolio-level thinking and comparison.
   ═══════════════════════════════════════════════════════ */

export interface SecondProjectEmailProps {
  displayName: string;
  projectName: string;
  totalProjects: number;
  appUrl?: string;
}

export function generateSecondProjectEmail({
  displayName,
  projectName,
  totalProjects,
  appUrl = 'https://paperworking.co',
}: SecondProjectEmailProps): { subject: string; html: string } {
  const firstName = displayName.split(' ')[0] || 'there';

  const bodyHtml = `
    <h1 style="font-size:24px;font-weight:700;color:#0d0d0d;margin:0 0 8px 0;letter-spacing:-0.02em;">
      Portfolio growing — ${totalProjects} projects
    </h1>
    <p style="font-size:15px;color:#595959;margin:0 0 16px 0;line-height:1.7;">
      ${firstName}, you just added <strong>${projectName}</strong> to your workspace.
      With multiple projects, you can now compare deals side-by-side and spot the best opportunities.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 24px 0;">
      <tr>
        <td style="background-color:#F8F8F8;padding:20px 24px;border:1px solid #E5E5E5;">
          <p style="font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#7F7F7F;margin:0 0 8px 0;">
            Unlocked
          </p>
          <p style="font-size:15px;font-weight:600;color:#0d0d0d;margin:0 0 4px 0;">
            Portfolio Comparison
          </p>
          <p style="font-size:13px;color:#595959;margin:0;line-height:1.5;">
            Compare cap rates, cash-on-cash returns, and equity across all your deals in one view.
          </p>
        </td>
      </tr>
    </table>

    <a href="${appUrl}/dashboard" class="btn-primary" style="display:inline-block;background-color:#0d0d0d;color:#ffffff;text-decoration:none;padding:14px 28px;font-weight:600;font-size:14px;">
      View Your Portfolio
    </a>

    <hr class="divider" />

    <p style="font-size:13px;color:#7F7F7F;margin:0;line-height:1.6;">
      <strong>Pro tip:</strong> Invite a vendor or contractor to your project to start
      collecting bids and tracking rehab costs automatically.
    </p>
  `;

  return {
    subject: `Your portfolio is growing — ${totalProjects} projects`,
    html: renderEmailLayout({
      title: 'Portfolio Update',
      preheader: `You added ${projectName} — compare deals side by side.`,
      bodyHtml,
      appUrl,
    }),
  };
}
