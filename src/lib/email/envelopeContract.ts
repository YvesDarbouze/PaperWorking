/**
 * PaperWorking — Email Envelope & Identity Contract (EM Series v2 · Gate E-2, E-3, E-10, E-11)
 *
 * Single source of truth for:
 * 1. From addresses and display names (strictly on @mail.paperworking.co)
 * 2. Monitored Reply-To addresses (hi@paperworking.co) and relay patterns
 * 3. Message Classes (E: Essential, O: Optional, C: Commercial)
 * 4. RFC 8058 List-Unsubscribe / List-Unsubscribe-Post headers
 * 5. SendGrid ASM Unsubscribe Groups
 * 6. CAN-SPAM physical address footer for Commercial emails
 */

export type MessageClass = 'E' | 'O' | 'C';

export type SenderCategory = 'security' | 'billing' | 'team' | 'notifications';

export interface EnvelopeSender {
  email: string;
  name: string;
}

export const SENDER_IDENTITIES: Record<SenderCategory, EnvelopeSender> = {
  security: {
    email: 'security@mail.paperworking.co',
    name: 'PaperWorking Security',
  },
  billing: {
    email: 'billing@mail.paperworking.co',
    name: 'PaperWorking Billing',
  },
  team: {
    email: 'team@mail.paperworking.co',
    name: 'PaperWorking Team',
  },
  notifications: {
    email: 'notifications@mail.paperworking.co',
    name: 'PaperWorking Notifications',
  },
};

export const MONITORED_SUPPORT_EMAIL = 'hi@paperworking.co';
export const INBOUND_RELAY_DOMAIN = process.env.INBOUND_EMAIL_DOMAIN || 'reply.paperworking.co';

/**
 * CAN-SPAM Physical Postal Address string (Gate E-10, OI-2)
 */
export const CAN_SPAM_PHYSICAL_ADDRESS =
  process.env.CAN_SPAM_POSTAL_ADDRESS || 'PaperWorking Inc., 548 Market St #82500, San Francisco, CA 94104';

/**
 * ASM Unsubscribe Group ID mapping (F-6)
 */
export const ASM_GROUP_CONFIG = {
  optional: process.env.SENDGRID_ASM_OPTIONAL_GROUP_ID
    ? parseInt(process.env.SENDGRID_ASM_OPTIONAL_GROUP_ID, 10)
    : 1001,
  commercial: process.env.SENDGRID_ASM_COMMERCIAL_GROUP_ID
    ? parseInt(process.env.SENDGRID_ASM_COMMERCIAL_GROUP_ID, 10)
    : 1002,
};

/**
 * Generates RFC 8058 compliant List-Unsubscribe headers for a given user token (F-8).
 */
export function generateListUnsubscribeHeaders(userIdOrToken: string, appUrl = 'https://paperworking.co') {
  const url = `${appUrl}/api/unsubscribe?token=${encodeURIComponent(userIdOrToken)}`;
  const mailto = `mailto:unsubscribe@mail.paperworking.co?subject=unsubscribe_${encodeURIComponent(userIdOrToken)}`;

  return {
    listUnsubscribeHeader: `<${url}>, <${mailto}>`,
    listUnsubscribePostHeader: 'List-Unsubscribe=One-Click',
  };
}

/**
 * Builds masked reply relay address for deal correspondence (Gate E-7, F-11).
 */
export function buildRelayReplyTo(token: string): string {
  return `reply+${token}@${INBOUND_RELAY_DOMAIN}`;
}
