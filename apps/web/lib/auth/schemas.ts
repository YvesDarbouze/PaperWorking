import { z } from 'zod';

const GTLDS = new Set([
  'com',
  'net',
  'org',
  'edu',
  'gov',
  'mil',
  'int',
  'io',
  'ai',
  'app',
  'dev',
  'tech',
  'xyz',
  'info',
  'biz',
  'test',
]);

const SINGLE_TLD_PROVIDERS = new Set([
  'gmail',
  'googlemail',
  'icloud',
  'protonmail',
]);

export function isValidEmailAddress(rawEmail: string): boolean {
  if (typeof rawEmail !== 'string') return false;
  const email = rawEmail.trim();
  if (email.length < 1 || email.length > 254 || /\s/.test(email)) {
    return false;
  }

  const parts = email.split('@');
  if (parts.length !== 2) return false;
  const [localPart, rawDomain] = parts;

  if (
    !localPart ||
    localPart.length < 1 ||
    localPart.length > 64 ||
    localPart.startsWith('.') ||
    localPart.endsWith('.') ||
    localPart.includes('..') ||
    !/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(localPart)
  ) {
    return false;
  }

  const domainPart = rawDomain.toLowerCase();
  if (
    domainPart.length < 3 ||
    domainPart.length > 253 ||
    domainPart.startsWith('.') ||
    domainPart.endsWith('.') ||
    domainPart.startsWith('-') ||
    domainPart.endsWith('-') ||
    domainPart.includes('..')
  ) {
    return false;
  }

  const labels = domainPart.split('.');
  if (labels.length < 2 || labels.length > 4) {
    return false;
  }

  for (const label of labels) {
    if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) {
      return false;
    }
  }

  const finalTld = labels[labels.length - 1];
  if (!/^[a-z]{2,24}$/.test(finalTld)) {
    return false;
  }

  for (let i = 1; i < labels.length; i++) {
    if (labels[i] === labels[i - 1]) {
      return false;
    }
  }

  const suffixLabels = labels.slice(1);
  if (new Set(suffixLabels).size !== suffixLabels.length) {
    return false;
  }

  if (SINGLE_TLD_PROVIDERS.has(labels[0]) && labels.length !== 2) {
    return false;
  }

  const intermediateLabels = labels.slice(1, -1);
  for (const label of intermediateLabels) {
    if (GTLDS.has(label)) {
      if (labels.length !== 3 || !/^[a-z]{2}$/.test(finalTld)) {
        return false;
      }
    }
  }

  return true;
}

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .refine(isValidEmailAddress, { message: 'Please enter a valid email address' }),
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must be under 100 characters')
      .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
    email: z
      .string()
      .min(1, 'Work email is required')
      .email('Please enter a valid email address')
      .refine(isValidEmailAddress, { message: 'Please enter a valid email address' }),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: 'You must accept the Terms of Service and Privacy Policy',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .refine(isValidEmailAddress, { message: 'Please enter a valid email address' }),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export const passwordResetSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type PasswordResetFormValues = z.infer<typeof passwordResetSchema>;
