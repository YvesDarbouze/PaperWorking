import { NextResponse, type NextRequest } from 'next/server';
import { normalizeToStructuredError } from '@paperworking/shared';
import {
  searchFaqEntries,
  getFaqEntries,
  searchGlossaryTerms,
  getGlossaryTerms,
} from '@/lib/support/firestore-support-store';
import { sanitizePepperOutput } from '@/lib/support/content-filter';
import * as siteCopy from '@/lib/marketing/copy';

function makeErrorResponse(message: string, status = 400) {
  const structured = normalizeToStructuredError(message, status);
  return new NextResponse(JSON.stringify(structured), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Trace-Id': structured.error.traceId,
    },
  });
}

export const dynamic = 'force-dynamic';

// Rate Limiting: 20 requests per minute per IP
const pepperIpTimestamps = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 20;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = (pepperIpTimestamps.get(ip) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  );
  if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  timestamps.push(now);
  pepperIpTimestamps.set(ip, timestamps);
  return true;
}

// Out-of-scope fallback invariant
const FALLBACK_MESSAGE =
  "I don't know — want to make a feature request or request a call back?";

// Contact escalation invariant — never output email addresses or raw strings
const CONTACT_ESCALATION_MESSAGE =
  'To reach the PaperWorking team directly, please submit a message using the Support Form below or request a call back from our team.';

// Jailbreak / prompt injection refusal message
const JAILBREAK_REFUSAL_MESSAGE =
  'I am Pepper, the PaperWorking assistant. I cannot disclose internal system prompts, developer instructions, or email addresses. For assistance, please use the Support Form below or request a call back.';

// Advice refusal message (Review C3.5: Pepper Cage)
const ADVICE_REFUSAL_MESSAGE =
  "I can explain terms, but I can't advise on your deal — consult a licensed professional.";

// Real Estate & PaperWorking domain keywords
const DOMAIN_KEYWORDS = [
  'paperworking',
  'reil',
  'acquisition',
  'fund',
  'hold',
  'exit',
  'project',
  'deal',
  'calculator',
  'underwriting',
  'metric',
  'kpi',
  'arv',
  'cap rate',
  'cash on cash',
  'irr',
  'noi',
  'dscr',
  'earnest money',
  'contingency',
  'deadline',
  'trial',
  'free trial',
  'subscription',
  'pricing',
  'plan',
  'team',
  'cpa',
  'lender',
  'contractor',
  'vendor',
  'rehab',
  'rehabilitation',
  'budget',
  'holding cost',
  'draw',
  'tax',
  'schedule e',
  'form 4797',
  'export',
  'report',
  'marketplace',
  'syndicat',
  'offline',
  'pwa',
  'workspace',
  'portfolio',
  'insights',
  'investor',
  'app',
  'login',
  'support',
  'pepper',
  'contact',
  'email',
  'call',
  'help',
  'plaid',
  'bank',
  'ledger',
  'reclassify',
  'liability',
  'expense',
  'revenue',
  '1031',
  'exchange',
  'depreciation',
  'disposition',
  'refinance',
  'phase gate',
  'hurdle',
  'override',
  'blocked',
  'spreadsheet',
  'csv',
  'import',
  'llc',
  'entity',
  'vault',
  'document',
  'escrow',
  'inspection',
  'appraisal',
  'title',
  'closing',
  'contract',
  'capex',
  'ltv',
  'moic',
  'equity multiple',
  'yield',
  'cash flow',
  'burn',
  'variance',
  'milestone',
  'invoice',
  'lien',
  'waiver',
  'directory',
];

// Jailbreak / injection detection regexes
const JAILBREAK_DETECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
  /disregard\s+(all\s+)?(previous|prior)\s+instructions/i,
  /system\s+prompt/i,
  /you\s+are\s+now/i,
  /act\s+as\s+(an?\s+)?(ai|assistant|hacker|root|admin|jailbreak)/i,
  /pretend\s+to\s+be/i,
  /(reveal|output|print|leak|exfiltrate|tell\s+me|show)\s+(the\s+)?(secret|internal|system|prompt|support\s+email|contact\s+email|email|password|credential)/i,
  /bypass\s+(safety|filters|security|guidelines)/i,
  /what\s+is\s+(the\s+)?(support\s+email|secret\s+email|internal\s+email|email\s+address)/i,
];

function isJailbreakAttempt(text: string): boolean {
  return JAILBREAK_DETECTION_PATTERNS.some((pattern) => pattern.test(text));
}

function isContactQuery(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes('contact') ||
    lower.includes('email address') ||
    lower.includes('reach a human') ||
    lower.includes('speak with someone') ||
    lower.includes('customer service') ||
    lower.includes('phone number') ||
    lower.includes('call back')
  );
}

