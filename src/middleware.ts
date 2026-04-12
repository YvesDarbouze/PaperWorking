import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect all /dashboard routes
  if (pathname.startsWith('/dashboard')) {
    // Basic implementation of token verification for Edge middleware
    // In a production app with Firebase, you might use 'next-firebase-auth-edge' 
    // or inspect a session cookie to verify the subscriptionStatus
    
    const sessionCookie = request.cookies.get('__session')?.value;
    
    // For demonstration, if "bypass-auth" is in the cookie, we let them through.
    if (sessionCookie === 'bypass-auth') {
        return NextResponse.next();
    }
    
    // Otherwise we redirect to pricing since they lack an active subscription session
    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/pricing', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
