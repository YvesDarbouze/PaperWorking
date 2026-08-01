import fs from 'fs';
import path from 'path';

describe('Auth & Account Microcopy Integrity (Prompt 7)', () => {
  it('Sign up screen contains verbatim microcopy', () => {
    const registerContent = fs.readFileSync(path.join(process.cwd(), 'src/app/(auth)/register/page.tsx'), 'utf-8');
    expect(registerContent).toContain(
      'Create your account and start your first Project. 14-day trial, no charge until day 15.'
    );
  });

  it('Sign in screen contains verbatim microcopy', () => {
    const loginContent = fs.readFileSync(path.join(process.cwd(), 'src/app/(auth)/login/page.tsx'), 'utf-8');
    expect(loginContent).toContain('Welcome back. Your deals kept moving while you were gone.');
    expect(loginContent).toContain(
      'Create your account and start your first Project. 14-day trial, no charge until day 15.'
    );
  });

  it('Trial start contains verbatim microcopy', () => {
    const subGateContent = fs.readFileSync(path.join(process.cwd(), 'src/components/shared/SubscriptionGate.tsx'), 'utf-8');
    expect(subGateContent).toContain(
      "Your card starts the clock; it isn&apos;t charged until day 15. Cancel anytime from Settings."
    );
  });

  it('Forgot password screen contains verbatim microcopy', () => {
    const forgotContent = fs.readFileSync(path.join(process.cwd(), 'src/app/(auth)/forgot-password/page.tsx'), 'utf-8');
    expect(forgotContent).toContain(
      "Enter your account email and we&apos;ll send a reset link. Your deal data stays where you left it."
    );
  });

  it('Export/cancel reassurance contains verbatim microcopy', () => {
    const cancelModalContent = fs.readFileSync(path.join(process.cwd(), 'src/components/billing/CancelSubscriptionModal.tsx'), 'utf-8');
    expect(cancelModalContent).toContain(
      "Leaving? Your data isn&apos;t. Export your full ledger, P&amp;L, and documents as CSV, plus 90 days of read access after you cancel."
    );
  });

  it('Accept Team Invite screen contains Sign up line verbatim', () => {
    const teamInviteContent = fs.readFileSync(path.join(process.cwd(), 'src/app/invite/team/TeamInviteClient.tsx'), 'utf-8');
    expect(teamInviteContent).toContain(
      'Create your account and start your first Project. 14-day trial, no charge until day 15.'
    );
  });
});
