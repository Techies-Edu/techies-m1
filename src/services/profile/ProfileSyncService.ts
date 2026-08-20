/**
 * ProfileSyncService — Hybrid BLE + Wi-Fi Direct GATT Sync Engine.
 *
 * Architecture:
 *   1. BLE Scanner automatically discovers nearby devices (< 50ms)
 *   2. For newly discovered device, ProfileSyncService enqueues sync request (RSSI prioritized)
 *   3. Transport Step 1: Attempts high-speed profile transfer over Wi-Fi Direct (P2P socket port 8888)
 *   4. Transport Step 2 (Fallback): If Wi-Fi Direct is unavailable or fails, automatically falls back to BLE GATT sync
 *   5. Hash-guarded: skips connection if profile hash hasn't changed
 *   6. 45-second cooldown per device to avoid connection spam
 */
import { NativeModules } from 'react-native';
import { Buffer } from 'buffer';
import { getBleManager } from '../ble/BleManagerSingleton';
import DeviceRegistry from '../ble/DeviceRegistry';
import { MESH_SERVICE_UUID } from '../ble/constants';
import ProfileRegistry from './ProfileRegistry';
import WifiDirectService from '../wifidirect/WifiDirectService';
import LogService from '../LogService';
import { UserProfile } from '../../types/ProfileTypes';
import { NearbyDevice } from '../../types/BleTypes';

const TAG = 'ProfileSyncService';
export const PROFILE_CHAR_UUID = '10000002-0000-1000-8000-00805f9b34fb';

const MAX_CONCURRENT_SYNCS = 2;
const SYNC_TIMEOUT_MS = 4_000;
const SYNC_COOLDOWN_MS = 45_000; // 45 seconds cooldown
const MAX_RETRIES = 2;

interface QueueItem {
  deviceId: string;
  rssi: number;
  hash?: string;
  version?: number;
  retries: number;
}

class ProfileSyncService {
  private static instance: ProfileSyncService;
  private unsubscribeRegistry: (() => void) | null = null;
  private running = false;

  private queue: QueueItem[] = [];
  private activeCount = 0;
  private inFlightDevices = new Set<string>();
  private readonly lastSyncAttempt = new Map<string, number>();

  static getInstance(): ProfileSyncService {
    if (!ProfileSyncService.instance) {
      ProfileSyncService.instance = new ProfileSyncService();
    }
    return ProfileSyncService.instance;
  }

  /** Starts watching DeviceRegistry and initializes Wi-Fi Direct + BLE Sync */
  start(): void {
    if (this.running) return;
    this.running = true;

    // Start native Wi-Fi Direct server
    WifiDirectService.startServer().catch(() => {});

    this.unsubscribeRegistry = DeviceRegistry.subscribe((devices: NearbyDevice[]) => {
      devices.forEach((device) => this.enqueueDevice(device));
    });

    LogService.info(TAG, 'Hybrid BLE + Wi-Fi Direct ProfileSyncService started');
  }

  /** Stops the service and clears all state */
  stop(): void {
    this.unsubscribeRegistry?.();
    this.unsubscribeRegistry = null;
    this.running = false;
    this.queue = [];
    this.inFlightDevices.clear();
    this.lastSyncAttempt.clear();
    this.activeCount = 0;

    WifiDirectService.stopServer().catch(() => {});
    LogService.info(TAG, 'ProfileSyncService stopped');
  }

  /** Enqueues a device for hybrid Wi-Fi Direct / BLE sync */
  enqueueDevice(device: NearbyDevice, hash?: string, version?: number): void {
    const deviceId = device.id;
    const now = Date.now();
    const existing = ProfileRegistry.getProfile(deviceId);

    // 1. Hash match check: skip if stored profile hash matches advertised hash
    if (existing && hash && existing.hash === hash) {
      LogService.debug(TAG, `Hash match for ${deviceId} (${hash}). Skipping connection.`);
      return;
    }

    // 2. Cooldown Guard: prevent repeated connection attempts
    const lastAttempt = this.lastSyncAttempt.get(deviceId) || 0;
    const hashChanged = existing && hash && existing.hash !== hash;

    if (!hashChanged && now - lastAttempt < SYNC_COOLDOWN_MS) {
      const remainingSec = Math.round((SYNC_COOLDOWN_MS - (now - lastAttempt)) / 1000);
      LogService.debug(TAG, `Sync for ${deviceId} on cooldown (${remainingSec}s remaining).`);
      return;
    }

    // Skip if already in flight
    if (this.inFlightDevices.has(deviceId)) return;

    // Record sync attempt timestamp
    this.lastSyncAttempt.set(deviceId, now);

    // Remove old queued entry if present
    this.queue = this.queue.filter((q) => q.deviceId !== deviceId);

    // Add to queue
    this.queue.push({
      deviceId,
      rssi: device.rssi,
      hash,
      version,
      retries: 0,
    });

    // Sort queue by strongest RSSI first
    this.queue.sort((a, b) => b.rssi - a.rssi);

    // Process next item in queue
    this.processNext();
  }

