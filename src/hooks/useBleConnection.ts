/**
 * useBleConnection — Hook providing functions and state for connecting to and disconnecting from a BLE device.
 */
import { useState, useCallback, useEffect } from 'react';
import { BleConnector, LogService } from '../services';

const TAG = 'useBleConnection';

export interface ConnectionResult {
  deviceId: string;
  success: boolean;
  message: string;
  timestamp: number;
}

export interface UseBleConnectionReturn {
  connectingDeviceId: string | null;
  connectionResult: ConnectionResult | null;
  connectToDevice: (deviceId: string) => Promise<void>;
  disconnectDevice: (deviceId: string) => Promise<void>;
  clearConnectionResult: () => void;
}

export function useBleConnection(): UseBleConnectionReturn {
  const [connectingDeviceId, setConnectingDeviceId] = useState<string | null>(null);
  const [connectionResult, setConnectionResult] = useState<ConnectionResult | null>(null);

  useEffect(() => {
    BleConnector.setResultCallback((deviceId: string, success: boolean, message: string) => {
      setConnectingDeviceId(null);
      setConnectionResult({
        deviceId,
        success,
        message,
        timestamp: Date.now(),
      });
    });
  }, []);

  const clearConnectionResult = useCallback(() => {
    setConnectionResult(null);
  }, []);

  const connectToDevice = useCallback(async (deviceId: string): Promise<void> => {
    setConnectingDeviceId(deviceId);
    setConnectionResult(null);
    try {
      await BleConnector.connect(deviceId);
    } catch (err) {
      LogService.error(TAG, `Connection error catch block for ${deviceId}`, err);
    } finally {
      setConnectingDeviceId(null);
    }
  }, []);

  const disconnectDevice = useCallback(async (deviceId: string): Promise<void> => {
    try {
      await BleConnector.disconnect(deviceId);
    } catch (err) {
      LogService.error(TAG, `Disconnect error for ${deviceId}`, err);
    }
  }, []);

  return {
    connectingDeviceId,
    connectionResult,
    connectToDevice,
    disconnectDevice,
    clearConnectionResult,
  };
}
