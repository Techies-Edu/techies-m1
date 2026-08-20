/**
 * useNearbyUsers — Hook combining DeviceRegistry + ProfileRegistry into NearbyUser[].
 *
 * Returns a sorted list (strongest RSSI first) of nearby MeshConnect users.
 * Each entry has a `profile` field that is null until BLE sync completes.
 * Updates automatically as devices come/go and profiles sync in the background.
 */
import { useEffect, useState } from 'react';
import DeviceRegistry from '../services/ble/DeviceRegistry';
import ProfileRegistry from '../services/profile/ProfileRegistry';
import { NearbyUser, UserProfile } from '../types/ProfileTypes';
import { NearbyDevice } from '../types/BleTypes';

function buildNearbyUsers(
  devices: NearbyDevice[],
  profiles: Map<string, UserProfile>,
): NearbyUser[] {
  return devices.map((device) => ({
    deviceId: device.id,
    profile: profiles.get(device.id) ?? null,
    lastSeen: device.lastSeen,
    rssi: device.rssi,
  }));
}

export function useNearbyUsers(): NearbyUser[] {
  const [devices, setDevices] = useState<NearbyDevice[]>(() => DeviceRegistry.getAllDevices());
  const [profiles, setProfiles] = useState<Map<string, UserProfile>>(() =>
    ProfileRegistry.getAllProfiles(),
  );

  useEffect(() => {
    const unsubDevices = DeviceRegistry.subscribe((updatedDevices) => {
      setDevices(updatedDevices);
    });

    const unsubProfiles = ProfileRegistry.subscribe((updatedProfiles) => {
      setProfiles(new Map(updatedProfiles));
    });

    return () => {
      unsubDevices();
      unsubProfiles();
    };
  }, []);

  return buildNearbyUsers(devices, profiles);
}
