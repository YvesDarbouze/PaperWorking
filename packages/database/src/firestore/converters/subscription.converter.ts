import { optionalString } from './timestamp.js';

/** Matches @paperworking/services SubscriptionRow (avoid circular package deps). */
export type SubscriptionRecord = {
  id: string;
  userId: string | null;
  plan: string | null;
  status: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
};

export function subscriptionFromFirestore(
  documentId: string,
  data: Record<string, unknown>,
): SubscriptionRecord {
  const userId = optionalString(data.userId) ?? optionalString(data.uid) ?? documentId;
  return {
    id: optionalString(data.id) ?? documentId,
    userId,
    plan: optionalString(data.plan) ?? optionalString(data.subscriptionPlan),
    status: optionalString(data.status) ?? optionalString(data.subscriptionStatus),
    stripeCustomerId: optionalString(data.stripeCustomerId),
    stripeSubscriptionId: optionalString(data.stripeSubscriptionId),
  };
}

export function subscriptionFromUserSnapshot(
  userId: string,
  data: Record<string, unknown>,
): SubscriptionRecord | null {
  const plan = optionalString(data.subscriptionPlan);
  const status = optionalString(data.subscriptionStatus);
  const stripeCustomerId = optionalString(data.stripeCustomerId);
  const stripeSubscriptionId = optionalString(data.stripeSubscriptionId);
  if (!plan && !status && !stripeCustomerId && !stripeSubscriptionId) {
    return null;
  }
  return {
    id: userId,
    userId,
    plan: plan ?? 'Individual',
    status: status ?? 'active',
    stripeCustomerId: stripeCustomerId ?? null,
    stripeSubscriptionId: stripeSubscriptionId ?? null,
  };
}