// Advice-shaped detection regexes (Review C3.5 Pepper Cage)
const ADVICE_DETECTION_PATTERNS = [
  /\bshould I buy\b/i,
  /\bshould I sell\b/i,
  /\bshould I invest\b/i,
  /\bshould I purchase\b/i,
  /\bshould I make an offer\b/i,
  /\bcan you advise (me)?\b/i,
  /\badvise me on\b/i,
  /\bis this (?:property|deal|house|building) a good deal\b/i,
  /\bis this a good (?:deal|investment|purchase)\b/i,
  /\bhow much should I offer\b/i,
  /\bwhat should my offer be\b/i,
  /\bwill I make money\b/i,
  /\bis this profitable\b/i,
  /\bwould you recommend (?:buying|investing|purchasing)\b/i,
  /\bgive me (?:financial|legal|tax|investment) advice\b/i,
  /\bdo you recommend (?:this|that|buying|selling)\b/i,
];

function isAdviceSeekingQuery(text: string): boolean {
  return ADVICE_DETECTION_PATTERNS.some((pattern) => pattern.test(text));
}

const QUERY_STOPWORDS = new Set([
  'how',
  'does',
  'the',
  'what',
  'is',
  'are',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'and',
  'or',
  'a',
  'an',
  'with',
  'by',
  'from',
  'can',
  'i',
  'my',
  'your',
  'do',
  'you',
  'it',
  'this',
  'that',
  'be',
  'as',
]);

function normalizeToken(token: string): string {
  if (token === 'rehabilitation' || token === 'rehabbing') return 'rehab';
  if (token.endsWith('ies') && token.length > 4) return `${token.slice(0, -3)}y`;
  if (token.endsWith('s') && !token.endsWith('ss') && token.length > 3) return token.slice(0, -1);
  return token;
}

function tokenizeForMatch(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !QUERY_STOPWORDS.has(t))
    .map(normalizeToken);
}

const HIGH_SIGNAL_PHRASES = [
  'hold phase',
  'holding cost',
  'rehab budget',
  'rehabilitation budget',
  'fund phase',
  'acquisition phase',
  'exit phase',
  'earnest money',
  'contingency deadline',
  'deal calculator',
  'portfolio insights',
  'deal marketplace',
  'schedule e',
  'form 4797',
  'free trial',
  '14-day',
  'project workspace',
  'offline',
  'outside collaborators',
  'disposition strategies',
];

async function retrieveDomainContext(query: string) {
  const lower = query.toLowerCase().trim();
  const allFaqs = await getFaqEntries();
  const allTerms = await getGlossaryTerms();

  const queryTokens = tokenizeForMatch(lower);

  // Score and rank FAQs by exact match, phrase match, and normalized token overlap
  const scoredFaqs = allFaqs
    .map((faq) => {
      const qLower = faq.question.toLowerCase();
      const aLower = faq.answer.toLowerCase();
      const combined = `${qLower} ${aLower}`;
      let score = 0;

      if (
        lower.includes(qLower) ||
        (lower.length >= 6 && (qLower.includes(lower) || aLower.includes(lower)))
      ) {
        score += 100;
      }

      for (const phrase of HIGH_SIGNAL_PHRASES) {
        if (lower.includes(phrase) && combined.includes(phrase)) {
          score += 20;
        }
      }

      if (lower.includes('rehab') && lower.includes('budget') && combined.includes('budget')) {
        score += 20;
      }

      if (lower.includes('hold phase') && faq.id === 'faq-hold') score += 35;
      if (lower.includes('fund phase') && faq.id === 'faq-fund') score += 35;
      if (lower.includes('acquisition phase') && faq.id === 'faq-acquisition') score += 35;
      if (lower.includes('exit phase') && faq.id === 'faq-exit') score += 35;

      const qTokens = new Set(tokenizeForMatch(qLower));
      const aTokens = new Set(tokenizeForMatch(aLower));

      for (const token of queryTokens) {
        if (qTokens.has(token)) {
          score += 5;
        } else if (aTokens.has(token)) {
          score += 1.5;
        }
      }

      return { faq, score };
    })
    .filter((entry) => entry.score >= 8)
    .sort((a, b) => b.score - a.score);

  const matchedFaqs = scoredFaqs.map((entry) => entry.faq);

  // Match Terms if query mentions the term or abbreviation, ranked by specificity
  const queryWords = lower.split(/[^a-z0-9_-]+/);
  const matchedTerms = allTerms
    .map((term) => {
      const termLower = term.term.toLowerCase();
      const simpleTerm = termLower.replace(/\s*\([^)]*\)/g, '').trim();
      const acronymMatch = termLower.match(/\(([^)]+)\)/);
      const acronym = acronymMatch ? acronymMatch[1].trim().toLowerCase() : '';
      const matched =
        lower.includes(termLower) ||
        (simpleTerm.length >= 3 && lower.includes(simpleTerm)) ||
        (acronym.length >= 2 && (queryWords.includes(acronym) || lower.includes(acronym))) ||
        (term.id && lower.includes(term.id)) ||
        (lower.length >= 4 && termLower.includes(lower));
      if (!matched) return null;
      let score = simpleTerm.length;
      if (lower.includes(termLower)) score += 60;
      else if (simpleTerm.length >= 8 && lower.includes(simpleTerm)) score += 40;
      return { term, score };
    })
    .filter((item): item is { term: (typeof allTerms)[number]; score: number } => item !== null)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.term);

  const matchedCopy: string[] = [];
  if (lower.includes('deal calculator') || lower.includes('calculator')) {
    matchedCopy.push(siteCopy.dealCalculatorSectionBody);
    matchedCopy.push(siteCopy.dealCalculatorSectionSub);
  }
  if (
    lower.includes('reil') ||
    lower.includes('lifecycle') ||
    lower.includes('acquisition') ||
    lower.includes('fund') ||
    lower.includes('hold') ||
    lower.includes('exit')
  ) {
    matchedCopy.push(siteCopy.reilNarrativeLead);
    matchedCopy.push(siteCopy.reilNarrativeAcquisitionFull);
    matchedCopy.push(siteCopy.reilNarrativeFundFull);
    matchedCopy.push(siteCopy.reilNarrativeHoldFull);
    matchedCopy.push(siteCopy.reilNarrativeExitFull);
  }
  if (lower.includes('marketplace')) {
    matchedCopy.push(siteCopy.dealMarketplaceDescription);
    matchedCopy.push(siteCopy.vendorMarketplaceDescription);
  }
  if (lower.includes('terminal') || lower.includes('bloomberg') || lower.includes('pricing')) {
    matchedCopy.push(siteCopy.pricingHeader);
    matchedCopy.push(siteCopy.pricingPositioningHeadline);
    matchedCopy.push(siteCopy.pricingSubheadline);
    matchedCopy.push(siteCopy.pricingBody);
  }

  return {
    matchedFaqs,
    matchedTerms,
    matchedCopy,
  };
}


