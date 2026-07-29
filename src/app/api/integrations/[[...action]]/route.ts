import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import * as admin from 'firebase-admin';

// Helper to determine headers for HTML responses
const htmlHeaders = { 'Content-Type': 'text/html; charset=utf-8' };

export async function GET(req: NextRequest, { params }: { params: { action?: string[] } }) {
  const actionPath = params.action || [];

  // 1. GET /api/integrations/[provider]/authorize
  if (actionPath.length === 2 && actionPath[1] === 'authorize') {
    const provider = actionPath[0];
    const origin = new URL(req.url).origin;
    
    // Redirect to mock OAuth callback
    const redirectUrl = `${origin}/api/integrations/${provider}/callback?code=mock_oauth_code_123`;
    return NextResponse.redirect(redirectUrl);
  }

  // 2. GET /api/integrations/[provider]/callback
  if (actionPath.length === 2 && actionPath[1] === 'callback') {
    const provider = actionPath[0];
    const code = req.nextUrl.searchParams.get('code') || 'no_code';

    // Verify token from query or headers if authenticated.
    // For popup auth, we can pass authorization/idToken via session state, cookie,
    // or simply hook up a generic callback since it's a simulated flow.
    // To identify the acting user, we can resolve from the mock callback state or default to orgId.
    // Let's retrieve from database: since we want to persist it, let's write to a generic placeholder organization
    // or read the user identity if the cookie/bearer token is present.
    let orgId = 'org_placeholder';
    try {
      const auth = await requireAuth(req);
      if (!isAuthError(auth)) {
        const userDoc = await adminDb.collection('users').doc(auth.uid).get();
        orgId = userDoc.data()?.organizationId || 'org_placeholder';
      }
    } catch {
      // Fallback for popup/redirect auth flows
    }

    // Save connection to Firestore
    await adminDb.collection('organizations').doc(orgId).collection('integrations').doc(provider).set({
      connected: true,
      status: 'connected',
      connectedAt: new Date().toISOString(),
      code,
    });

    // Render HTML template communicating with parent and self-closing
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authorization Successful</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background-color: #FAF9F6;
              color: #334155;
            }
            .card {
              background: white;
              padding: 2rem;
              border-radius: 1rem;
              box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
              text-align: center;
            }
            h1 { font-size: 1.25rem; margin-bottom: 0.5rem; color: #6B8E6B; }
            p { font-size: 0.875rem; color: #64748B; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Connection Successful</h1>
            <p>You have connected ${provider.toUpperCase()} to PaperWorking.</p>
            <p>Closing this window...</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'INTEGRATION_SUCCESS', provider: '${provider}' }, '*');
            }
            setTimeout(() => {
              window.close();
            }, 1000);
          </script>
        </body>
      </html>
    `;

    return new NextResponse(html, { headers: htmlHeaders });
  }

  return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
}

export async function DELETE(req: NextRequest, { params }: { params: { action?: string[] } }) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const actionPath = params.action || [];
  const uid = auth.uid;

  const userDoc = await adminDb.collection('users').doc(uid).get();
  const orgId = userDoc.data()?.organizationId || 'org_placeholder';

  // DELETE /api/integrations/[provider]/disconnect
  if (actionPath.length === 2 && actionPath[1] === 'disconnect') {
    const provider = actionPath[0];

    await adminDb.collection('organizations').doc(orgId).collection('integrations').doc(provider).delete();

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
}
