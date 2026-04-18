import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { Project } from '@/types/schema';

/**
 * DraftingAgent
 * Logic for generating context-aware email drafts based on Kanban state.
 */
export const draftingAgent = {
  
  /**
   * Generates a status update draft.
   */
  async draftDealUpdate(deal: Project, audience: 'investors' | 'contractors') {
    const prompt = `
      You are an AI assistant for PaperWorking, a premium real estate intelligence and syndication platform.
      Your task is to draft a precise, institutional status update for the project: ${deal.propertyName}.
      
      PROJECT METRICS:
      - Asset: ${deal.address}
      - Lifecycle Stage: ${deal.status}
      - Capital Expenditure (CapEx): $${deal.financials.projectedRehabCost?.toLocaleString() || 'N/A'}
      - Valuation Target (ARV): $${deal.financials.estimatedARV?.toLocaleString() || 'N/A'}
      
      STAKEHOLDER AUDIENCE: ${audience}
      
      TONE: Institutional, precise, and sophisticated (Antigravity Brand Voice).
      
      GUIDELINES:
      - Structure: Use short, punchy paragraphs. Avoid flowery adjectives or standard realtor clichés.
      - Narrative: Focus on data-driven progress and capital efficiency.
      - Investor Focus: Emphasize ROI trajectory, liquidity events, and risk mitigation milestones.
      - Contractor Focus: Emphasize schedule velocity, permit compliance, and material durability.
      - CTA: Professional prompt for specific feedback or next-step approvals.
    `;

    try {
      const { text } = await generateText({
        model: google('gemini-1.5-flash'),
        prompt,
      });

      return text;
    } catch (error) {
      console.error('AI Draft Failure:', error);
      return "I was unable to generate a draft at this time. Please check your deal notes and write a manual update.";
    }
  }
};
