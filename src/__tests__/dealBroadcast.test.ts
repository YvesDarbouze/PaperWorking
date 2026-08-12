import {
  generateDealBroadcastToken,
  verifyDealBroadcastToken,
  renderDealBroadcastEmailHtml,
  DealBroadcastPayload,
} from '../lib/email/dealBroadcast';

describe('Deal Broadcast Email & Token Utilities', () => {
  const mockPayload: DealBroadcastPayload = {
    dealId: 'deal_123mainst',
    slug: '123mainstaustintx78701',
    address: '123 Main St, Austin, TX 78701',
    senderName: 'Yves Darbouze',
    recipientEmail: 'partner@example.com',
    subject: 'Check out this deal on PaperWorking',
    message: 'High ROI multifamily deal opportunity in Austin.',
    type: 'broadcast',
  };

  it('generates and verifies valid JWT deal broadcast tokens', () => {
    const token = generateDealBroadcastToken(mockPayload);
    expect(typeof token).toBe('string');

    const decoded = verifyDealBroadcastToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.dealId).toBe('deal_123mainst');
    expect(decoded?.type).toBe('broadcast');
  });

  it('renders dark-friendly HTML email template with teal CTA and broadcast parameter', () => {
    const token = generateDealBroadcastToken(mockPayload);
    const html = renderDealBroadcastEmailHtml(mockPayload, token);

    expect(html).toContain('123 Main St, Austin, TX 78701');
    expect(html).toContain('#34d399');
    expect(html).toContain('Yves Darbouze');
    expect(html).toContain('View Deal');
    expect(html).toContain('/deals/123mainstaustintx78701/external?token=');
    expect(html).toContain('&broadcast=true');
    expect(html).toContain('Reply to this email to message Yves Darbouze');
  });
});
