/**
 * Profile domain types for Techies.
 */

export type AvailabilityStatus = 'open' | 'busy' | 'away';

export type ProfessionalCategory =
  | 'Student'
  | 'Developer'
  | 'Mentor'
  | 'Professional'
  | 'Recruiter'
  | 'Founder'
  | 'Startup'
  | 'Investor'
  | 'Community Leader';

export type AvailabilityIntent =
  | 'Open to Networking'
  | 'Open to Freelance'
  | 'Hiring'
  | 'Looking for Opportunities'
  | 'Looking for Internship'
  | 'Looking for Co-founder'
  | 'Seeking Investment'
  | 'Investing'
  | 'Mentoring'
  | 'Collaboration';

export type PrivacyState = 'VISIBLE' | 'HIDDEN';

export interface CustomLink {
  label: string;
  url: string;
}

export type ProfilePrivacyMap = Record<string, PrivacyState>;

/**
 * Full professional identity (TechPass) for a Techies user.
 */
export interface UserProfile {
  /** Unique Device/User UUID */
  deviceId: string;
  /** Unique user handle (e.g. @johndoe) */
  username: string;
  /** Unique generated TechPass ID (e.g. TP-8F92-4A7B) */
  techPassId: string;
  /** Version counter incremented on every profile update */
  version: number;
  /** djb2 hash of profile content */
  hash: string;
  /** Full display name */
  displayName: string;
  /** Professional headline / title */
  headline: string;
  /** Job designation / role */
  designation: string;
  /** Current employer, startup, or organisation */
  company: string;
  /** University or college */
  college: string;
  /** Short professional bio */
  bio: string;
  /** Primary professional category */
  category: ProfessionalCategory;
  /** List of networking intents */
  intents: AvailabilityIntent[];
  /** List of professional skills */
  skills: string[];
  /** Primary areas of expertise */
  interests: string[];
  /** Contact email */
  email: string;
  /** Phone number */
  phone: string;
  /** LinkedIn profile URL */
  linkedin: string;
  /** GitHub profile URL */
  github: string;
  /** X (Twitter) handle/URL */
  x: string;
  /** Instagram handle/URL */
  instagram: string;
  /** Portfolio website URL */
  portfolio: string;
  /** Resume URL */
  resume: string;
  /** Startup website URL */
  startup: string;
  /** Main product URL */
  product: string;
  /** Technical blog URL */
  blog: string;
  /** Custom links */
  customLinks: CustomLink[];
  /** Personal or company website */
  website: string;
  /** Current availability status */
  availability: AvailabilityStatus;
  /** Avatar photo URL */
  avatarUrl: string;
  /** Per-field visibility settings (VISIBLE | HIDDEN) */
  privacySettings: ProfilePrivacyMap;
  /** Timestamp of last update */
  updatedAt: number;
}

/**
 * A nearby user combining BLE signal data with their profile.
 */
export interface NearbyUser {
  deviceId: string;
  profile: UserProfile | null;
  lastSeen: number;
  rssi: number;
}
