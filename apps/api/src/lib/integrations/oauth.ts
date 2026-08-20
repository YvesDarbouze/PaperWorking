export function buildMockOAuthCallbackUrl(origin: string, provider: string): string {
  return `${origin}/api/integrations/${provider}/callback?code=mock_oauth_code_123`;
}

export function buildIntegrationCallbackHtml(provider: string): string {
  return `<!DOCTYPE html>
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
</html>`;
}

export function buildGoogleDriveCallbackHtml(
  success: boolean,
  errorMsg?: string,
): string {
  const message = success
    ? { type: 'google-drive-connected', success: true }
    : { type: 'google-drive-connected', success: false, error: errorMsg ?? 'Unknown error' };

  return `<!DOCTYPE html>
<html>
<head><title>Connecting…</title></head>
<body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;background:#0d0a0b;color:#9E9DA0;">
  <p>${success ? 'Connected! Closing…' : `Error: ${errorMsg}`}</p>
  <script>
    try {
      window.opener && window.opener.postMessage(${JSON.stringify(message)}, window.location.origin);
    } catch(e) {}
    setTimeout(() => window.close(), 800);
  </script>
</body>
</html>`;
}

export function parseIntegrationActionPath(actionPath: string[] = []): {
  provider?: string;
  action?: string;
} {
  if (actionPath.length !== 2) return {};
  return { provider: actionPath[0], action: actionPath[1] };
}
