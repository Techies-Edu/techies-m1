/**
 * PrivacyService — Strict Privacy Engine enforcing per-field VISIBLE / HIDDEN rules.
 *
 * Rule: The owner can always see their own fields. Other users ONLY receive fields marked as VISIBLE.
 * Ensures hidden information is stripped from BLE, QR, NFC, Connections, Events, and Profile views.
 */
import { UserProfile, ProfilePrivacyMap } from '../../types/ProfileTypes';
import LogService from '../LogService';

const TAG = 'PrivacyService';

export const DEFAULT_PRIVACY_SETTINGS: ProfilePrivacyMap = {
  displayName: 'VISIBLE',
  headline: 'VISIBLE',
  designation: 'VISIBLE',
  company: 'VISIBLE',
  college: 'VISIBLE',
  bio: 'VISIBLE',
  category: 'VISIBLE',
  intents: 'VISIBLE',
  skills: 'VISIBLE',
  interests: 'VISIBLE',
  email: 'VISIBLE',
  phone: 'HIDDEN',
  linkedin: 'VISIBLE',
  github: 'VISIBLE',
  x: 'VISIBLE',
  instagram: 'VISIBLE',
  portfolio: 'VISIBLE',
  resume: 'HIDDEN',
  startup: 'VISIBLE',
  product: 'VISIBLE',
  blog: 'VISIBLE',
  customLinks: 'VISIBLE',
  avatarUrl: 'VISIBLE',
};

class PrivacyService {
  private static instance: PrivacyService;

  static getInstance(): PrivacyService {
    if (!PrivacyService.instance) {
      PrivacyService.instance = new PrivacyService();
    }
    return PrivacyService.instance;
  }

  /**
   * Sanitizes a profile object based on privacy settings.
   * If isOwner is true, returns full un-redacted profile.
   * If isOwner is false, strips any field marked as 'HIDDEN'.
   */
  sanitizeProfile(profile: UserProfile, isOwner = false): UserProfile {
    if (isOwner) {
      return { ...profile };
    }

    const settings = { ...DEFAULT_PRIVACY_SETTINGS, ...(profile.privacySettings || {}) };

    const sanitized: UserProfile = {
      ...profile,
      headline: settings.headline === 'HIDDEN' ? '' : profile.headline,
      designation: settings.designation === 'HIDDEN' ? '' : profile.designation,
      company: settings.company === 'HIDDEN' ? '' : profile.company,
      college: settings.college === 'HIDDEN' ? '' : profile.college,
      bio: settings.bio === 'HIDDEN' ? '' : profile.bio,
      intents: settings.intents === 'HIDDEN' ? [] : profile.intents || [],
      skills: settings.skills === 'HIDDEN' ? [] : profile.skills || [],
      interests: settings.interests === 'HIDDEN' ? [] : profile.interests || [],
      email: settings.email === 'HIDDEN' ? '' : profile.email,
      phone: settings.phone === 'HIDDEN' ? '' : profile.phone,
      linkedin: settings.linkedin === 'HIDDEN' ? '' : profile.linkedin,
      github: settings.github === 'HIDDEN' ? '' : profile.github,
      x: settings.x === 'HIDDEN' ? '' : profile.x,
      instagram: settings.instagram === 'HIDDEN' ? '' : profile.instagram,
      portfolio: settings.portfolio === 'HIDDEN' ? '' : profile.portfolio,
      resume: settings.resume === 'HIDDEN' ? '' : profile.resume,
      startup: settings.startup === 'HIDDEN' ? '' : profile.startup,
      product: settings.product === 'HIDDEN' ? '' : profile.product,
      blog: settings.blog === 'HIDDEN' ? '' : profile.blog,
      customLinks: settings.customLinks === 'HIDDEN' ? [] : profile.customLinks || [],
      avatarUrl: settings.avatarUrl === 'HIDDEN' ? '' : profile.avatarUrl,
    };

    LogService.debug(TAG, `Sanitized profile for ${profile.deviceId} (isOwner=${isOwner})`);
    return sanitized;
  }
}

export default PrivacyService.getInstance();
