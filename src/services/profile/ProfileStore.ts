/* eslint-disable no-bitwise */
/**
 * ProfileStore — Persists user TechPass profile and peer profiles locally to AsyncStorage.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, AvailabilityStatus } from '../../types/ProfileTypes';
import { DEFAULT_PRIVACY_SETTINGS } from './PrivacyService';
import LogService from '../LogService';

const TAG = 'ProfileStore';
const PROFILE_KEY = '@meshconnect_my_profile';

export function djb2Hash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

export function computeProfileHash(profile: Omit<UserProfile, 'hash'>): string {
  const { ...rest } = profile as UserProfile;
  const tmp = { ...rest, hash: '' };
  return djb2Hash(JSON.stringify(tmp));
}

export async function getMyProfile(): Promise<UserProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserProfile;
  } catch (err) {
    LogService.error(TAG, 'Failed to load profile from storage', err);
    return null;
  }
}

export async function saveMyProfile(profile: UserProfile): Promise<void> {
  try {
    const hash = computeProfileHash(profile);
    const toSave: UserProfile = { ...profile, hash };
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(toSave));
    LogService.debug(TAG, `Profile saved (v${toSave.version})`);
  } catch (err) {
    LogService.error(TAG, 'Failed to save profile to storage', err);
  }
}

/** Generates a human-readable TechPass ID (e.g. TP-8F92-4A7B) */
export function generateTechPassId(): string {
  const hex = () =>
    Math.floor(1000 + Math.random() * 9000)
      .toString(16)
      .toUpperCase();
  return `TP-${hex()}-${hex()}`;
}

export async function ensureDefaultProfile(deviceId: string, email = ''): Promise<UserProfile> {
  const existing = await getMyProfile();
  if (existing && existing.deviceId === deviceId) {
    // Fill in missing default fields if upgrading
    const upgraded: UserProfile = {
      ...existing,
      username: existing.username || `user_${deviceId.substring(0, 6)}`,
      techPassId: existing.techPassId || generateTechPassId(),
      designation: existing.designation || '',
      category: existing.category || 'Developer',
      intents: existing.intents || ['Open to Networking'],
      x: existing.x || '',
      instagram: existing.instagram || '',
      resume: existing.resume || '',
      startup: existing.startup || '',
      product: existing.product || '',
      blog: existing.blog || '',
      customLinks: existing.customLinks || [],
      privacySettings: { ...DEFAULT_PRIVACY_SETTINGS, ...(existing.privacySettings || {}) },
    };
    return upgraded;
  }

  const now = Date.now();
  const defaultProfile: UserProfile = {
    deviceId,
    username: `techie_${deviceId.substring(0, 6)}`,
    techPassId: generateTechPassId(),
    version: 1,
    hash: '',
    displayName: '',
    headline: '',
    designation: '',
    company: '',
    college: '',
    bio: '',
    category: 'Developer',
    intents: ['Open to Networking'],
    skills: [],
    interests: [],
    github: '',
    linkedin: '',
    x: '',
    instagram: '',
    portfolio: '',
    resume: '',
    startup: '',
    product: '',
    blog: '',
    customLinks: [],
    website: '',
    email: email || '',
    phone: '',
    availability: 'open' as AvailabilityStatus,
    avatarUrl: '',
    privacySettings: { ...DEFAULT_PRIVACY_SETTINGS },
    updatedAt: now,
  };

  await saveMyProfile(defaultProfile);
  LogService.info(TAG, `Default TechPass created for ${deviceId}`);
  return defaultProfile;
}

const PEER_PREFIX = '@meshconnect_peer_';

export async function savePeerProfile(profile: UserProfile): Promise<void> {
  try {
    const key = `${PEER_PREFIX}${profile.deviceId}`;
    await AsyncStorage.setItem(key, JSON.stringify(profile));
  } catch (_) {}
}

export async function getPeerProfile(deviceId: string): Promise<UserProfile | null> {
  try {
    const key = `${PEER_PREFIX}${deviceId}`;
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as UserProfile;
  } catch (_) {
    return null;
  }
}
