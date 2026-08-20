/**
 * useBleSetup — Hook managing Bluetooth permissions, adapter state, and automatic scanning & advertising startup.
 */
import { useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { request, PERMISSIONS, RESULTS, Permission } from 'react-native-permissions';
import { State } from 'react-native-ble-plx';
import { getBleManager, BleAdvertiser, BleScanner, DeviceRegistry, LogService } from '../services';
import { BluetoothStatus, AdvertisingStatus, ScanningStatus, PermissionState } from '../types';
import { getOrCreateDeviceId, getShortId } from '../utils';
import { encodeCompactMetadata } from '../utils/profileEncoder';
import { getMyProfile } from '../services/profile/ProfileStore';

const TAG = 'useBleSetup';

export interface UseBleSetupReturn {
  bluetoothStatus: BluetoothStatus;
  advertisingStatus: AdvertisingStatus;
  scanningStatus: ScanningStatus;
  permissions: PermissionState;
  requestPermissionsAndStart: () => Promise<void>;
  enableBluetoothPrompt: () => Promise<void>;
  errorMessage: string | null;
  clearError: () => void;
}

export function useBleSetup(): UseBleSetupReturn {
  const [bluetoothStatus, setBluetoothStatus] = useState<BluetoothStatus>('unknown');
  const [advertisingStatus, setAdvertisingStatus] = useState<AdvertisingStatus>('idle');
  const [scanningStatus, setScanningStatus] = useState<ScanningStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [permissions, setPermissions] = useState<PermissionState>({
    granted: false,
    denied: false,
    blocked: false,
    checking: true,
  });

  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  // Wire up status callbacks
  useEffect(() => {
    BleAdvertiser.setStatusCallback((status: AdvertisingStatus) => setAdvertisingStatus(status));
    BleScanner.setStatusCallback((status: ScanningStatus) => setScanningStatus(status));
  }, []);

  // Request all necessary BLE & Location permissions
  const checkAndRequestPermissions = useCallback(async (): Promise<boolean> => {
    LogService.info(TAG, 'Checking permissions...');
    setPermissions((prev: PermissionState) => ({ ...prev, checking: true }));

    if (Platform.OS !== 'android') {
      setPermissions({ granted: true, denied: false, blocked: false, checking: false });
      return true;
    }

    try {
      const apiLevel = Platform.Version as number;
      const requiredPermissions: Permission[] = [];

      if (apiLevel >= 31) {
        // Android 12+ requires Nearby Devices permissions
        requiredPermissions.push(
          PERMISSIONS.ANDROID.BLUETOOTH_SCAN,
          PERMISSIONS.ANDROID.BLUETOOTH_ADVERTISE,
          PERMISSIONS.ANDROID.BLUETOOTH_CONNECT,
          PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
        );
      } else {
        // Android 11 and below require Location for BLE scanning
        requiredPermissions.push(
          PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
          PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION,
        );
      }

      let allGranted = true;
      let anyBlocked = false;
      let anyDenied = false;

      for (const perm of requiredPermissions) {
        const result = await request(perm);
        LogService.info(TAG, `Permission result for ${perm}: ${result}`);

        if (result === RESULTS.GRANTED) {
          continue;
        } else if (result === RESULTS.BLOCKED) {
          anyBlocked = true;
          allGranted = false;
        } else {
          anyDenied = true;
          allGranted = false;
        }
      }

      setPermissions({
        granted: allGranted,
        denied: anyDenied,
        blocked: anyBlocked,
        checking: false,
      });

      if (!allGranted) {
        const msg = anyBlocked
          ? 'Permissions are blocked in settings. Please enable Bluetooth & Location permissions manually.'
          : 'Bluetooth permissions were denied. MeshConnect requires these permissions to discover nearby devices.';
        setErrorMessage(msg);
        LogService.warn(TAG, msg);
      }

      return allGranted;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      LogService.error(TAG, `Permission check failed: ${msg}`);
      setPermissions({ granted: false, denied: true, blocked: false, checking: false });
      setErrorMessage(`Permission check failed: ${msg}`);
      return false;
    }
  }, []);

  // Attempt to prompt user to enable Bluetooth
  const enableBluetoothPrompt = useCallback(async (): Promise<void> => {
    try {
      const manager = getBleManager();
      LogService.info(TAG, 'Prompting user to enable Bluetooth...');
      await manager.enable();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      LogService.error(TAG, `Enable Bluetooth failed or rejected: ${msg}`);
      setErrorMessage('Please enable Bluetooth from settings to use MeshConnect.');
    }
  }, []);

  // Start BLE Advertisements and Scans automatically
  const startServices = useCallback(async (): Promise<void> => {
    try {
      LogService.info(TAG, 'Initializing MeshConnect BLE services...');
      DeviceRegistry.startCleanup();

      const deviceId = await getOrCreateDeviceId();
      const storedProfile = await getMyProfile();
      const broadcastName = storedProfile
        ? encodeCompactMetadata(storedProfile)
        : `MC-${getShortId(deviceId)}`;

      // Start Scanner
      BleScanner.start();

      // Start Advertiser with instant compact profile payload
      await BleAdvertiser.start(deviceId, broadcastName);

      LogService.info(TAG, 'All MeshConnect BLE services successfully started');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      LogService.error(TAG, `Failed to start BLE services: ${msg}`);
      setErrorMessage(`Failed to start BLE services: ${msg}`);
    }
  }, []);

  const requestPermissionsAndStart = useCallback(async (): Promise<void> => {
    const granted = await checkAndRequestPermissions();
    if (granted) {
      const state = await getBleManager().state();
      if (state === State.PoweredOn) {
        await startServices();
      } else {
        await enableBluetoothPrompt();
      }
    }
  }, [checkAndRequestPermissions, enableBluetoothPrompt, startServices]);

  // Monitor Bluetooth Adapter state
  useEffect(() => {
    const manager = getBleManager();

    const subscription = manager.onStateChange((state: State) => {
      LogService.info(TAG, `Bluetooth state changed: ${state}`);

      switch (state) {
        case State.PoweredOn:
          setBluetoothStatus('poweredOn');
          clearError();
          // Auto-start if permissions granted
          checkAndRequestPermissions().then((granted: boolean) => {
            if (granted) {
              startServices();
            }
          });
          break;
        case State.PoweredOff:
          setBluetoothStatus('poweredOff');
          setErrorMessage('Bluetooth is disabled. Please turn on Bluetooth.');
          BleScanner.stop();
          BleAdvertiser.stop();
          break;
        case State.Unauthorized:
          setBluetoothStatus('unauthorized');
          setErrorMessage('Bluetooth permission is unauthorized.');
          break;
        case State.Unsupported:
          setBluetoothStatus('unsupported');
          setErrorMessage('Bluetooth Low Energy is not supported on this device.');
          break;
        default:
          setBluetoothStatus('unknown');
          break;
      }
    }, true);

    return () => {
      subscription.remove();
    };
  }, [checkAndRequestPermissions, clearError, startServices]);

  return {
    bluetoothStatus,
    advertisingStatus,
    scanningStatus,
    permissions,
    requestPermissionsAndStart,
    enableBluetoothPrompt,
    errorMessage,
    clearError,
  };
}
