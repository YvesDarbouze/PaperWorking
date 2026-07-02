import { NextResponse } from 'next/server';
import { getTokensFromCode } from '@/lib/calendar/google';
import { cookies } from 'next/headers';

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    if (error) {
      console.error('Google OAuth error:', error);
      return NextResponse.redirect(new URL('/dashboard/home?calendar_error=access_denied', request.url));
    }

    if (!code) {
      return new NextResponse('No code provided', { status: 400 });
    }

    // 1. Verify user is authenticated
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('__session')?.value;
    
    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Verify session to get uid
    const { adminAuth, adminDb } = await import('@/lib/firebase/admin');
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    const uid = decodedToken.uid;

    // 2. Exchange code for tokens
    const tokens = await getTokensFromCode(code);

    if (!tokens.refresh_token) {
      // If we don't get a refresh token, it means the user already granted access previously
      // and we didn't force a re-prompt, or something went wrong.
      // But we passed prompt: 'consent', so we should usually get it.
      // If we don't have it, we might need to rely on the existing one if we already had it.
      // For now, if we don't get a refresh token but we do get an access token, it's problematic for long-term sync.
      console.warn('No refresh token received. User might have previously authorized the app.');
    }

    // 3. Save refresh token to user profile
    if (tokens.refresh_token) {
      const userRef = adminDb.collection('users').doc(uid);
      await userRef.update({
        googleCalendarRefreshToken: tokens.refresh_token,
        updatedAt: new Date(),
      });
    }

    // 4. Redirect back to dashboard
    return NextResponse.redirect(new URL('/dashboard/home?calendar_success=true', request.url));
  } catch (error) {
    console.error('Error in Google OAuth callback:', error);
    return NextResponse.redirect(new URL('/dashboard/home?calendar_error=server_error', request.url));
  }
}

