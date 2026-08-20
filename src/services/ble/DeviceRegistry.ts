/**
 * DeviceRegistry — in-memory store for discovered BLE devices.
 *
 * Responsibilities:
 *   - Maintain a de-duplicated Map of NearbyDevice keyed by MAC address
 *   - Automatically evict devices that have not been seen for DEVICE_TIMEOUT_MS
 *   - Notify all subscribers on every state change
 *   - Expose a subscribe/unsubscribe pattern compatible with React hooks
 */
import { NearbyDevice, ConnectionStatus } from '../../types/BleTypes';
import { calculateDistance } from '../../utils/distance';
import LogService from '../LogService';
import ProfileRegistry from '../profile/ProfileRegistry';
import { DEVICE_TIMEOUT_MS, CLEANUP_INTERVAL_MS } from './constants';

const TAG = 'DeviceRegistry';

type DeviceSubscriber = (devices: NearbyDevice[]) => void;

class DeviceRegistry {
  private static instance: DeviceRegistry;
  private readonly devices = new Map<string, NearbyDevice>();
  private readonly subscribers = new Set<DeviceSubscriber>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  static getInstance(): DeviceRegistry {
    if (!DeviceRegistry.instance) {
      DeviceRegistry.instance = new DeviceRegistry();
    }
    return DeviceRegistry.instance;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  startCleanup(): void {
    if (this.cleanupTimer) return;
    this.cleanupTimer = setInterval(() => this.evictStaleDevices(), CLEANUP_INTERVAL_MS);
    LogService.debug(TAG, 'Device cleanup timer started');
  }

  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
      LogService.debug(TAG, 'Device cleanup timer stopped');
    }
  }

  // ── Mutations ──────────────────────────────────────────────────────────────

  /**
   * Upserts a device from a scan result.
   * Preserves connection status if the device already exists.
   */
  updateDevice(id: string, name: string, rssi: number): NearbyDevice {
    const existing = this.devices.get(id);
    const isNew = !existing;

    const updated: NearbyDevice = {
      id,
      name: name.trim() || existing?.name || `Device-${id.slice(-5)}`,
      rssi,
      distance: calculateDistance(rssi),
      lastSeen: Date.now(),
      connectionStatus: existing?.connectionStatus ?? 'disconnected',
    };

    this.devices.set(id, updated);

    if (isNew) {
      LogService.info(TAG, `New device: ${updated.name}`, { id, rssi });
    } else {
      LogService.debug(TAG, `RSSI update: ${updated.name}`, { rssi, distance: updated.distance });
    }

    this.notifySubscribers();
    return updated;
  }

  /** Lightweight update for duplicate advertisements — updates RSSI and lastSeen */
  updateRssiOnly(id: string, rssi: number): NearbyDevice | null {
    const existing = this.devices.get(id);
    if (!existing) return null;

    // Throttle subscriber notifications if RSSI hasn't changed significantly (> 3 dBm)
    const rssiChanged = Math.abs(existing.rssi - rssi) > 3;
    existing.rssi = rssi;
    existing.distance = calculateDistance(rssi);
    existing.lastSeen = Date.now();

    if (rssiChanged) {
      this.notifySubscribers();
    }
    return existing;
  }

  /**
   * Updates the connection status of a known device.
   * Silently ignored if the device is not in the registry.
   */
  setConnectionStatus(deviceId: string, status: ConnectionStatus): void {
    const device = this.devices.get(deviceId);
    if (!device) return;

    this.devices.set(deviceId, { ...device, connectionStatus: status });
    LogService.info(TAG, `Status → ${status}: ${device.name} (${deviceId})`);
    this.notifySubscribers();
  }

  /** Returns a single device by ID, or undefined. */
  getDevice(deviceId: string): NearbyDevice | undefined {
    return this.devices.get(deviceId);
  }

  /** Returns all devices sorted by RSSI descending (strongest signal first). */
  getAllDevices(): NearbyDevice[] {
    return this.sorted();
  }

  /** Removes all devices and notifies subscribers. */
  clear(): void {
    this.devices.clear();
    LogService.debug(TAG, 'Device list cleared');
    this.notifySubscribers();
  }

  // ── Subscriptions ──────────────────────────────────────────────────────────

  /**
   * Subscribes to device list changes.
   * Immediately calls the subscriber with the current list.
   * Returns an unsubscribe function.
   */
  subscribe(subscriber: DeviceSubscriber): () => void {
    this.subscribers.add(subscriber);
    subscriber(this.sorted()); // immediate snapshot
    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private evictStaleDevices(): void {
    const now = Date.now();
    let changed = false;

    this.devices.forEach((device, id) => {
      const stale = now - device.lastSeen > DEVICE_TIMEOUT_MS;
      const safeToRemove = device.connectionStatus === 'disconnected';

      if (stale && safeToRemove) {
        this.devices.delete(id);
        ProfileRegistry.removeProfile(id);
        LogService.info(TAG, `Evicted stale device: ${device.name} (${id})`);
        changed = true;
      }
    });

    if (changed) {
      this.notifySubscribers();
    }
  }

  private sorted(): NearbyDevice[] {
    return [...this.devices.values()].sort((a, b) => b.rssi - a.rssi);
  }

  private notifySubscribers(): void {
    const snapshot = this.sorted();
    this.subscribers.forEach((s) => s(snapshot));
  }
}

export default DeviceRegistry.getInstance();
