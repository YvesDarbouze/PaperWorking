import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  ACCT_COOKIE,
  decodeSubCookie,
  DEV_MOCK_SESSION_TOKEN,
  SESSION_COOKIE,
  SUB_COOKIE,
  type SessionProfile,
} from '@/lib/auth/session-cookies';

export async function GET(): Promise<NextResponse<SessionProfile>> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE)?.value;

  if (!session) {
    return NextResponse.json(
      {
        authenticated: false,
        accountType: 'investor',
        subscriptionPlan: 'None',
        subscriptionStatus: 'inactive',
      },
      { status: 401 },
    );
  }

  const accountType = cookieStore.get(ACCT_COOKIE)?.value ?? 'investor';
  const subscription = decodeSubCookie(cookieStore.get(SUB_COOKIE)?.value);

  return NextResponse.json({
    authenticated: true,
    accountType,
    subscriptionPlan: subscription.plan,
    subscriptionStatus: subscription.status,
    mode: session === DEV_MOCK_SESSION_TOKEN ? 'mock' : 'session',
  });
}
