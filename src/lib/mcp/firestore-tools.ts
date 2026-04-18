import * as admin from 'firebase-admin';
import { z } from 'zod';

/**
 * PaperWorking Firestore MCP Tools
 * 
 * Provides tools for the AI to interact with the deal pipeline,
 * ledger items, and organization metrics.
 */

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!admin.apps.length && projectId && clientEmail && privateKey) {
  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}

const db = admin.firestore();

// ─── Tools ─────────────────────────────────────────────────────────

/**
 * list_active_projects
 * Retrieves a list of all active property projects for an organization.
 */
export const list_active_projects = {
  name: 'list_active_projects',
  description: 'List all active property projects for the current organization.',
  schema: z.object({
    organizationId: z.string().describe('The organization ID to filter by.'),
  }),
  handler: async ({ organizationId }: { organizationId: string }) => {
    const snapshot = await db.collection('projects')
      .where('organizationId', '==', organizationId)
      .get();
    
    const projects = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return {
      content: [{ type: 'text', text: JSON.stringify(projects, null, 2) }]
    };
  }
};

/**
 * get_deal_metrics
 * Fetches the financial summary (ROI, Net Profit, etc.) for a specific deal.
 */
export const get_deal_metrics = {
  name: 'get_deal_metrics',
  description: 'Fetch detailed financial metrics (ROI, Net Profit, Investment) for a specific deal.',
  schema: z.object({
    projectId: z.string().describe('The ID of the deal.'),
  }),
  handler: async ({ projectId }: { projectId: string }) => {
    const summaryDoc = await db.collection('projects')
      .doc(projectId)
      .collection('privateFinancials')
      .doc('summary')
      .get();

    if (!summaryDoc.exists) {
      return {
        content: [{ type: 'text', text: `No financial summary found for deal ${projectId}.` }]
      };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(summaryDoc.data(), null, 2) }]
    };
  }
};

/**
 * query_ledger
 * Queries the ledgerItems sub-collection for a deal, optionally filtering by category.
 */
export const query_ledger = {
  name: 'query_ledger',
  description: 'Query the expense ledger for a specific property deal.',
  schema: z.object({
    projectId: z.string().describe('The ID of the deal.'),
    category: z.string().optional().describe('Optional category filter (e.g., "Plumbing", "HVAC").'),
  }),
  handler: async ({ projectId, category }: { projectId: string, category?: string }) => {
    let query: admin.firestore.Query = db.collection('projects').doc(projectId).collection('ledgerItems');
    
    if (category) {
      query = query.where('category', '==', category);
    }

    const snapshot = await query.get();
    const items = snapshot.docs.map(doc => doc.data());

    return {
      content: [{ type: 'text', text: JSON.stringify(items, null, 2) }]
    };
  }
};
