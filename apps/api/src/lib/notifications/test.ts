export const NOTIFICATION_TEST_TEMPLATES = [
  'RENT_PAYMENT_RECEIVED',
  'EXPENSE_PAID',
  'MORTGAGE_PAYMENT_PROCESSED',
  'CAPITAL_EXPENDITURE_RECORDED',
  'AUTO_APPROVED_BY_RULE',
  'TRANSACTION_DAILY_DIGEST',
  'TRANSACTION_WEEKLY_SUMMARY',
] as const;

export type NotificationTestTemplate = (typeof NOTIFICATION_TEST_TEMPLATES)[number];

export function validateNotificationTestBody(
  body: { template?: unknown },
): { ok: true; template: NotificationTestTemplate } | { ok: false; error: string; status: number; details?: unknown } {
  const template = body.template;
  if (
    typeof template !== 'string' ||
    !(NOTIFICATION_TEST_TEMPLATES as readonly string[]).includes(template)
  ) {
    return {
      ok: false,
      error: `Invalid template. Valid options: ${NOTIFICATION_TEST_TEMPLATES.join(', ')}`,
      status: 422,
    };
  }
  return { ok: true, template: template as NotificationTestTemplate };
}

export function prefixTestEmailSubject(subject: string): string {
  return `[TEST] ${subject}`;
}

export function prefixTestEmailText(text: string): string {
  return `[TEST EMAIL]\n\n${text}`;
}