  private processNext(): void {
    if (this.activeCount >= MAX_CONCURRENT_SYNCS || this.queue.length === 0) {
      return;
    }

    const item = this.queue.shift();
    if (!item) return;

    this.activeCount++;
    this.inFlightDevices.add(item.deviceId);

    this.syncProfileWithRetry(item)
      .catch((err) => {
        LogService.warn(TAG, `Hybrid sync failed for ${item.deviceId}: ${err}`);
      })
      .finally(() => {
        this.activeCount--;
        this.inFlightDevices.delete(item.deviceId);
        this.processNext();
      });
  }

  private async syncProfileWithRetry(item: QueueItem): Promise<void> {
    try {
      // Step 1: Attempt high-speed Wi-Fi Direct transfer
      try {
        const p2pProfile = await WifiDirectService.fetchProfile();
        ProfileRegistry.upsertProfile(item.deviceId, p2pProfile);
        LogService.info(TAG, `Profile synced via Wi-Fi Direct for ${item.deviceId}`);
        return;
      } catch (wifiErr) {
        LogService.info(
          TAG,
          `Wi-Fi Direct unavailable for ${item.deviceId}, falling back to BLE GATT sync: ${wifiErr}`,
        );
      }

      // Step 2: Automatic fallback to BLE GATT profile sync
      await this.performGattRead(item.deviceId);
    } catch (err) {
      if (item.retries < MAX_RETRIES) {
        item.retries++;
        LogService.warn(
          TAG,
          `Retrying sync for ${item.deviceId} (Attempt ${item.retries}/${MAX_RETRIES})`,
        );
        this.queue.push(item);
        this.queue.sort((a, b) => b.rssi - a.rssi);
      } else {
        LogService.error(TAG, `Max retries reached for ${item.deviceId}, dropping sync.`);
      }
    }
  }

  private async performGattRead(deviceId: string): Promise<void> {
    const manager = getBleManager();
    LogService.info(TAG, `Initiating silent GATT read for ${deviceId}`);

    // Connect with timeout guard
    const device = await manager.connectToDevice(deviceId, {
      timeout: SYNC_TIMEOUT_MS,
      requestMTU: 512,
    });

    try {
      await device.discoverAllServicesAndCharacteristics();

      const characteristic = await device.readCharacteristicForService(
        MESH_SERVICE_UUID,
        PROFILE_CHAR_UUID,
      );

      const base64Value = characteristic?.value;
      if (!base64Value) {
        throw new Error('Empty characteristic value');
      }

      const jsonStr = Buffer.from(base64Value, 'base64').toString('utf8');
      const profile = JSON.parse(jsonStr) as UserProfile;

      if (!profile || !profile.deviceId) {
        throw new Error('Invalid profile payload');
      }

      // Upsert into ProfileRegistry (notifies subscribers & saves to AsyncStorage)
      ProfileRegistry.upsertProfile(deviceId, profile);
      LogService.info(TAG, `Profile synced via BLE GATT for ${deviceId}: ${profile.displayName}`);
    } finally {
      // Disconnect transient connection
      try {
        await manager.cancelDeviceConnection(deviceId);
      } catch (_) {}
    }
  }

  /** Forces re-sync for a device (bypasses cooldown) */
  invalidateAndResync(deviceId: string): void {
    ProfileRegistry.removeProfile(deviceId);
    this.inFlightDevices.delete(deviceId);
    this.lastSyncAttempt.delete(deviceId);
    const device = DeviceRegistry.getDevice(deviceId);
    if (device) {
      this.enqueueDevice(device);
    }
  }
}

import PrivacyService from './PrivacyService';

/** Broadcasts own profile over native GATT server + Wi-Fi Direct socket with Privacy filters applied */
export async function broadcastOwnProfile(profile: UserProfile): Promise<void> {
  try {
    // Apply privacy settings so hidden fields are NEVER transmitted over BLE or P2P
    const sanitized = PrivacyService.sanitizeProfile(profile, false);

    // 1. Update Wi-Fi Direct P2P payload
    WifiDirectService.setProfileData(sanitized).catch(() => {});

    // 2. Update BLE GATT profile characteristic
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const NativeAdvertiser = NativeModules.BleAdvertiser as any;
    if (NativeAdvertiser?.setProfileData) {
      await NativeAdvertiser.setProfileData(JSON.stringify(sanitized));
      LogService.debug(TAG, 'Sanitized own profile broadcast updated on native GATT server');
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    LogService.error(TAG, `broadcastOwnProfile failed: ${msg}`);
  }
}

export default ProfileSyncService.getInstance();
