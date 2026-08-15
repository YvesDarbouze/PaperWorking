import { renderEmailLayout, htmlToPlainText } from '@/lib/emails/templates/BaseLayout';
import { MessageClass, SENDER_IDENTITIES, EnvelopeSender } from './envelopeContract';

/**
 * PaperWorking — Canonical Template Registry (EM Series v2 · EM-7 · §4 Catalog)
 *
 * Single typed source of truth for rendering all system emails:
 * - Compiles UX-0 tokens, dark-mode safe layouts, and responsive containers
 * - Strictly pairs plain-text before HTML (F-3, Rule 6)
 * - Returns metadata: { subject, html, text, from, messageClass, templateKey }
 */

export interface RenderedTemplate {
  templateKey: string;
  messageClass: MessageClass;
  sender: EnvelopeSender;
  subject: string;
  html: string;
  text: string;
}

// ─────────────────────────────────────────────────────────────
// 1. Account & Security Templates (Class E)
// ─────────────────────────────────────────────────────────────

export interface AcctWelcomeProps {
  displayName?: string;
  actionUrl: string;
}

export function renderAcctWelcome(props: AcctWelcomeProps): RenderedTemplate {
  const name = props.displayName || 'there';
  const subject = 'Welcome to PaperWorking';
  const bodyHtml = `
    <h1 style="font-size:22px;font-weight:700;color:#0D0D12;margin:0 0 16px 0;letter-spacing:-0.02em;">Welcome to PaperWorking, ${name}.</h1>
    <p style="font-size:14px;color:#454955;line-height:1.6;margin:0 0 24px 0;">
      Your account is now ready. PaperWorking brings high-velocity real estate analytics, property underwriting, and investor correspondence into one command center.
    </p>
    <div style="margin:28px 0;">
      <a href="${props.actionUrl}" class="btn-primary">Go to Command Center &rarr;</a>
    </div>
    <p style="font-size:13px;color:#8E909B;line-height:1.5;margin:24px 0 0 0;">
      If you have any questions, simply reply to this email or visit our help center.
    </p>
  `;

  const html = renderEmailLayout({
    title: 'Welcome',
    preheader: 'Your PaperWorking account is active.',
    bodyHtml,
    messageClass: 'E',
  });

  return {
    templateKey: 'ACCT-WELCOME',
    messageClass: 'E',
    sender: SENDER_IDENTITIES.security,
    subject,
    html,
    text: htmlToPlainText(html),
  };
}

export interface AcctPasswordResetProps {
  resetLink: string;
  displayName?: string;
}

export function renderAcctPasswordReset(props: AcctPasswordResetProps): RenderedTemplate {
  const subject = 'Reset your PaperWorking password';
  const bodyHtml = `
    <h1 style="font-size:22px;font-weight:700;color:#0D0D12;margin:0 0 16px 0;letter-spacing:-0.02em;">Reset your password</h1>
    <p style="font-size:14px;color:#454955;line-height:1.6;margin:0 0 20px 0;">
      We received a request to reset the password for your PaperWorking account. Click the button below to set a new password.
    </p>
    <div style="margin:28px 0;">
      <a href="${props.resetLink}" class="btn-primary">Reset Password</a>
    </div>
    <p style="font-size:13px;color:#8E909B;line-height:1.5;margin:20px 0 0 0;">
      This link expires in 60 minutes and can only be used once. If you did not request this password reset, no action is needed and your account remains secure.
    </p>
  `;

  const html = renderEmailLayout({
    title: 'Security',
    preheader: 'Reset your PaperWorking password.',
    bodyHtml,
    messageClass: 'E',
  });

  return {
    templateKey: 'ACCT-PASSWORD-RESET',
    messageClass: 'E',
    sender: SENDER_IDENTITIES.security,
    subject,
    html,
    text: htmlToPlainText(html),
  };
}

export interface AcctSecurityOtpProps {
  actionName: string;
  code: string;
}

