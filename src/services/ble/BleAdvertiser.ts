/**
 * BleAdvertiser — Peripheral (advertiser) role.
 *
 * Bridges to the native Android `BleAdvertiserModule` (Kotlin) which wraps
 * BluetoothLeAdvertiser and opens a BluetoothGattServer with our service UUID.
 *
 * JS calls:
 *   BleAdvertiser.start(deviceId, deviceName) → Promise<void>
 *   BleAdvertiser.stop()                      → Promise<void>
 *
 * Native events emitted:
 *   BLE_ADVERTISE_STARTED       — advertising is live
 *   BLE_ADVERTISE_FAILED        — advertising could not start
 *   BLE_PERIPHERAL_CONNECTED    — a Central connected to us
 *   BLE_PERIPHERAL_DISCONNECTED — a Central disconnected from us
 */
import { NativeModules, NativeEventEmitter } from 'react-native';
import LogService from '../LogService';
import { AdvertisingStatus } from '../../types/BleTypes';

const TAG = 'BleAdvertiser';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const NativeAdvertiser = NativeModules.BleAdvertiser as any;

if (!NativeAdvertiser) {
  LogService.warn(
    TAG,
    'BleAdvertiser native module not found. Ensure native code is compiled and linked.',
  );
}

const emitter = NativeAdvertiser ? new NativeEventEmitter(NativeAdvertiser) : null;

type AdvertiseStatusCallback = (status: AdvertisingStatus) => void;

class BleAdvertiser {
  private advertising = false;
  private statusCallback: AdvertiseStatusCallback | null = null;

  constructor() {
    if (!emitter) return;

    emitter.addListener('BLE_ADVERTISE_STARTED', () => {
      this.advertising = true;
      this.statusCallback?.('advertising');
      LogService.info(TAG, 'Advertising started (confirmed by native)');
    });

    emitter.addListener('BLE_ADVERTISE_FAILED', (errorMsg: string) => {
      this.advertising = false;
      this.statusCallback?.('failed');
      LogService.error(TAG, `Advertising failed: ${errorMsg}`);
    });

    emitter.addListener(
      'BLE_PERIPHERAL_CONNECTED',
      (params: { deviceId: string; deviceName: string }) => {
        LogService.info(TAG, `Central connected to us: ${params.deviceName} (${params.deviceId})`);
      },
    );

    emitter.addListener('BLE_PERIPHERAL_DISCONNECTED', (params: { deviceId: string }) => {
      LogService.info(TAG, `Central disconnected from us: ${params.deviceId}`);
    });
  }

  setStatusCallback(callback: AdvertiseStatusCallback): void {
    this.statusCallback = callback;
  }

  /**
   * Starts BLE advertising.
   * - Includes MESH_SERVICE_UUID in the advertisement record (for scan filtering)
   * - Includes deviceId as manufacturer data
   * - Includes deviceName in the scan response (local name)
   */
  async start(deviceId: string, deviceName: string): Promise<void> {
    if (!NativeAdvertiser) {
      throw new Error('BleAdvertiser native module is not available');
    }
    if (this.advertising) {
      LogService.debug(TAG, 'Already advertising — skipping start');
      return;
    }

    LogService.info(TAG, 'Starting BLE advertising...', { deviceId, deviceName });
    this.statusCallback?.('starting');

    try {
      await NativeAdvertiser.startAdvertising(deviceId, deviceName);
      // Actual status update comes via BLE_ADVERTISE_STARTED event
    } catch (err) {
      this.advertising = false;
      this.statusCallback?.('failed');
      const msg = err instanceof Error ? err.message : String(err);
      LogService.error(TAG, `startAdvertising() rejected: ${msg}`);
      throw err;
    }
  }

  /** Stops BLE advertising and closes the GATT server. */
  async stop(): Promise<void> {
    if (!NativeAdvertiser || !this.advertising) return;

    try {
      await NativeAdvertiser.stopAdvertising();
      this.advertising = false;
      this.statusCallback?.('idle');
      LogService.info(TAG, 'Advertising stopped');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      LogService.error(TAG, `stopAdvertising() failed: ${msg}`);
    }
  }

  get isAdvertising(): boolean {
    return this.advertising;
  }
}

export default new BleAdvertiser();
