import {
  generateDealInviteToken,
  verifyDealInviteToken,
  renderDealInviteEmailHtml,
} from '@/lib/email/dealInvite';

describe('External Deal Invite Email & Token Generator', () => {
  const samplePayload = {
    dealId: 'deal_123mainst',
    slug: '123mainstaustintx78701',
    address: '123 Main St, Austin, TX 78701',
    creatorName: 'Yves Darbouze',
    inviteeEmail: 'external@example.com',
  };

  it('generates and verifies a valid JWT-like token', () => {
    const token = generateDealInviteToken(samplePayload);
    expect(token).toBeTruthy();

    const verified = verifyDealInviteToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.address).toBe('123 Main St, Austin, TX 78701');
    expect(verified?.creatorName).toBe('Yves Darbouze');
  });

  it('renders clean HTML email template with dark mode styling and teal CTA', () => {
    const token = generateDealInviteToken(samplePayload);
    const html = renderDealInviteEmailHtml({
      ...samplePayload,
      token,
    });

    expect(html).toContain('123 Main St, Austin, TX 78701');
    expect(html).toContain('#34d399');
    expect(html).toContain('Yves Darbouze');
    expect(html).toContain('View Deal');
    expect(html).toContain('/deals/123mainstaustintx78701/external?token=');
  });
});
