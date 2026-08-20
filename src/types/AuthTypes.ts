/**
 * Auth Domain Types for Techies Application.
 */

export type AuthRole = 'MEMBER' | 'ORGANIZER';

export interface PasswordValidationResult {
  isValid: boolean;
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  message?: string;
}

export interface UserAccount {
  uid: string;
  email: string;
  passwordHash: string;
  emailVerified: boolean;
  verificationToken?: string;
  resetToken?: string;
  role: AuthRole;
  createdAt: number;
  lastLogin: number;
}

export interface UserSession {
  uid: string;
  email: string;
  role: AuthRole;
  token: string;
  expiresAt: number;
}
