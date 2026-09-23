/**
 * Canonical support mailbox addresses shared by intake routes and the admin console.
 */

/** Transactional reply sender used for ticket replies (server overrides via SENDGRID_FROM_EMAIL). */
export const SUPPORT_REPLY_FROM_EMAIL = 'no_reply@paperworking.co';

/** Default assignee shown for unassigned tickets in the admin console. */
export const SUPPORT_ADMIN_ASSIGNEE_EMAIL = 'admin@paperworking.co';
