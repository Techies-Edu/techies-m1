/**
 * profileEncoder — Lightweight BLE advertisement metadata encoder and parser.
 *
 * Broadcast format: MC:v<version>|<hash>|<displayName>
 * Example: MC:v1|a9f3c1|Jane Doe
 *
 * Keeps advertisement size strictly under 28 bytes.
 * Does NOT broadcast bio, skills, or links over advertisement packets.
 */
import { UserProfile, AvailabilityStatus } from '../types/ProfileTypes';

const PREFIX = 'MC:';

export interface AdvertisedMetadata {
  deviceId: string;
  version: number;
  hash: string;
  displayName: string;
}

/** Encodes a UserProfile into a lightweight metadata string (< 28 bytes) */
export function encodeCompactMetadata(profile: Partial<UserProfile>): string {
  const version = profile.version ?? 1;
  const hash = (profile.hash || '000000').slice(0, 6);
  const rawName = (profile.displayName || '').replace(/[|:]/g, ' ').trim() || 'User';

  // Format: MC:v1|a9f3c1|Name
  const payload = `v${version}|${hash}|${rawName}`;
  return `${PREFIX}${payload.substring(0, 24)}`;
}

/** Parses advertised metadata from device local name (< 50ms) */
export function parseAdvertisedMetadata(
  rawName: string,
  deviceId: string,
): AdvertisedMetadata | null {
  if (!rawName || !rawName.startsWith(PREFIX)) {
    return null;
  }

  const content = rawName.slice(PREFIX.length);
  const parts = content.split('|');

  if (parts.length < 3) {
    return null;
  }

  const versionStr = parts[0]?.replace('v', '').trim() || '1';
  const version = parseInt(versionStr, 10) || 1;
  const hash = parts[1]?.trim() || '';
  const displayName = parts[2]?.trim() || 'Nearby Professional';

  return {
    deviceId,
    version,
    hash,
    displayName,
  };
}

/** Creates a temporary metadata profile object for instant UI rendering */
export function createMetadataProfile(meta: AdvertisedMetadata): UserProfile {
  const now = Date.now();
  return {
    deviceId: meta.deviceId,
    username: `techie_${meta.deviceId.substring(0, 6)}`,
    techPassId: `TP-${meta.deviceId.substring(0, 4).toUpperCase()}`,
    version: meta.version,
    hash: meta.hash,
    displayName: meta.displayName,
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
    email: '',
    phone: '',
    availability: 'open' as AvailabilityStatus,
    avatarUrl: '',
    privacySettings: {},
    updatedAt: now,
  };
}
