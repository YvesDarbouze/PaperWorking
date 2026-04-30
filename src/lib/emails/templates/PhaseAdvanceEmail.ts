import { renderEmailLayout } from './BaseLayout';

/**
 * PhaseAdvanceEmail
 * Sent when a project advances to the next lifecycle phase.
 */

export interface PhaseAdvanceEmailProps {
  projectName: string;
  projectId: string;
  fromPhase: string;
  toPhase: string;
  advancedBy: string;
  appUrl?: string;
}

const PHASE_LABELS: Record<string, string> = {
  'phase-1': 'Phase 1 — Acquisition',
  'phase-2': 'Phase 2 — Renovation',
  'phase-3': 'Phase 3 — Hold',
  'phase-4': 'Phase 4 — Exit',
};

export function generatePhaseAdvanceEmail({
  projectName,
  projectId,
  fromPhase,
  toPhase,
  advancedBy,
  appUrl = 'https://paperworking.co',
}: PhaseAdvanceEmailProps): { subject: string; html: string } {
  const fromLabel = PHASE_LABELS[fromPhase] || fromPhase;
  const toLabel = PHASE_LABELS[toPhase] || toPhase;

  const subject = `${projectName} — Advanced to ${toLabel}`;

  const bodyHtml = `
    <h1 style="font-size:22px;font-weight:700;color:#0d0d0d;margin:0 0 8px 0;letter-spacing:-0.02em;">
      Phase Advance
    </h1>
    <p style="font-size:14px;color:#7F7F7F;margin:0 0 24px 0;">
      ${advancedBy} advanced this project to the next phase.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="padding:16px 20px;background-color:#F2F2F2;border-left:3px solid #CCCCCC;">
          <span style="font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#7F7F7F;">From</span>
          <p style="font-size:15px;font-weight:600;color:#595959;margin:4px 0 0 0;">${fromLabel}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 20px;background-color:#F2F2F2;border-left:3px solid #0d0d0d;">
          <span style="font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#7F7F7F;">To</span>
          <p style="font-size:15px;font-weight:700;color:#0d0d0d;margin:4px 0 0 0;">${toLabel}</p>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="padding:16px 20px;background-color:#F2F2F2;">
          <span style="font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#7F7F7F;">Project</span>
          <p style="font-size:15px;font-weight:600;color:#0d0d0d;margin:4px 0 0 0;">${projectName}</p>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 24px 0;font-size:14px;color:#595959;">
      Your workspace has been updated with the new phase tools and checklists. Log in to review.
    </p>

    <a href="${appUrl}/dashboard/projects/${projectId}" class="btn-primary" style="display:inline-block;background-color:#0d0d0d;color:#ffffff;text-decoration:none;padding:14px 28px;font-weight:600;font-size:14px;">
      View Workspace
    </a>
  `;

  return {
    subject,
    html: renderEmailLayout({
      title: 'Phase Advance',
      preheader: `${projectName} moved from ${fromLabel} to ${toLabel}`,
      bodyHtml,
      appUrl,
    }),
  };
}
