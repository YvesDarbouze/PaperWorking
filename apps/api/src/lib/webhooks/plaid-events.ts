export interface PlaidWebhookPayload {
  webhook_type?: string;
  webhook_code?: string;
  item_id?: string;
  error?: Record<string, unknown>;
  new_consented_products?: string[];
  new_data_scopes?: string[];
  [key: string]: unknown;
}

export function parsePlaidWebhookPayload(rawBody: string): PlaidWebhookPayload {
  return JSON.parse(rawBody) as PlaidWebhookPayload;
}

export function isTransactionSyncEvent(payload: PlaidWebhookPayload): boolean {
  return (
    payload.webhook_type === 'TRANSACTIONS' &&
    ['SYNC_UPDATES_AVAILABLE', 'DEFAULT_UPDATE', 'INITIAL_UPDATE', 'HISTORICAL_UPDATE'].includes(
      payload.webhook_code ?? '',
    )
  );
}

export function plaidEventType(payload: PlaidWebhookPayload): string {
  return `${payload.webhook_type ?? 'UNKNOWN'}/${payload.webhook_code ?? 'UNKNOWN'}`;
}
