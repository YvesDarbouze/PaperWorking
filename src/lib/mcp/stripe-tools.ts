import Stripe from 'stripe';
import { z } from 'zod';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  // @ts-ignore - using latest api version
  apiVersion: '2026-03-25.dahlia',
  timeout: 30000,
  maxNetworkRetries: 3,
});

/**
 * PaperWorking Stripe MCP Tools
 */

export const verify_subscription = {
  name: 'verify_subscription',
  description: 'Verify the subscription tier and status for a specific customer.',
  schema: z.object({
    customerId: z.string().describe('The Stripe Customer ID.'),
  }),
  handler: async ({ customerId }: { customerId: string }) => {
    try {
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 1,
      });

      if (subscriptions.data.length === 0) {
        return {
          content: [{ type: 'text', text: 'No active subscription found.' }]
        };
      }

      const sub = subscriptions.data[0];
      const planName = sub.items.data[0]?.price?.nickname || 'Standard';
      const amount = sub.items.data[0]?.price?.unit_amount || 0;

      return {
        content: [{ 
          type: 'text', 
          text: `Active Subscription: ${planName} ($${(amount / 100).toFixed(2)}/mo). Status: ${sub.status}.` 
        }]
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Failed to verify subscription: ${error.message}` }]
      };
    }
  }
};
