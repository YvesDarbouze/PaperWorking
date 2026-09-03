import React from 'react';

export interface DealBroadcastEmailProps {
  dealName: string;
  dealAddress: string;
  dealSlug: string;
  purchasePrice: number;
  projectedRoi: number;
  senderName: string;
  senderEmail: string;
  subject: string;
  message: string;
  token: string;
  includeBusinessCard?: boolean;
  businessCard?: {
    name: string;
    email: string;
    company?: string;
    phone?: string;
    investmentCriteria?: string;
  };
  baseUrl?: string;
}

export function formatDealCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function DealBroadcastEmail({
  dealName,
  dealAddress,
  dealSlug,
  purchasePrice,
  projectedRoi,
  senderName,
  senderEmail,
  subject,
  message,
  token,
  includeBusinessCard = true,
  businessCard,
  baseUrl = 'https://paperworking.com',
}: DealBroadcastEmailProps) {
  const externalLink = `${baseUrl}/deals/${dealSlug}/external?token=${encodeURIComponent(token)}&broadcast=true`;
  const formattedPrice = formatDealCurrency(purchasePrice);
  const formattedRoi = `${Number(projectedRoi).toFixed(1)}%`;

  return (
    <div
      style={{
        backgroundColor: '#0b0f17',
        color: '#ffffff',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        margin: 0,
        padding: '32px 16px',
      }}
    >
      <table
        align="center"
        border={0}
        cellPadding={0}
        cellSpacing={0}
        style={{
          maxWidth: '600px',
          width: '100%',
          margin: '0 auto',
          backgroundColor: '#121014',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <tbody>
          <tr>
            <td style={{ padding: '24px 32px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#00DD94', letterSpacing: '-0.02em' }}>
                PaperWorking
              </div>
            </td>
          </tr>

          {/* Subject & Subtitle */}
          <tr>
            <td style={{ padding: '32px 32px 16px 32px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#ffffff', margin: '0 0 8px 0', lineHeight: 1.3 }}>
                {subject}
              </h1>
              <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0 }}>
                {senderName} shared an underwriting analysis on PaperWorking.
              </p>
            </td>
          </tr>

          {/* Sender Message Block (Glass Card) */}
          {message && (
            <tr>
              <td style={{ padding: '8px 32px 24px 32px' }}>
                <div
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '16px',
                    color: '#e2e8f0',
                    fontSize: '14px',
                    lineHeight: 1.5,
                  }}
                >
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#00DD94', marginBottom: '6px', fontWeight: 600 }}>
                    Note from {senderName}
                  </div>
                  {message}
                </div>
              </td>
            </tr>
          )}

          {/* Deal Teaser */}
          <tr>
            <td style={{ padding: '0 32px 24px 32px' }}>
              <div
                style={{
                  backgroundColor: 'rgba(0, 221, 148, 0.04)',
                  border: '1px solid rgba(0, 221, 148, 0.2)',
                  borderRadius: '14px',
                  padding: '20px',
                }}
              >
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: '4px' }}>
                  Real Estate Opportunity
                </div>
                <div style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff', marginBottom: '4px' }}>
                  {dealName}
                </div>
                <div style={{ fontSize: '13px', color: '#cbd5e1', marginBottom: '16px' }}>
                  {dealAddress}
                </div>

                <table width="100%" border={0} cellPadding={0} cellSpacing={0}>
                  <tbody>
                    <tr>
                      <td style={{ width: '50%', paddingRight: '8px' }}>
                        <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8' }}>Purchase Price</div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#ffffff', marginTop: '2px' }}>{formattedPrice}</div>
                      </td>
                      <td style={{ width: '50%', paddingLeft: '8px' }}>
                        <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8' }}>Projected ROI</div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#00DD94', marginTop: '2px' }}>{formattedRoi}</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </td>
          </tr>

          {/* Sender Business Card (if included) */}
          {includeBusinessCard && (
            <tr>
              <td style={{ padding: '0 32px 24px 32px' }}>
                <div
                  data-testid="business-card-section"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '16px',
                  }}
                >
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>
                    Lead Investor Contact
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>
                    {businessCard?.name || senderName}
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                    {businessCard?.company || 'PaperWorking Capital Partner'} · {businessCard?.email || senderEmail}
                  </div>
                  {businessCard?.phone && (
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                      Phone: {businessCard.phone}
                    </div>
                  )}
                  {businessCard?.investmentCriteria && (
                    <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '6px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '6px' }}>
                      Criteria: {businessCard.investmentCriteria}
                    </div>
                  )}
                </div>
              </td>
            </tr>
          )}

          {/* CTA Button */}
          <tr>
            <td style={{ padding: '8px 32px 32px 32px', textAlign: 'center' }}>
              <a
                href={externalLink}
                style={{
                  backgroundColor: '#00DD94',
                  color: '#0a0a0f',
                  borderRadius: '10px',
                  padding: '12px 28px',
                  fontSize: '14px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'inline-block',
                  textAlign: 'center',
                }}
              >
                View deal
              </a>
            </td>
          </tr>

          {/* Footer */}
          <tr>
            <td
              style={{
                padding: '24px 32px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                fontSize: '12px',
                color: '#94a3b8',
                lineHeight: 1.5,
                textAlign: 'center',
              }}
            >
              Reply to this email to message {senderName}. Subscribe to view full analysis and invest.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function renderDealBroadcastHtml(props: DealBroadcastEmailProps): string {
  const externalLink = `${props.baseUrl ?? 'https://paperworking.com'}/deals/${props.dealSlug}/external?token=${encodeURIComponent(props.token)}&broadcast=true`;
  const formattedPrice = formatDealCurrency(props.purchasePrice);
  const formattedRoi = `${Number(props.projectedRoi).toFixed(1)}%`;
  const includeCard = props.includeBusinessCard !== false;

  const businessCardHtml = includeCard
    ? `
    <tr>
      <td style="padding: 0 32px 24px 32px;">
        <div data-testid="business-card-section" style="background-color: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 16px;">
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; margin-bottom: 6px; font-weight: 600;">
            Lead Investor Contact
          </div>
          <div style="font-size: 14px; font-weight: 600; color: #ffffff;">
            ${props.businessCard?.name || props.senderName}
          </div>
          <div style="font-size: 12px; color: #94a3b8; margin-top: 2px;">
            ${props.businessCard?.company || 'PaperWorking Capital Partner'} · ${props.businessCard?.email || props.senderEmail}
          </div>
          ${props.businessCard?.phone ? `<div style="font-size: 12px; color: #94a3b8; margin-top: 2px;">Phone: ${props.businessCard.phone}</div>` : ''}
          ${props.businessCard?.investmentCriteria ? `<div style="font-size: 12px; color: #cbd5e1; margin-top: 6px; border-top: 1px solid rgba(255, 255, 255, 0.06); padding-top: 6px;">Criteria: ${props.businessCard.investmentCriteria}</div>` : ''}
        </div>
      </td>
    </tr>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${props.subject}</title>
</head>
<body style="margin:0; padding:32px 16px; background-color:#0b0f17; color:#ffffff; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; margin:0 auto; background-color:#121014; border-radius:16px; border:1px solid rgba(255, 255, 255, 0.1); overflow:hidden;">
    <tr>
      <td style="padding:24px 32px; border-bottom:1px solid rgba(255, 255, 255, 0.08);">
        <div style="font-size:20px; font-weight:bold; color:#00DD94; letter-spacing:-0.02em;">PaperWorking</div>
      </td>
    </tr>
    <tr>
      <td style="padding:32px 32px 16px 32px;">
        <h1 style="font-size:22px; font-weight:600; color:#ffffff; margin:0 0 8px 0; line-height:1.3;">${props.subject}</h1>
        <p style="font-size:14px; color:#94a3b8; margin:0;">${props.senderName} shared an underwriting analysis on PaperWorking.</p>
      </td>
    </tr>
    ${
      props.message
        ? `<tr>
      <td style="padding:8px 32px 24px 32px;">
        <div style="background-color:rgba(255, 255, 255, 0.05); border:1px solid rgba(255, 255, 255, 0.1); border-radius:12px; padding:16px; color:#e2e8f0; font-size:14px; line-height:1.5;">
          <div style="font-size:11px; text-transform:uppercase; letter-spacing:0.08em; color:#00DD94; margin-bottom:6px; font-weight:600;">Note from ${props.senderName}</div>
          ${props.message}
        </div>
      </td>
    </tr>`
        : ''
    }
    <tr>
      <td style="padding:0 32px 24px 32px;">
        <div style="background-color:rgba(0, 221, 148, 0.04); border:1px solid rgba(0, 221, 148, 0.2); border-radius:14px; padding:20px;">
          <div style="font-size:11px; text-transform:uppercase; letter-spacing:0.08em; color:#94a3b8; margin-bottom:4px;">Real Estate Opportunity</div>
          <div style="font-size:18px; font-weight:600; color:#ffffff; margin-bottom:4px;">${props.dealName}</div>
          <div style="font-size:13px; color:#cbd5e1; margin-bottom:16px;">${props.dealAddress}</div>
          <table width="100%" border="0" cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:50%; padding-right:8px;">
                <div style="font-size:11px; text-transform:uppercase; color:#94a3b8;">Purchase Price</div>
                <div style="font-size:16px; font-weight:bold; color:#ffffff; margin-top:2px;">${formattedPrice}</div>
              </td>
              <td style="width:50%; padding-left:8px;">
                <div style="font-size:11px; text-transform:uppercase; color:#94a3b8;">Projected ROI</div>
                <div style="font-size:16px; font-weight:bold; color:#00DD94; margin-top:2px;">${formattedRoi}</div>
              </td>
            </tr>
          </table>
        </div>
      </td>
    </tr>
    ${businessCardHtml}
    <tr>
      <td style="padding:8px 32px 32px 32px; text-align:center;">
        <a href="${externalLink}" style="background-color:#00DD94; color:#0a0a0f; border-radius:10px; padding:12px 28px; font-size:14px; font-weight:600; text-decoration:none; display:inline-block;">View deal</a>
      </td>
    </tr>
    <tr>
      <td style="padding:24px 32px; border-top:1px solid rgba(255, 255, 255, 0.08); background-color:rgba(0, 0, 0, 0.2); font-size:12px; color:#94a3b8; line-height:1.5; text-align:center;">
        Reply to this email to message ${props.senderName}. Subscribe to view full analysis and invest.
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderDealBroadcastPlainText(props: DealBroadcastEmailProps): string {
  const externalLink = `${props.baseUrl ?? 'https://paperworking.com'}/deals/${props.dealSlug}/external?token=${encodeURIComponent(props.token)}&broadcast=true`;
  const formattedPrice = formatDealCurrency(props.purchasePrice);
  const formattedRoi = `${Number(props.projectedRoi).toFixed(1)}%`;
  const includeCard = props.includeBusinessCard !== false;

  const cardText = includeCard
    ? `
LEAD INVESTOR CONTACT
Name: ${props.businessCard?.name || props.senderName}
Email: ${props.businessCard?.email || props.senderEmail}
Company: ${props.businessCard?.company || 'PaperWorking Capital Partner'}
${props.businessCard?.phone ? `Phone: ${props.businessCard.phone}\n` : ''}${props.businessCard?.investmentCriteria ? `Criteria: ${props.businessCard.investmentCriteria}\n` : ''}`
    : '';

  return `PAPERWORKING — DEAL BROADCAST

${props.subject}
${props.senderName} shared an underwriting analysis on PaperWorking.

${props.message ? `NOTE FROM ${props.senderName.toUpperCase()}:\n${props.message}\n\n` : ''}DEAL OVERVIEW:
Property: ${props.dealName}
Address: ${props.dealAddress}
Purchase Price: ${formattedPrice}
Projected ROI: ${formattedRoi}
${cardText}
View full deal preview and analysis:
${externalLink}

Reply to this email to message ${props.senderName}. Subscribe to view full analysis and invest.
`;
}
