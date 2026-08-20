/**
 * BleConnector — manages BLE connections (Central role).
 *
 * Responsibilities:
 *   - Connect to a discovered device by MAC address
 *   - Discover GATT services to verify the connection is valid
 *   - Monitor for unexpected disconnections
 *   - Clean up DeviceRegistry connection state on all transitions
 *   - Provide a result callback for one-shot UI feedback
 *
 * Design: keeps an activeConnections Map so the same device cannot be
 * connected twice simultaneously. All state flows through DeviceRegistry.
 */
import { Device, BleError, Service } from 'react-native-ble-plx';
import { getBleManager } from './BleManagerSingleton';
import { MESH_SERVICE_UUID, CONNECTION_TIMEOUT_MS } from './constants';
import DeviceRegistry from './DeviceRegistry';
import LogService from '../LogService';

const TAG = 'BleConnector';

type ConnectionResultCallback = (deviceId: string, success: boolean, message: string) => void;

/** Duration after which a 'failed' status resets to 'disconnected' in the UI */
const FAILURE_RESET_DELAY_MS = 4_000;

class BleConnector {
  private readonly activeConnections = new Map<string, Device>();
  private resultCallback: ConnectionResultCallback | null = null;

  setResultCallback(callback: ConnectionResultCallback): void {
    this.resultCallback = callback;
  }

  /**
   * Establishes a BLE connection to the given device ID.
   * Updates DeviceRegistry at every transition:
   *   disconnected → connecting → connected  (success)
   *   disconnected → connecting → failed     (failure, resets to disconnected)
   */
  async connect(deviceId: string): Promise<void> {
    if (this.activeConnections.has(deviceId)) {
      LogService.debug(TAG, `Already connected to ${deviceId}`);
      return;
    }

    const knownDevice = DeviceRegistry.getDevice(deviceId);
    const displayName = knownDevice?.name ?? deviceId;

    LogService.info(TAG, `Connecting to ${displayName} (${deviceId})...`);
    DeviceRegistry.setConnectionStatus(deviceId, 'connecting');

    try {
      const device = await getBleManager().connectToDevice(deviceId, {
        timeout: CONNECTION_TIMEOUT_MS,
        requestMTU: 512,
      });

      LogService.info(TAG, `Link established with ${displayName} — discovering services...`);

      await device.discoverAllServicesAndCharacteristics();

      // Verify our service is present (non-blocking warning if absent)
      const services = await device.services();
      const hasService = services.some(
        (s: Service) => s.uuid.toLowerCase() === MESH_SERVICE_UUID.toLowerCase(),
      );

      if (!hasService) {
        LogService.warn(
          TAG,
          `MeshConnect service UUID not found on ${displayName} — connection still valid`,
        );
      } else {
        LogService.info(TAG, `MeshConnect service confirmed on ${displayName}`);
      }

      this.activeConnections.set(deviceId, device);
      DeviceRegistry.setConnectionStatus(deviceId, 'connected');

      LogService.info(TAG, `Successfully connected to ${displayName}`);
      this.resultCallback?.(deviceId, true, `Connected to ${displayName}`);

      // Watch for unexpected disconnection
      device.onDisconnected((err: BleError | null, disconnectedDevice: Device | null) => {
        const id = disconnectedDevice?.id ?? deviceId;
        this.activeConnections.delete(id);
        DeviceRegistry.setConnectionStatus(id, 'disconnected');

        if (err) {
          LogService.error(TAG, `Unexpected disconnect from ${displayName}: ${err.message}`);
        } else {
          LogService.info(TAG, `Clean disconnect from ${displayName}`);
        }
      });
    } catch (err) {
      this.activeConnections.delete(deviceId);
      DeviceRegistry.setConnectionStatus(deviceId, 'failed');

      const msg = err instanceof Error ? err.message : String(err);
      LogService.error(TAG, `Connection failed for ${displayName}: ${msg}`);
      this.resultCallback?.(deviceId, false, `Connection failed: ${msg}`);

      // Reset failed state after a short delay so the UI can recover
      setTimeout(() => {
        const current = DeviceRegistry.getDevice(deviceId);
        if (current?.connectionStatus === 'failed') {
          DeviceRegistry.setConnectionStatus(deviceId, 'disconnected');
        }
      }, FAILURE_RESET_DELAY_MS);

      throw err;
    }
  }

  /**
   * Cleanly disconnects from a device.
   * Cancels the connection and updates DeviceRegistry.
   */
  async disconnect(deviceId: string): Promise<void> {
    LogService.info(TAG, `Disconnecting from ${deviceId}...`);

    try {
      await getBleManager().cancelDeviceConnection(deviceId);
      this.activeConnections.delete(deviceId);
      DeviceRegistry.setConnectionStatus(deviceId, 'disconnected');
      LogService.info(TAG, `Disconnected from ${deviceId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      LogService.error(TAG, `Disconnect error for ${deviceId}: ${msg}`);
    }
  }

  isConnected(deviceId: string): boolean {
    return this.activeConnections.has(deviceId);
  }

  async disconnectAll(): Promise<void> {
    const ids = [...this.activeConnections.keys()];
    await Promise.allSettled(ids.map((id) => this.disconnect(id)));
  }
}

export default new BleConnector();
