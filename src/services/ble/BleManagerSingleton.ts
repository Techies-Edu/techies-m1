/**
 * Singleton wrapper around react-native-ble-plx BleManager.
 *
 * Only one BleManager instance should exist per app lifetime.
 * Creating multiple instances causes native resource conflicts.
 */
import { BleManager } from 'react-native-ble-plx';

let managerInstance: BleManager | null = null;

/** Returns the shared BleManager, creating it on first call. */
export function getBleManager(): BleManager {
  if (!managerInstance) {
    managerInstance = new BleManager();
  }
  return managerInstance;
}

/**
 * Destroys the BleManager and frees native resources.
 * Call only on app unmount or full BLE reset.
 */
export function destroyBleManager(): void {
  if (managerInstance) {
    managerInstance.destroy();
    managerInstance = null;
  }
}
