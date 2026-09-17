import { z } from 'zod';
import type { FaqEntry, GlossaryTerm, FaqCategory, GlossaryCategory } from './types.js';

export class ContentSecurityError extends Error {
  public readonly status: number;
  constructor(message: string, status: number = 400) {
    super(message);
    this.name = 'ContentSecurityError';
    this.status = status;
  }
}

// Category Enums matching types.ts
export const faqCategoryEnum = z.enum([
  'Platform',
  'REIL',
  'Underwriting',
  'Collaboration',
  'Billing',
  'Security',
]);

export const glossaryCategoryEnum = z.enum([
  'REIL Phase',
  'Financial Metric',
  'Contract & Legal',
  'Platform Entity',
  'Security',
]);

// 1. Zod Validation Schemas
export const faqEntryInputSchema = z.object({
  id: z
    .string()
    .min(1, 'FAQ id is required')
    .max(120, 'FAQ id must be 120 characters or less')
    .regex(/^[a-zA-Z0-9_-]+$/, 'FAQ id may only contain alphanumeric characters, dashes, and underscores'),
  question: z
    .string()
    .min(3, 'FAQ question must be at least 3 characters')
    .max(400, 'FAQ question must be 400 characters or less'),
  answer: z
    .string()
    .min(5, 'FAQ answer must be at least 5 characters')
    .max(6000, 'FAQ answer must be 6000 characters or less'),
  category: faqCategoryEnum,
  order: z.number().int().optional(),
});

export const faqPatchInputSchema = z.object({
  id: z
    .string()
    .min(1, 'FAQ id is required')
    .max(120, 'FAQ id must be 120 characters or less')
    .regex(/^[a-zA-Z0-9_-]+$/, 'FAQ id may only contain alphanumeric characters, dashes, and underscores'),
  question: z.string().min(3).max(400).optional(),
  answer: z.string().min(5).max(6000).optional(),
  category: faqCategoryEnum.optional(),
  order: z.number().int().optional(),
});

export const glossaryTermInputSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional(),
  term: z
    .string()
    .min(2, 'Term must be at least 2 characters')
    .max(120, 'Term must be 120 characters or less'),
  definition: z
    .string()
    .min(5, 'Definition must be at least 5 characters')
    .max(6000, 'Definition must be 6000 characters or less'),
  category: glossaryCategoryEnum,
});

export const glossaryPatchInputSchema = z.object({
  id: z.string().min(1).max(120).optional(),
  term: z.string().min(2).max(120).optional(),
  definition: z.string().min(5).max(6000).optional(),
  category: glossaryCategoryEnum.optional(),
});

// 2. Disallowed Instruction Patterns & Jailbreak Regexes
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
  /disregard\s+(all\s+)?(previous|prior)\s+instructions/i,
  /system\s+prompt/i,
  /you\s+are\s+now/i,
  /act\s+as\s+(an?\s+)?(ai|assistant|hacker|root|admin|jailbreak)/i,
  /pretend\s+to\s+be/i,
  /(reveal|output|print|leak|exfiltrate|show)\s+(the\s+)?(secret|internal|system|prompt|support\s+email|email|password|credential)/i,
  /bypass\s+(safety|filters|security|guidelines)/i,
  /hi@paperworking\.co/i,
  /support@paperworking\.co/i,
  /<script[\s>]/i,
  /<\/?(iframe|object|embed|form)[\s>]/i,
  /javascript:/i,
  /\[inst\]|\[\/inst\]|<\|im_start\|>|<\|im_end\|>/i,
];

// Patterns for emails and URLs
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i;
const AT_SYMBOL_REGEX = /@/;
const URL_REGEX = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(ftp:\/\/[^\s]+)/i;

/**
 * Validates text content against injection patterns, emails, and URLs.
 * Throws ContentSecurityError if prohibited content is detected.
 */
export function assertContentSecurity(text: string, fieldName: string = 'content'): void {
  // Check for prompt injections and malicious instruction lines
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      throw new ContentSecurityError(
        `Disallowed instruction pattern or prompt injection detected in ${fieldName}.`,
        400,
      );
    }
  }

  // Reject email addresses (@ symbol)
  if (AT_SYMBOL_REGEX.test(text) || EMAIL_REGEX.test(text)) {
    throw new ContentSecurityError(
      `Email addresses are prohibited in knowledge base ${fieldName}.`,
      400,
    );
  }

  // Reject external URLs
  if (URL_REGEX.test(text)) {
    throw new ContentSecurityError(
      `External URLs are prohibited in knowledge base ${fieldName}.`,
      400,
    );
  }
}

