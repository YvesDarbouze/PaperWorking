/**
 * PaperWorking Security & Compliance — Password Strength & Session Policy
 * 
 * Enforces enterprise-grade password policy:
 * - Minimum 12 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special symbol
 */

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

export function validatePasswordStrength(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < 12) {
    errors.push('Password must be at least 12 characters in length');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least 1 uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least 1 lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least 1 numeric digit');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least 1 special symbol');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export const SESSION_SECURITY_POLICY = {
  idleTimeoutHours: 24,         // 24 hours idle timeout
  absoluteTimeoutDays: 7,       // 7 days absolute session max age
  maxConcurrentSessions: 3,     // Limit 3 active sessions per user
  bcryptCostFactor: 12,         // Bcrypt cost factor 12
};
