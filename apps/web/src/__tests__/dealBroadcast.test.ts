import {
  renderDealBroadcastHtml,
  renderDealBroadcastPlainText,
  type DealBroadcastEmailProps,
} from '../lib/email/dealBroadcast';

describe('Deal Broadcast Email Template (dealBroadcast.tsx)', () => {
  const baseProps: DealBroadcastEmailProps = {
    dealName: 'Elm Street Flip',
    dealAddress: '1247 Elm Street, Austin, TX 78702',
    dealSlug: '1247elmst',
    purchasePrice: 485000,
    projectedRoi: 18.4,
    senderName: 'Sarah Jenkins',
    senderEmail: 'sarah@leadinvestor.com',
    subject: 'Investment Opportunity: Elm Street Flip',
    message: 'Review this underwriting package and let me know your thoughts.',
    token: 'jwt_sample_token_123',
    includeBusinessCard: true,
    businessCard: {
      name: 'Sarah Jenkins',
      email: 'sarah@leadinvestor.com',
      company: 'Apex Capital Partners',
      phone: '+1 (512) 555-0199',
      investmentCriteria: 'Value-add residential & multifamily',
    },
  };

  it('1: Render template with deal data -> asserts HTML contains deal address and CTA link with &broadcast=true', () => {
    const html = renderDealBroadcastHtml(baseProps);

    // Assert deal address is present
    expect(html).toContain('1247 Elm Street, Austin, TX 78702');
    expect(html).toContain('$485,000');
    expect(html).toContain('18.4%');

    // Assert CTA link contains token and &broadcast=true
    expect(html).toContain('/deals/1247elmst/external?token=jwt_sample_token_123&broadcast=true');
    expect(html).toContain('View deal');

    // Assert branding and header
    expect(html).toContain('PaperWorking');
    expect(html).toContain('#00DD94');
  });

  it('2: Render template without business card -> asserts no card section', () => {
    const withoutCardProps: DealBroadcastEmailProps = {
      ...baseProps,
      includeBusinessCard: false,
    };

    const html = renderDealBroadcastHtml(withoutCardProps);

    expect(html).toContain('1247 Elm Street, Austin, TX 78702');
    expect(html).not.toContain('data-testid="business-card-section"');
    expect(html).not.toContain('Lead Investor Contact');
    expect(html).not.toContain('Apex Capital Partners');
  });

  it('3: Assert plain text fallback contains deal address and structured content', () => {
    const plainText = renderDealBroadcastPlainText(baseProps);

    expect(plainText).toContain('1247 Elm Street, Austin, TX 78702');
    expect(plainText).toContain('$485,000');
    expect(plainText).toContain('18.4%');
    expect(plainText).toContain('Sarah Jenkins');
    expect(plainText).toContain('/deals/1247elmst/external?token=jwt_sample_token_123&broadcast=true');
    expect(plainText).toContain('Reply to this email to message Sarah Jenkins');
  });
});
