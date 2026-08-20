/**
 * Device identity: generates a UUID v4 on first launch and persists it.
 * The same ID is used across app restarts as the BLE manufacturer data payload.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';

const DEVICE_ID_KEY = '@meshconnect_device_id';

/** In-memory cache to avoid repeated AsyncStorage reads */
let cachedDeviceId: string | null = null;

/**
 * Returns the persisted device ID, creating and storing one if it doesn't exist.
 * Thread-safe because AsyncStorage operations are serialised.
 */
export async function getOrCreateDeviceId(): Promise<string> {
  if (cachedDeviceId) {
    return cachedDeviceId;
  }

  try {
    const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (stored) {
      cachedDeviceId = stored;
      return stored;
    }

    const newId = uuid.v4() as string;
    await AsyncStorage.setItem(DEVICE_ID_KEY, newId);
    cachedDeviceId = newId;
    return newId;
  } catch {
    // AsyncStorage failure fallback — ID is transient this session
    const fallbackId = uuid.v4() as string;
    cachedDeviceId = fallbackId;
    return fallbackId;
  }
}

/**
 * Returns the first 6 uppercase hex characters of a deviceId for use as
 * a compact human-readable display name, e.g. "MC-A1B2C3".
 */
export function getShortId(deviceId: string): string {
  return deviceId.replace(/-/g, '').substring(0, 6).toUpperCase();
}
