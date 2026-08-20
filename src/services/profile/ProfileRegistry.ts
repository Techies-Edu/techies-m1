/**
 * ProfileRegistry — in-memory store for discovered peer profiles.
 *
 * Responsibilities:
 *   - Maintain a Map of UserProfile keyed by deviceId
 *   - Notify subscribers only when a profile actually changes (hash guard)
 *   - Mirror the DeviceRegistry subscribe pattern for easy hook consumption
 */
import { UserProfile } from '../../types/ProfileTypes';
import { savePeerProfile } from './ProfileStore';
import LogService from '../LogService';

const TAG = 'ProfileRegistry';

type ProfileSubscriber = (profiles: Map<string, UserProfile>) => void;

class ProfileRegistry {
  private static instance: ProfileRegistry;
  private readonly profiles = new Map<string, UserProfile>();
  private readonly subscribers = new Set<ProfileSubscriber>();

  static getInstance(): ProfileRegistry {
    if (!ProfileRegistry.instance) {
      ProfileRegistry.instance = new ProfileRegistry();
    }
    return ProfileRegistry.instance;
  }

  // ── Mutations ──────────────────────────────────────────────────────────────

  /**
   * Inserts or updates a peer profile.
   * Only notifies subscribers if the hash or version changed.
   */
  upsertProfile(deviceId: string, profile: UserProfile): void {
    const existing = this.profiles.get(deviceId);

    // Hash-guard: skip if nothing changed
    if (existing && existing.hash === profile.hash && existing.version === profile.version) {
      LogService.debug(TAG, `Profile unchanged for ${deviceId}, skipping update`);
      return;
    }

    this.profiles.set(deviceId, profile);
    savePeerProfile(profile).catch(() => {});
    LogService.info(TAG, `Profile upserted for ${deviceId} (v${profile.version})`, {
      name: profile.displayName,
    });
    this.notifySubscribers();
  }

  /** Removes a peer profile (e.g. when device is evicted from DeviceRegistry). */
  removeProfile(deviceId: string): void {
    if (this.profiles.has(deviceId)) {
      this.profiles.delete(deviceId);
      LogService.debug(TAG, `Profile removed for ${deviceId}`);
      this.notifySubscribers();
    }
  }

  /** Returns a single profile by deviceId, or undefined. */
  getProfile(deviceId: string): UserProfile | undefined {
    return this.profiles.get(deviceId);
  }

  /** Returns a snapshot of all profiles. */
  getAllProfiles(): Map<string, UserProfile> {
    return new Map(this.profiles);
  }

  /** Clears all profiles and notifies subscribers. */
  clear(): void {
    this.profiles.clear();
    this.notifySubscribers();
  }

  // ── Subscriptions ──────────────────────────────────────────────────────────

  /**
   * Subscribes to profile changes.
   * Immediately invokes subscriber with current snapshot.
   * Returns an unsubscribe function.
   */
  subscribe(subscriber: ProfileSubscriber): () => void {
    this.subscribers.add(subscriber);
    subscriber(this.getAllProfiles());
    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private notifySubscribers(): void {
    const snapshot = this.getAllProfiles();
    this.subscribers.forEach((s) => s(snapshot));
  }
}

export default ProfileRegistry.getInstance();