export function renderAcctSecurityOtp(props: AcctSecurityOtpProps): RenderedTemplate {
  const subject = `Security Verification Code: ${props.actionName}`;
  const bodyHtml = `
    <h1 style="font-size:20px;font-weight:700;color:#0D0D12;margin:0 0 14px 0;">Security Verification Request</h1>
    <p style="font-size:14px;color:#454955;line-height:1.6;margin:0 0 20px 0;">
      A sensitive administrative action (<strong>${props.actionName}</strong>) was requested for your PaperWorking account.
    </p>
    <p style="font-size:14px;color:#454955;margin:0 0 12px 0;">Your 6-digit verification code:</p>
    <div style="background:#F5F6F8;padding:18px;text-align:center;border-radius:8px;margin:16px 0 24px 0;border:1px solid #EAEBF0;">
      <span style="font-family:monospace;font-size:32px;font-weight:700;letter-spacing:6px;color:#0D0D12;">${props.code}</span>
    </div>
    <p style="font-size:12px;color:#8E909B;line-height:1.5;margin:0;">
      This code expires in 15 minutes. If you did not authorize this change, please contact hi@paperworking.co immediately.
    </p>
  `;

  const html = renderEmailLayout({
    title: 'Security OTP',
    preheader: `Your verification code is ${props.code}`,
    bodyHtml,
    messageClass: 'E',
  });

  return {
    templateKey: 'ACCT-SECURITY-OTP',
    messageClass: 'E',
    sender: SENDER_IDENTITIES.security,
    subject,
    html,
    text: htmlToPlainText(html),
  };
}

// ─────────────────────────────────────────────────────────────
// 2. Billing & Dunning Templates (Class E)
// ─────────────────────────────────────────────────────────────

export interface BillPaymentFailedProps {
  amountFormatted: string;
  attemptCount: number;
  nextAttemptDateFormatted?: string;
  updatePaymentUrl: string;
}

export function renderBillPaymentFailed(props: BillPaymentFailedProps): RenderedTemplate {
  const isFinal = props.attemptCount >= 3;
  const subject = isFinal
    ? 'Action required: PaperWorking subscription cancellation notice'
    : `Payment failed for PaperWorking subscription (Attempt ${props.attemptCount})`;

  const retryNotice = props.nextAttemptDateFormatted
    ? `<p style="font-size:14px;color:#454955;margin:0 0 20px 0;">Stripe will automatically retry your payment on <strong>${props.nextAttemptDateFormatted}</strong>.</p>`
    : `<p style="font-size:14px;color:#454955;margin:0 0 20px 0;">Please update your payment method to prevent service interruption.</p>`;

  const bodyHtml = `
    <h1 style="font-size:22px;font-weight:700;color:#0D0D12;margin:0 0 16px 0;letter-spacing:-0.02em;">Payment could not be processed</h1>
    <p style="font-size:14px;color:#454955;line-height:1.6;margin:0 0 16px 0;">
      We were unable to charge your payment method for <strong>${props.amountFormatted}</strong>.
    </p>
    ${retryNotice}
    <div style="margin:28px 0;">
      <a href="${props.updatePaymentUrl}" class="btn-primary">Update Payment Method</a>
    </div>
    <p style="font-size:12px;color:#8E909B;line-height:1.5;margin:24px 0 0 0;">
      If you need assistance, our billing team is available at <a href="mailto:billing@mail.paperworking.co" style="color:#0D0D12;text-decoration:underline;">billing@mail.paperworking.co</a>.
    </p>
  `;

  const html = renderEmailLayout({
    title: 'Billing Alert',
    preheader: `Payment failed for ${props.amountFormatted}. Update payment method.`,
    bodyHtml,
    messageClass: 'E',
  });

  return {
    templateKey: 'BILL-PAYMENT-FAILED',
    messageClass: 'E',
    sender: SENDER_IDENTITIES.billing,
    subject,
    html,
    text: htmlToPlainText(html),
  };
}

export interface BillTrialExpiringProps {
  daysRemaining: number;
  billingUrl: string;
}

