/**
 * BleScanner — Ultra-Fast Production BLE Scanner with Advertisement Deduplication.
 *
 * Performance features:
 *   - Duplicate Advertisement Filter: Updates ONLY RSSI if advertisement payload hasn't changed within 5 seconds.
 *   - Tier-1 In-Memory Cache Guard: Checks memory profile before doing any AsyncStorage lookups.
 *   - Zero UI Blocking: Asynchronous metadata parsing and background GATT sync dispatching.
 */
import { BleError, Device } from 'react-native-ble-plx';
import { getBleManager } from './BleManagerSingleton';
import { MESH_SERVICE_UUID, SCAN_MODE_LOW_LATENCY } from './constants';
import DeviceRegistry from './DeviceRegistry';
import ProfileRegistry from '../profile/ProfileRegistry';
import ProfileSyncService from '../profile/ProfileSyncService';
import { getPeerProfile } from '../profile/ProfileStore';
import { parseAdvertisedMetadata, createMetadataProfile } from '../../utils/profileEncoder';
import LogService from '../LogService';
import { ScanningStatus } from '../../types/BleTypes';

const TAG = 'BleScanner';

/** Fast deduplication filter threshold (5 seconds) */
const DEDUPLICATION_INTERVAL_MS = 5_000;

interface AdvRecord {
  name: string;
  lastProcessed: number;
}

type ScanStatusCallback = (status: ScanningStatus) => void;

class BleScanner {
  private scanning = false;
  private statusCallback: ScanStatusCallback | null = null;
  private readonly seenAdv = new Map<string, AdvRecord>();

  setStatusCallback(callback: ScanStatusCallback): void {
    this.statusCallback = callback;
  }

  /** Starts low-latency BLE scan filtering for MeshConnect devices */
  start(): void {
    if (this.scanning) {
      LogService.debug(TAG, 'Scan already active — skipping start');
      return;
    }

    const manager = getBleManager();
    LogService.info(TAG, 'Starting low-latency BLE scan', { serviceUUID: MESH_SERVICE_UUID });
    this.statusCallback?.('scanning');

    manager.startDeviceScan(
      null,
      { allowDuplicates: true, scanMode: SCAN_MODE_LOW_LATENCY },
      this.handleResult.bind(this),
    );

    this.scanning = true;
  }

  /** Stops an active scan */
  stop(): void {
    if (!this.scanning) return;

    try {
      getBleManager().stopDeviceScan();
    } catch (_e) {}

    this.scanning = false;
    this.seenAdv.clear();
    this.statusCallback?.('idle');
    LogService.info(TAG, 'BLE scan stopped');
  }

  get isScanning(): boolean {
    return this.scanning;
  }

  private handleResult(error: BleError | null, device: Device | null): void {
    if (error) {
      this.scanning = false;
      this.statusCallback?.('failed');
      LogService.error(TAG, `Scan error: ${error.message}`);
      return;
    }

    if (!device) return;

    const name = device.localName?.trim() || device.name?.trim() || '';
    const serviceUUIDs = device.serviceUUIDs || [];

    const isMeshConnectService = serviceUUIDs.some(
      (uuid) => uuid.toLowerCase() === MESH_SERVICE_UUID.toLowerCase(),
    );

    const isMeshConnectName =
      name.startsWith('MC-') || name.startsWith('MC:') || name.startsWith('MeshConnect');

    // Ignore non-MeshConnect devices
    if (!isMeshConnectService && !isMeshConnectName) {
      return;
    }

    const rssi = device.rssi ?? -100;
    const now = Date.now();
    const prevAdv = this.seenAdv.get(device.id);

    // DEDUPLICATION: If we already saw this exact advertisement within 5s, update ONLY RSSI
    if (
      prevAdv &&
      prevAdv.name === name &&
      now - prevAdv.lastProcessed < DEDUPLICATION_INTERVAL_MS
    ) {
      DeviceRegistry.updateRssiOnly(device.id, rssi);
      return;
    }

    // Record advertisement processing timestamp
    this.seenAdv.set(device.id, { name, lastProcessed: now });

    // Parse lightweight metadata (< 50ms)
    const meta = parseAdvertisedMetadata(name, device.id);
    const displayName = meta?.displayName || name || `MC-${device.id.slice(-5)}`;

    // 1. Instantly register/update device in DeviceRegistry (shows user card immediately)
    const nearbyDevice = DeviceRegistry.updateDevice(device.id, displayName, rssi);

    // 2. TIER-1 IN-MEMORY CACHE CHECK: Check in-memory ProfileRegistry first
    const existingInMemory = ProfileRegistry.getProfile(device.id);

    if (meta) {
      if (existingInMemory && existingInMemory.hash === meta.hash) {
        // Hash matches in memory! Skip storage lookup and skip GATT connection completely.
        return;
      }

      // TIER-2 STORAGE LOOKUP: Check AsyncStorage only if memory missed
      getPeerProfile(device.id).then((stored) => {
        if (stored && stored.hash === meta.hash) {
          // Hydrate memory cache instantly
          ProfileRegistry.upsertProfile(device.id, stored);
          return;
        }

        // Uncached or updated profile: Render instant metadata card ("Loading profile...")
        if (!existingInMemory) {
          const tempProfile = createMetadataProfile(meta);
          ProfileRegistry.upsertProfile(device.id, tempProfile);
        }

        // Enqueue device for silent background GATT sync (subject to 45s cooldown)
        ProfileSyncService.enqueueDevice(nearbyDevice, meta.hash, meta.version);
      });
    } else {
      if (!existingInMemory) {
        ProfileSyncService.enqueueDevice(nearbyDevice);
      }
    }
  }
}

export default new BleScanner();
