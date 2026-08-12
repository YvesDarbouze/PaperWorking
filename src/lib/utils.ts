import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Standardized PII & Credentials Masking Utilities for Admin Panels
 * Preserves initial and final characters while obfuscating sensitive segments.
 */

export function maskEmail(email: string | null | undefined): string {
  if (!email) return '—';
  const parts = email.split('@');
  if (parts.length !== 2) return '••••';
  const [name, domain] = parts;
  const maskedName = name.length <= 2 ? `${name[0]}*` : `${name[0]}${'*'.repeat(name.length - 2)}${name[name.length - 1]}`;
  const domainParts = domain.split('.');
  const maskedDomain = domainParts[0].length <= 2 ? `${domainParts[0][0]}*` : `${domainParts[0][0]}${'*'.repeat(domainParts[0].length - 1)}`;
  const ext = domainParts.slice(1).join('.');
  return `${maskedName}@${maskedDomain}.${ext}`;
}

export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '—';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '***';
  const lastFour = digits.slice(-4);
  return `***-***-${lastFour}`;
}

export function maskAccount(accountNumber: string | null | undefined): string {
  if (!accountNumber) return '—';
  const str = String(accountNumber).trim();
  if (str.length <= 4) return `•••• ${str}`;
  return `•••• ${str.slice(-4)}`;
}

export function maskToken(token: string | null | undefined): string {
  if (!token) return '—';
  if (token.length <= 8) return '••••••••';
  return `${token.slice(0, 4)}••••${token.slice(-4)}`;
}
