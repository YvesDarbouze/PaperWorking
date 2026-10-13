/**
 * Project Invitation Email Template for Team Members & External Vendors/Guests.
 *
 * Requirements:
 * - Professional, clean, and data-dense (Radix Lyra neutral palette).
 * - Distinguishes between internal Investment Team vs external Vendor/Guest.
 * - Displays project name, inviter name, role/guest type, and optional personal note.
 * - Explicitly explains permission level:
 *   - Internal Team: full access to underwriting, financials, documents, and chat.
 *   - Vendor/Guest: restricted Vendor-view access (only items shared with vendors).
 * - Zero em dashes (R-02 compliance), zero AI slop, zero empty buzzwords.
 */

import { wrapInBaseEmail } from './baseEmail';

export interface ProjectInvitationEmailProps {
  recipientName: string;
  recipientEmail: string;
  inviterName: string;
  projectName: string;
  projectId: string;
  roleOrGuestType: string;
  isGuest: boolean;
  company?: string;
  personalNote?: string;
  appUrl?: string;
}

export function renderProjectInvitationEmailHtml(props: ProjectInvitationEmailProps): string {
  const appUrl = props.appUrl || 'https://paperworking.co';
  const projectUrl = `${appUrl}/project/${props.projectId}`;
  const firstName = props.recipientName.split(' ')[0] || 'there';

  const bodyHtml = `
    <p style="font-size: 16px; line-height: 1.5; margin: 0 0 16px 0; font-weight: 500;">
      Hello ${firstName},
    </p>

    <p style="margin: 0 0 16px 0; line-height: 1.6;">
      <strong>${props.inviterName}</strong> has invited you to collaborate on the project <strong>"${props.projectName}"</strong> on PaperWorking.
    </p>

    <div style="background-color: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.1); padding: 16px; margin: 20px 0;">
      <p style="margin: 0 0 8px 0; font-size: 12px; font-family: monospace; color: #a1a1aa; text-transform: uppercase;">
        Collaboration Role
      </p>
      <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: 600; color: #f4f4f5;">
        ${props.roleOrGuestType} (${props.isGuest ? 'Vendor / External Partner' : 'Investment Team Member'})${props.company ? ` • ${props.company}` : ''}
      </p>
      <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #d4d4d8;">
        ${
          props.isGuest
            ? 'You have been granted restricted Vendor-view access. You can view work assigned to you, access designated files, and collaborate on shared topics while internal investment finances remain private.'
            : 'You have been granted full Investment Team access to manage tasks, review financial underwriting, track lifecycle stages, and collaborate in real time.'
        }
      </p>
    </div>

    ${
      props.personalNote
        ? `
      <div style="border-left: 2px solid rgba(255, 255, 255, 0.3); padding-left: 14px; margin: 20px 0;">
        <p style="margin: 0 0 4px 0; font-size: 11px; font-family: monospace; color: #a1a1aa; text-transform: uppercase;">Note from ${props.inviterName}:</p>
        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #f4f4f5; font-style: italic;">
          "${props.personalNote}"
        </p>
      </div>
    `
        : ''
    }

    <!-- Call to Action -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
      <tr>
        <td align="center" style="background-color: #f4f4f5;">
          <a href="${projectUrl}" target="_blank" style="font-size: 13px; font-weight: 600; color: #09090b; text-decoration: none; padding: 12px 28px; display: inline-block; border: 1px solid #ffffff;">
            Open Project Workspace
          </a>
        </td>
      </tr>
    </table>

    <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.6; color: #a1a1aa;">
      If you do not yet have a PaperWorking login with this email address, you will be prompted to set up your account upon clicking the link above.
    </p>

    <p style="margin: 24px 0 0 0; font-size: 13px; line-height: 1.6; color: #a1a1aa;">
      PaperWorking Team<br />
      <a href="mailto:hi@paperworking.co" style="color: #f4f4f5; text-decoration: underline;">hi@paperworking.co</a>
    </p>
  `;

  return wrapInBaseEmail({
    title: `Invitation to collaborate on ${props.projectName}`,
    previewText: `${props.inviterName} invited you to collaborate on ${props.projectName} on PaperWorking.`,
    bodyHtml,
    recipientEmail: props.recipientEmail,
    theme: 'dark',
  });
}

export function renderProjectInvitationEmailPlainText(props: ProjectInvitationEmailProps): string {
  const appUrl = props.appUrl || 'https://paperworking.co';
  const projectUrl = `${appUrl}/project/${props.projectId}`;
  const firstName = props.recipientName.split(' ')[0] || 'there';

  return `Hello ${firstName},

${props.inviterName} has invited you to collaborate on "${props.projectName}" on PaperWorking.

Role: ${props.roleOrGuestType} (${props.isGuest ? 'Vendor / External Partner' : 'Investment Team Member'})

Access Level:
${
  props.isGuest
    ? 'You have been granted restricted Vendor-view access. You can view work assigned to you, access designated files, and collaborate on shared topics while internal investment finances remain private.'
    : 'You have been granted full Investment Team access to manage tasks, review financial underwriting, track lifecycle stages, and collaborate in real time.'
}
${props.personalNote ? `\nNote from ${props.inviterName}:\n"${props.personalNote}"\n` : ''}
Accept your invitation and open the project:
${projectUrl}

If you do not yet have an account, you will be prompted to set up your password upon visiting the link.

PaperWorking - Project management for serious real estate investors.
https://paperworking.co
`;
}
