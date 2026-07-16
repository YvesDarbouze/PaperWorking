import { NextResponse } from 'next/server';
import { getE2EFollows, getE2EConsents, clearE2EFollows, clearE2EConsents } from '@/actions/follows';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  return NextResponse.json({
    follows: await getE2EFollows(),
    consents: await getE2EConsents(),
  });
}

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  await clearE2EFollows();
  await clearE2EConsents();

  return NextResponse.json({ success: true });
}
