import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

/**
 * ── AI Listing Agent ──
 * Generates high-converting property descriptions using 
 * deal specifications and renovation highlights.
 */

export interface ListingSpecs {
  address: string;
  beds: number;
  baths: number;
  sqft: number;
  renovations: string[]; // e.g. ["New Shaker cabinets", "Quartz countertops"]
  arv: number;
  neighborhood: string;
}

/**
 * Generates a professional description for Zillow/MLS/Redfin.
 */
export async function generatePropertyDescription(specs: ListingSpecs) {
  const prompt = `
    You are a luxury real estate marketing expert. Write a compelling, professional property description 
    for a listing on Zillow and MLS based on the following specifications:
    
    ADDRESS: ${specs.address}
    SPECS: ${specs.beds} Beds, ${specs.baths} Baths, ${specs.sqft} SqFt
    NEIGHBORHOOD: ${specs.neighborhood}
    RENOVATION HIGHLIGHTS: ${specs.renovations.join(', ')}
    TARGET VALUE: $${(specs.arv / 100).toLocaleString()}
    
    STYLE REQUIREMENTS:
    - Tone: Institutional, precise, and sophisticated (Antigravity Brand Voice).
    - Visuals: Describe spaces with architectural clarity (e.g., "Open-concept flow", "Natural light optimization").
    - Materials: Focus on the durability and premium nature of ${specs.renovations.join(', ')}.
    - Neighborhood DNA: Briefly touch on the long-term investment viability of the ${specs.neighborhood} area.
    - Structure: Use short, punchy paragraphs. Avoid flowery adjectives.
    - CTA: Professional prompt for qualified buyer tours or digital inspections.
  `;

  try {
    const { text } = await generateText({
      model: google('gemini-1.5-flash'), // Using a efficient, fast model for descriptions
      prompt,
    });

    return text;
  } catch (error) {
    console.error('AI Generation Failure:', error);
    throw new Error('Failed to generate description. Check AI SDK configuration.');
  }
}
