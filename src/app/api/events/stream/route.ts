import { NextRequest } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { sseEventBus } from '@/lib/events/eventBus';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const projectId = new URL(req.url).searchParams.get('projectId');
  if (!projectId) {
    return new Response('Missing projectId parameter', { status: 400 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const sendEvent = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      // Heartbeat every 15s to keep SSE connection alive through proxies
      const interval = setInterval(() => {
        controller.enqueue(encoder.encode(': heartbeat\n\n'));
      }, 15000);

      const onTxNew = (data: unknown) => sendEvent('transactions:new', data);
      const onTxApproved = (data: unknown) => sendEvent('transactions:approved', data);
      const onAcctUpdated = (data: unknown) => sendEvent('account:updated', data);
      const onLiabUpdated = (data: unknown) => sendEvent('liabilities:updated', data);
      const onKpiUpdated = (data: unknown) => sendEvent('kpi:updated', data);
      const onConsentChanged = (data: unknown) => sendEvent('consent:changed', data);

      sseEventBus.on(`transactions:new:${projectId}` as any, onTxNew);
      sseEventBus.on(`transactions:approved:${projectId}` as any, onTxApproved);
      sseEventBus.on(`account:updated:${projectId}` as any, onAcctUpdated);
      sseEventBus.on(`liabilities:updated:${projectId}` as any, onLiabUpdated);
      sseEventBus.on(`kpi:updated:${projectId}` as any, onKpiUpdated);
      sseEventBus.on(`consent:changed:${projectId}` as any, onConsentChanged);

      req.signal.addEventListener('abort', () => {
        clearInterval(interval);
        sseEventBus.off(`transactions:new:${projectId}` as any, onTxNew);
        sseEventBus.off(`transactions:approved:${projectId}` as any, onTxApproved);
        sseEventBus.off(`account:updated:${projectId}` as any, onAcctUpdated);
        sseEventBus.off(`liabilities:updated:${projectId}` as any, onLiabUpdated);
        sseEventBus.off(`kpi:updated:${projectId}` as any, onKpiUpdated);
        sseEventBus.off(`consent:changed:${projectId}` as any, onConsentChanged);
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
