import { renderEmailLayout } from './BaseLayout';

/**
 * DocumentUploadEmail
 * Sent when a team member uploads a document to the project vault.
 */

export interface DocumentUploadEmailProps {
  projectName: string;
  projectId: string;
  documentName: string;
  category: string;
  uploaderName: string;
  appUrl?: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  'Contract':    '📄',
  'Inspection':  '🔍',
  'Title':       '📋',
  'Insurance':   '🛡️',
  'Financial':   '💰',
  'Legal':       '⚖️',
  'Permit':      '🏗️',
  'Appraisal':   '📊',
};

export function generateDocumentUploadEmail({
  projectName,
  projectId,
  documentName,
  category,
  uploaderName,
  appUrl = 'https://paperworking.co',
}: DocumentUploadEmailProps): { subject: string; html: string } {
  const icon = CATEGORY_ICONS[category] || '📎';

  const subject = `New Document — ${documentName}`;

  const bodyHtml = `
    <h1 style="font-size:22px;font-weight:700;color:#0d0d0d;margin:0 0 8px 0;letter-spacing:-0.02em;">
      Document Uploaded
    </h1>
    <p style="font-size:14px;color:#7F7F7F;margin:0 0 24px 0;">
      ${uploaderName} added a new document to <strong style="color:#0d0d0d;">${projectName}</strong>.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="padding:20px;background-color:#F2F2F2;border-left:3px solid #0d0d0d;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="40" valign="top">
                <span style="font-size:24px;">${icon}</span>
              </td>
              <td>
                <span style="font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#7F7F7F;">${category}</span>
                <p style="font-size:15px;font-weight:600;color:#0d0d0d;margin:4px 0 0 0;">${documentName}</p>
                <p style="font-size:12px;color:#7F7F7F;margin:4px 0 0 0;">Uploaded by ${uploaderName}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 24px 0;font-size:14px;color:#595959;">
      Review the document in your project vault to ensure compliance and accuracy.
    </p>

    <a href="${appUrl}/dashboard/projects/${projectId}?tab=vault" class="btn-primary" style="display:inline-block;background-color:#0d0d0d;color:#ffffff;text-decoration:none;padding:14px 28px;font-weight:600;font-size:14px;">
      View in Vault
    </a>
  `;

  return {
    subject,
    html: renderEmailLayout({
      title: 'Document Upload',
      preheader: `${uploaderName} uploaded "${documentName}" to ${projectName}`,
      bodyHtml,
      appUrl,
    }),
  };
}