export function renderBillTrialExpiring(props: BillTrialExpiringProps): RenderedTemplate {
  const subject = `Your PaperWorking trial ends in ${props.daysRemaining} days`;
  const bodyHtml = `
    <h1 style="font-size:22px;font-weight:700;color:#0D0D12;margin:0 0 16px 0;letter-spacing:-0.02em;">Your free trial ends soon</h1>
    <p style="font-size:14px;color:#454955;line-height:1.6;margin:0 0 20px 0;">
      Your PaperWorking trial will end in <strong>${props.daysRemaining} days</strong>. Add a payment method to maintain uninterrupted access to real estate underwriting tools, live market comps, and investor pipelines.
    </p>
    <div style="margin:28px 0;">
      <a href="${props.billingUrl}" class="btn-primary">Choose a Plan &rarr;</a>
    </div>
  `;

  const html = renderEmailLayout({
    title: 'Trial Expiring',
    preheader: `Your PaperWorking trial ends in ${props.daysRemaining} days.`,
    bodyHtml,
    messageClass: 'E',
  });

  return {
    templateKey: 'BILL-TRIAL-EXPIRING',
    messageClass: 'E',
    sender: SENDER_IDENTITIES.billing,
    subject,
    html,
    text: htmlToPlainText(html),
  };
}

// ─────────────────────────────────────────────────────────────
// 3. Team & Access Templates (Class E)
// ─────────────────────────────────────────────────────────────

export interface TeamInviteProps {
  inviterName: string;
  organizationName: string;
  roleName: string;
  acceptUrl: string;
}

export function renderTeamInvite(props: TeamInviteProps): RenderedTemplate {
  const subject = `${props.inviterName} invited you to join ${props.organizationName} on PaperWorking`;
  const bodyHtml = `
    <h1 style="font-size:22px;font-weight:700;color:#0D0D12;margin:0 0 16px 0;letter-spacing:-0.02em;">You've been invited to join a team</h1>
    <p style="font-size:14px;color:#454955;line-height:1.6;margin:0 0 20px 0;">
      <strong>${props.inviterName}</strong> has invited you to join <strong>${props.organizationName}</strong> as a <strong>${props.roleName}</strong>.
    </p>
    <div style="margin:28px 0;">
      <a href="${props.acceptUrl}" class="btn-primary">Accept Invitation &rarr;</a>
    </div>
  `;

  const html = renderEmailLayout({
    title: 'Team Invite',
    preheader: `${props.inviterName} invited you to ${props.organizationName}.`,
    bodyHtml,
    messageClass: 'E',
  });

  return {
    templateKey: 'TEAM-INVITE',
    messageClass: 'E',
    sender: SENDER_IDENTITIES.team,
    subject,
    html,
    text: htmlToPlainText(html),
  };
}

// ─────────────────────────────────────────────────────────────
// 4. Commercial Nudges (Class C)
// ─────────────────────────────────────────────────────────────

export interface OnboardNudgeProps {
  templateKey: 'ONBOARD-DAY-3' | 'ONBOARD-DAY-7' | 'ONBOARD-DAY-14' | 'UPGRADE-NUDGE';
  headline: string;
  bodyText: string;
  ctaText: string;
  ctaUrl: string;
  unsubscribeUrl?: string;
}

export function renderOnboardNudge(props: OnboardNudgeProps): RenderedTemplate {
  const subject = props.headline;
  const bodyHtml = `
    <h1 style="font-size:22px;font-weight:700;color:#0D0D12;margin:0 0 16px 0;letter-spacing:-0.02em;">${props.headline}</h1>
    <p style="font-size:14px;color:#454955;line-height:1.6;margin:0 0 24px 0;">
      ${props.bodyText}
    </p>
    <div style="margin:28px 0;">
      <a href="${props.ctaUrl}" class="btn-primary">${props.ctaText} &rarr;</a>
    </div>
  `;

  const html = renderEmailLayout({
    title: 'PaperWorking',
    preheader: props.headline,
    bodyHtml,
    messageClass: 'C',
    unsubscribeUrl: props.unsubscribeUrl,
  });

  return {
    templateKey: props.templateKey,
    messageClass: 'C',
    sender: SENDER_IDENTITIES.notifications,
    subject,
    html,
    text: htmlToPlainText(html),
  };
}
