export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
    previous_attributes?: Record<string, unknown>;
  };
}

export interface StripeWebhookConstructError {
  message: string;
}

export type ConstructStripeEventFn = (
  body: string,
  signature: string,
) => StripeWebhookEvent;

export type IsStripeEventProcessedFn = (eventId: string) => Promise<boolean>;
export type MarkStripeEventProcessedFn = (
  eventId: string,
  eventType: string,
) => Promise<void>;

export interface StripeWebhookHandlerDeps {
  constructEvent?: ConstructStripeEventFn;
  isEventProcessed?: IsStripeEventProcessedFn;
  markEventProcessed?: MarkStripeEventProcessedFn;
  dispatchEvent?: (event: StripeWebhookEvent) => Promise<void>;
}
