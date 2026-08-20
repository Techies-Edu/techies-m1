/**
 * useMyProfile — Hook for reading and editing the user's own professional profile.
 *
 * Responsibilities:
 *   - Load the profile from AsyncStorage on mount
 *   - Provide an updateProfile() function that saves and broadcasts automatically
 *   - Expose loading state for the form
 */
import { useEffect, useState, useCallback } from 'react';
import { UserProfile } from '../types/ProfileTypes';
import {
  getMyProfile,
  saveMyProfile,
  ensureDefaultProfile,
  computeProfileHash,
} from '../services/profile/ProfileStore';
import { broadcastOwnProfile } from '../services/profile/ProfileSyncService';
import BleAdvertiser from '../services/ble/BleAdvertiser';
import { getOrCreateDeviceId } from '../utils';
import { encodeCompactMetadata } from '../utils/profileEncoder';
import LogService from '../services/LogService';

const TAG = 'useMyProfile';

export interface UseMyProfileReturn {
  profile: UserProfile | null;
  isLoading: boolean;
  updateProfile: (
    patch: Partial<Omit<UserProfile, 'deviceId' | 'version' | 'hash' | 'updatedAt'>>,
  ) => Promise<void>;
}

export function useMyProfile(): UseMyProfileReturn {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load on mount
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const deviceId = await getOrCreateDeviceId();
        const loaded = await ensureDefaultProfile(deviceId);
        if (!cancelled) {
          setProfile(loaded);
        }
      } catch (err) {
        LogService.error(TAG, 'Failed to load own profile', err);
        // Try to load whatever is in storage
        const fallback = await getMyProfile();
        if (!cancelled && fallback) setProfile(fallback);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Merges a partial patch into the profile, increments the version,
   * recomputes the hash, persists to AsyncStorage, and broadcasts via GATT.
   */
  const updateProfile = useCallback(
    async (
      patch: Partial<Omit<UserProfile, 'deviceId' | 'version' | 'hash' | 'updatedAt'>>,
    ): Promise<void> => {
      if (!profile) return;

      const updated: UserProfile = {
        ...profile,
        ...patch,
        version: profile.version + 1,
        hash: '',
        updatedAt: Date.now(),
      };

      // Compute hash after merging all fields
      updated.hash = computeProfileHash(updated);

      try {
        await saveMyProfile(updated);
        setProfile(updated);
        // Broadcast to nearby peers over GATT + update live BLE advertisement payload
        broadcastOwnProfile(updated).catch((err) => {
          LogService.warn(TAG, 'broadcastOwnProfile failed silently', err);
        });
        BleAdvertiser.start(updated.deviceId, encodeCompactMetadata(updated)).catch(() => {});
        LogService.info(TAG, `Profile updated to v${updated.version}`);
      } catch (err) {
        LogService.error(TAG, 'Failed to save profile update', err);
        throw err;
      }
    },
    [profile],
  );

  return { profile, isLoading, updateProfile };
}
