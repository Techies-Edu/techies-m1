/**
 * BLE domain types used across services, hooks, and components.
 */

/** Status of a BLE connection to a remote device */
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'failed';

/** Current state of the Bluetooth adapter */
export type BluetoothStatus =
  'unknown' | 'resetting' | 'unsupported' | 'unauthorized' | 'poweredOff' | 'poweredOn';

/** Current state of BLE advertising (peripheral role) */
export type AdvertisingStatus = 'idle' | 'starting' | 'advertising' | 'failed';

/** Current state of BLE scanning (central role) */
export type ScanningStatus = 'idle' | 'scanning' | 'failed';

/** A discovered nearby BLE device */
export interface NearbyDevice {
  /** Hardware MAC address (Android) or system-assigned ID */
  id: string;
  /** Human-readable device name derived from advertisement or MAC */
  name: string;
  /** Signal strength in dBm (e.g. -60). Higher = stronger. */
  rssi: number;
  /** Estimated distance in metres, or -1 if unknown */
  distance: number;
  /** Unix timestamp (ms) of the most recent advertisement packet */
  lastSeen: number;
  /** Current BLE connection state to this device */
  connectionStatus: ConnectionStatus;
}

/** Runtime permission state returned by useBleSetup */
export interface PermissionState {
  granted: boolean;
  denied: boolean;
  blocked: boolean;
  checking: boolean;
}
