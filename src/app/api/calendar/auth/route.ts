import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/calendar/google';
import { cookies } from 'next/headers';

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // 1. Verify user is authenticated
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('__session')?.value;
    
    if (!sessionCookie) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Verify session
    const { adminAuth } = await import('@/lib/firebase/admin');
    await adminAuth.verifySessionCookie(sessionCookie, true);

    // 2. Generate Google Auth URL
    const authUrl = getAuthUrl();

    // 3. Redirect user to Google
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Error initiating Google OAuth:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

