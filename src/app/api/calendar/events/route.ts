import { NextResponse } from 'next/server';
import { getUpcomingEvents } from '@/lib/calendar/google';
import { cookies } from 'next/headers';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export async function GET() {
  try {
    // 1. Verify user is authenticated
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('__session')?.value;
    
    if (!sessionCookie) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Verify session
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    const uid = decodedToken.uid;

    // 2. Fetch user's refresh token
    const userDoc = await adminDb.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return new NextResponse('User not found', { status: 404 });
    }

    const userData = userDoc.data();
    const refreshToken = userData?.googleCalendarRefreshToken;

    if (!refreshToken) {
      return new NextResponse(JSON.stringify({ connected: false }), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // 3. Fetch upcoming events
    try {
      const events = await getUpcomingEvents(refreshToken, 5);
      
      return new NextResponse(JSON.stringify({ 
        connected: true, 
        events: events.map((event: Record<string, unknown>) => ({
          id: event.id,
          summary: event.summary,
          start: (event.start as Record<string, string>)?.dateTime || (event.start as Record<string, string>)?.date,
          end: (event.end as Record<string, string>)?.dateTime || (event.end as Record<string, string>)?.date,
          htmlLink: event.htmlLink,
          location: event.location,
          conferenceData: event.conferenceData,
        }))
      }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (apiError: unknown) {
      const errorObj = apiError as { message?: string };
      // Handle revoked tokens or invalid grants
      if (errorObj.message && (errorObj.message.includes('invalid_grant') || errorObj.message.includes('revoked'))) {
        // Clear the invalid token
        await adminDb.collection('users').doc(uid).update({
          googleCalendarRefreshToken: null,
          updatedAt: new Date(),
        });
        return new NextResponse(JSON.stringify({ connected: false }), { 
          status: 200, 
          headers: { 'Content-Type': 'application/json' } 
        });
      }
      throw apiError;
    }
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
