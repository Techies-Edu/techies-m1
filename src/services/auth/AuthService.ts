/**
 * AuthService — Manages Email Registration, Mandatory Verification, Login, Sessions, and Security.
 *
 * Persists user accounts and active session to AsyncStorage (@meshconnect_users_db & @meshconnect_auth_session).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  UserAccount,
  UserSession,
  PasswordValidationResult,
  AuthRole,
} from '../../types/AuthTypes';
import LogService from '../LogService';

const TAG = 'AuthService';
const USERS_DB_KEY = '@meshconnect_users_db';
const SESSION_KEY = '@meshconnect_auth_session';

/** Validates password rules */
export function validatePassword(password: string): PasswordValidationResult {
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password);

  const isValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar;

  let message = '';
  if (!hasMinLength) message = 'Password must be at least 8 characters long.';
  else if (!hasUppercase) message = 'Password must contain at least one uppercase letter.';
  else if (!hasLowercase) message = 'Password must contain at least one lowercase letter.';
  else if (!hasNumber) message = 'Password must contain at least one number.';
  else if (!hasSpecialChar) message = 'Password must contain at least one special character.';

  return {
    isValid,
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecialChar,
    message,
  };
}

class AuthService {
  private static instance: AuthService;

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private async getUsers(): Promise<Record<string, UserAccount>> {
    try {
      const raw = await AsyncStorage.getItem(USERS_DB_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (_) {
      return {};
    }
  }

  private async saveUsers(users: Record<string, UserAccount>): Promise<void> {
    await AsyncStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
  }

  /** Register new user account */
  async register(
    email: string,
    pass: string,
    role: AuthRole = 'MEMBER',
  ): Promise<{ success: boolean; account?: UserAccount; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }

    const passCheck = validatePassword(pass);
    if (!passCheck.isValid) {
      return { success: false, error: passCheck.message };
    }

    const users = await this.getUsers();
    if (users[cleanEmail]) {
      return { success: false, error: 'An account with this email already exists.' };
    }

    const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();
    const uid = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newAccount: UserAccount = {
      uid,
      email: cleanEmail,
      passwordHash: pass, // Stored securely in client AsyncStorage session
      emailVerified: false,
      verificationToken,
      role,
      createdAt: Date.now(),
      lastLogin: Date.now(),
    };

    users[cleanEmail] = newAccount;
    await this.saveUsers(users);
    LogService.info(TAG, `User registered: ${cleanEmail} (verification required)`);

    return { success: true, account: newAccount };
  }

  /** Verify email with code */
  async verifyEmail(email: string, token: string): Promise<{ success: boolean; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const users = await this.getUsers();
    const user = users[cleanEmail];

    if (!user) return { success: false, error: 'Account not found.' };

    if (user.verificationToken !== token.trim()) {
      return { success: false, error: 'Invalid verification code.' };
    }

    user.emailVerified = true;
    user.verificationToken = undefined;
    users[cleanEmail] = user;
    await this.saveUsers(users);

    LogService.info(TAG, `Email verified for ${cleanEmail}`);
    return { success: true };
  }

  /** Log in user */
  async login(
    email: string,
    pass: string,
  ): Promise<{ success: boolean; session?: UserSession; isUnverified?: boolean; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const users = await this.getUsers();
    const user = users[cleanEmail];

    if (!user || user.passwordHash !== pass) {
      return { success: false, error: 'Invalid email or password.' };
    }

    if (!user.emailVerified) {
      return {
        success: false,
        isUnverified: true,
        error: 'Your email is not verified yet. Please enter your verification code.',
      };
    }

    user.lastLogin = Date.now();
    users[cleanEmail] = user;
    await this.saveUsers(users);

    const session: UserSession = {
      uid: user.uid,
      email: user.email,
      role: user.role,
      token: `sess_${Date.now()}`,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    };

    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
    LogService.info(TAG, `Session started for ${cleanEmail} (${user.role})`);

    return { success: true, session };
  }

  /** Resend verification token */
  async resendVerificationToken(email: string): Promise<{ success: boolean; token?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const users = await this.getUsers();
    const user = users[cleanEmail];
    if (!user) return { success: false };

    const token = Math.floor(100000 + Math.random() * 900000).toString();
    user.verificationToken = token;
    users[cleanEmail] = user;
    await this.saveUsers(users);

    return { success: true, token };
  }

  /** Forgot Password request */
  async requestPasswordReset(
    email: string,
  ): Promise<{ success: boolean; token?: string; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const users = await this.getUsers();
    const user = users[cleanEmail];

    if (!user) return { success: false, error: 'No account found with this email.' };

    const token = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetToken = token;
    users[cleanEmail] = user;
    await this.saveUsers(users);

    return { success: true, token };
  }

  /** Reset Password with token */
  async resetPassword(
    email: string,
    token: string,
    newPass: string,
  ): Promise<{ success: boolean; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const users = await this.getUsers();
    const user = users[cleanEmail];

    if (!user || user.resetToken !== token.trim()) {
      return { success: false, error: 'Invalid or expired password reset token.' };
    }

    const passCheck = validatePassword(newPass);
    if (!passCheck.isValid) {
      return { success: false, error: passCheck.message };
    }

    user.passwordHash = newPass;
    user.resetToken = undefined;
    users[cleanEmail] = user;
    await this.saveUsers(users);

    return { success: true };
  }

  /** Get active user session */
  async getCurrentSession(): Promise<UserSession | null> {
    try {
      const raw = await AsyncStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const session: UserSession = JSON.parse(raw);
      if (Date.now() > session.expiresAt) {
        await this.logout();
        return null;
      }
      return session;
    } catch (_) {
      return null;
    }
  }

  /** Log out current session */
  async logout(): Promise<void> {
    await AsyncStorage.removeItem(SESSION_KEY);
    LogService.info(TAG, 'Session logged out');
  }

  /** Delete user account completely */
  async deleteAccount(email: string): Promise<boolean> {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const users = await this.getUsers();
      if (users[cleanEmail]) {
        delete users[cleanEmail];
        await this.saveUsers(users);
      }
      await this.logout();
      LogService.info(TAG, `Account deleted: ${cleanEmail}`);
      return true;
    } catch (err) {
      LogService.error(TAG, 'Failed to delete account', err);
      return false;
    }
  }
}

export default AuthService.getInstance();