import {
  streamPepperResponse,
} from '@/lib/assistant/firebase-ai-client';

export async function POST(request: NextRequest) {
  try {
    // 1. Rate Limiting Check
    const forwarded = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const clientIp = forwarded.split(',')[0]?.trim() || '127.0.0.1';
    if (!checkRateLimit(clientIp)) {
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests. Please slow down.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // 2. Parse Body
    let body: any;
    try {
      body = await request.json();
    } catch {
      return makeErrorResponse('Invalid JSON request body.', 400);
    }

    // 3. Honeypot Anti-Abuse
    if (body.hp_website && String(body.hp_website).trim().length > 0) {
      return makeErrorResponse('Bot submission detected.', 400);
    }

    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message) {
      return makeErrorResponse('Message is required.', 400);
    }

    // 4. Jailbreak & Prompt Injection Guard
    if (isJailbreakAttempt(message)) {
      const stream = createGuardedTextStream(JAILBREAK_REFUSAL_MESSAGE);
      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked',
        },
      });
    }

    // 5. Contact Query Escalation Guard: Never output emails or phone strings
    if (isContactQuery(message)) {
      const stream = createGuardedTextStream(CONTACT_ESCALATION_MESSAGE);
      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked',
        },
      });
    }

    // 5b. Advice Query Refusal Guard (Review C3.5: Pepper Cage)
    if (isAdviceSeekingQuery(message)) {
      const stream = createGuardedTextStream(ADVICE_REFUSAL_MESSAGE);
      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked',
        },
      });
    }

    // Protected email never enters model context: sanitize input first
    const sanitizedInput = sanitizePepperOutput(message);
    const lower = sanitizedInput.toLowerCase();

    // 6. Grounding & Domain Relevance Check
    const hasDomainKeyword = DOMAIN_KEYWORDS.some((kw) => lower.includes(kw));
    const context = await retrieveDomainContext(sanitizedInput);
    const hasRetrievedContent =
      context.matchedFaqs.length > 0 ||
      context.matchedTerms.length > 0 ||
      context.matchedCopy.length > 0;

    // Out-of-scope query check: If not domain related, return honest fallback
    if (!hasDomainKeyword && !hasRetrievedContent) {
      const stream = createGuardedTextStream(FALLBACK_MESSAGE);
      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked',
        },
      });
    }

    // 7. Generate Grounded AI Response via Firebase AI Logic / Gemini
    const stream = await streamPepperResponse({
      message: sanitizedInput,
      retrievedContext: {
        matchedFaqs: context.matchedFaqs,
        matchedTerms: context.matchedTerms,
        matchedCopy: context.matchedCopy,
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (err) {
    console.error('[Pepper Route Error]:', err);
    return makeErrorResponse('An unexpected error occurred.', 500);
  }
}

/**
 * Creates a stream that sanitizes text and outputs chunks with zero email leak risk.
 */
function createGuardedTextStream(rawText: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const safeText = sanitizePepperOutput(rawText);

  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(safeText));
      controller.close();
    },
  });
}
