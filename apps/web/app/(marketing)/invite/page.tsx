import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Accept Team Invite | PaperWorking',
  description: 'Accept a PaperWorking team invitation and join your organization.',
};

type Props = {
  searchParams: Promise<{ token?: string; invite?: string }>;
};

export default async function InvitePage({ searchParams }: Props) {
  const params = await searchParams;
  const token = params.token ?? params.invite;

  if (token) {
    redirect(`/signup?invite=${encodeURIComponent(token)}`);
  }

  return (
    <div className="mx-auto max-w-xl px-5 py-16 md:px-10">
      <p className="pw-section-eyebrow mb-3">Team Invite</p>
      <h1 className="mb-4 text-4xl font-semibold tracking-[-0.02em]">Accept a team invitation</h1>
      <p
        className="mb-8 text-sm leading-relaxed"
        style={{ color: 'var(--color-on-surface-variant)' }}
      >
        Open the invitation link from your email — it includes a unique token and will take you through
        account setup. If you already have an account, sign in with the email address that received the
        invite.
      </p>

      <section className="pw-card space-y-4 p-6">
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-on-surface-variant)' }}>
          <strong className="text-[#fdfffc]">Received an invite email?</strong> Click the button in that
          message. Do not share the link — it is tied to your email address.
        </p>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-on-surface-variant)' }}>
          <strong className="text-[#fdfffc]">Need help?</strong> Contact your team admin or reach{' '}
          <Link href="/support" className="underline-offset-2 hover:underline">
            Support
          </Link>
          .
        </p>
        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <Link href="/login" className="pw-pill-cta inline-flex w-fit">
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex w-fit rounded-full border border-white/15 px-6 py-3 text-sm font-medium transition-colors hover:border-white/30"
          >
            Create a new account
          </Link>
        </div>
      </section>
    </div>
  );
}