/**
 * Strips or redacts any lingering email patterns or URLs from text.
 */
export function sanitizeSupportText(text: string): string {
  let cleaned = text;
  // Redact emails
  cleaned = cleaned.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[contact via support form]');
  cleaned = cleaned.replace(/@\S+/g, '[contact via support form]');
  // Redact URLs
  cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, '[link removed]');
  cleaned = cleaned.replace(/www\.[^\s]+/g, '[link removed]');
  return cleaned;
}

/**
 * Pepper Output Guard: strictly sanitizes output text before streaming.
 * Invariant: NEVER output internal support email, contact emails, or raw '@' characters.
 */
export function sanitizePepperOutput(text: string): string {
  let sanitized = text;

  // 1. Explicitly redact protected internal email
  sanitized = sanitized.replace(/hi@paperworking\.co/gi, 'the Support Form');
  sanitized = sanitized.replace(/support@paperworking\.co/gi, 'the Support Form');

  // 2. Redact any generic email address pattern
  sanitized = sanitized.replace(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    'the Support Form',
  );

  // 3. Redact any standalone '@' symbol to prevent obfuscated email leaking
  sanitized = sanitized.replace(/@\S+/g, 'the Support Form');
  sanitized = sanitized.replace(/@/g, ' at ');

  return sanitized;
}

/**
 * Validates and sanitizes a FAQ entry before storing.
 */
export function validateAndSanitizeFaqInput(input: unknown): FaqEntry {
  const parsed = faqEntryInputSchema.parse(input);
  assertContentSecurity(parsed.question, 'question');
  assertContentSecurity(parsed.answer, 'answer');
  assertContentSecurity(parsed.category, 'category');

  return {
    ...parsed,
    question: sanitizeSupportText(parsed.question).trim(),
    answer: sanitizeSupportText(parsed.answer).trim(),
    category: parsed.category as FaqCategory,
  };
}

/**
 * Validates and sanitizes a FAQ patch input.
 */
export function validateAndSanitizeFaqPatch(input: unknown): Partial<FaqEntry> & { id: string } {
  const parsed = faqPatchInputSchema.parse(input);
  if (parsed.question) {
    assertContentSecurity(parsed.question, 'question');
    parsed.question = sanitizeSupportText(parsed.question).trim();
  }
  if (parsed.answer) {
    assertContentSecurity(parsed.answer, 'answer');
    parsed.answer = sanitizeSupportText(parsed.answer).trim();
  }
  if (parsed.category) {
    assertContentSecurity(parsed.category, 'category');
  }

  return parsed as Partial<FaqEntry> & { id: string };
}

/**
 * Validates and sanitizes a Glossary term input before storing.
 */
export function validateAndSanitizeGlossaryInput(input: unknown): GlossaryTerm {
  const parsed = glossaryTermInputSchema.parse(input);
  assertContentSecurity(parsed.term, 'term');
  assertContentSecurity(parsed.definition, 'definition');
  assertContentSecurity(parsed.category, 'category');

  return {
    ...parsed,
    term: sanitizeSupportText(parsed.term).trim(),
    definition: sanitizeSupportText(parsed.definition).trim(),
    category: parsed.category as GlossaryCategory,
  };
}

/**
 * Validates and sanitizes a Glossary patch input.
 */
export function validateAndSanitizeGlossaryPatch(
  input: unknown,
): Partial<GlossaryTerm> & { id?: string; term?: string } {
  const parsed = glossaryPatchInputSchema.parse(input);
  if (!parsed.id && !parsed.term) {
    throw new ContentSecurityError('Either "id" or "term" is required to update a glossary term.', 400);
  }
  if (parsed.term) {
    assertContentSecurity(parsed.term, 'term');
    parsed.term = sanitizeSupportText(parsed.term).trim();
  }
  if (parsed.definition) {
    assertContentSecurity(parsed.definition, 'definition');
    parsed.definition = sanitizeSupportText(parsed.definition).trim();
  }
  if (parsed.category) {
    assertContentSecurity(parsed.category, 'category');
  }

  return parsed as Partial<GlossaryTerm> & { id?: string; term?: string };
}
